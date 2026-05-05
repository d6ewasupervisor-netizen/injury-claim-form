import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';

const PORT = process.env.PORT || 3000;
const FROM = 'Retail Odyssey Claims <claims@retail-odyssey.com>';

/** Operations inbox(es) for claim notifications; override with CLAIMS_OPS_TO (comma-separated). */
function parseOpsRecipients() {
  const raw = process.env.CLAIMS_OPS_TO?.trim();
  const fallback = 'tyson.gauthier@retailodyssey.com';
  const src = raw || fallback;
  return src.split(',').map((s) => s.trim()).filter(Boolean);
}

const REPORT_TYPES = new Set(['self', 'witness', 'investigation']);
const YES_NO = new Set(['Yes', 'No']);
const RETAILERS = new Set(['Kroger', 'Fred Meyer', 'Walmart', 'QFC']);
const PROJECTS = new Set(['Kompass ISE', 'Assembly', 'Remodel', 'Display Compliance', 'Central Pet']);
const MECHANISMS = new Set([
  'Specific incident (single event)',
  'Gradual onset (developed over time / repetitive)',
  'Unsure',
]);
const BODY_PARTS = new Set([
  'Head',
  'Eye',
  'Neck',
  'Shoulder',
  'Upper back',
  'Lower back',
  'Chest',
  'Abdomen',
  'Arm',
  'Elbow',
  'Wrist',
  'Hand',
  'Finger',
  'Hip',
  'Leg',
  'Knee',
  'Ankle',
  'Foot',
  'Toe',
  'Other',
]);
const SIDES = new Set(['Left', 'Right', 'Both', 'Not applicable']);
const WITNESS_RELATIONSHIPS = new Set([
  'Direct witness',
  'Told secondhand',
  'Asked to provide a statement',
  'Other',
]);
const OSHA_INDICATORS = new Set([
  'Required medical treatment beyond first aid',
  'Resulted in lost time',
  'Resulted in restricted duty or job transfer',
  'None of the above',
  'Unknown',
]);
const OSHA_EXCLUSIVE = new Set(['None of the above', 'Unknown']);

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseManagerEmails() {
  const raw = process.env.MANAGER_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  );
}

function isAuthorizedManager(req) {
  const allowlist = parseManagerEmails();
  if (allowlist.size === 0) {
    return { ok: false, reason: 'Manager allowlist is not configured on the server.' };
  }
  const headerEmail = req.get('Cf-Access-Authenticated-User-Email');
  if (!headerEmail) {
    return { ok: false, reason: 'Missing Cloudflare Access identity header.' };
  }
  const normalized = headerEmail.trim().toLowerCase();
  if (!allowlist.has(normalized)) {
    return { ok: false, reason: 'Email not authorized for investigation submissions.' };
  }
  return { ok: true, email: normalized };
}

function parseAllowedHosts() {
  const raw = process.env.ALLOWED_HOSTS || '';
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return null;
  return new Set(list);
}

function isAllowedHost(req) {
  const allowed = parseAllowedHosts();
  if (allowed === null) return true;
  const host = (req.headers.host || '').toLowerCase().split(':')[0];
  return allowed.has(host);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isEmail(v) {
  return isNonEmptyString(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null || v === '') return [];
  return [v];
}

function uniqueIssues(issues) {
  return [...new Set(issues)];
}

function addRequired(issues, payload, fields) {
  for (const field of fields) {
    if (!isNonEmptyString(payload[field])) issues.push(field);
  }
}

function validateSet(issues, field, value, allowed) {
  if (isNonEmptyString(value) && !allowed.has(value.trim())) {
    issues.push(field);
  }
}

function validateYesNo(issues, payload, field) {
  if (!isNonEmptyString(payload[field]) || !YES_NO.has(payload[field])) {
    issues.push(field);
  }
}

function validateEmailField(issues, payload, field) {
  if (!isEmail(payload[field])) {
    issues.push(field);
  }
}

function validateWitnessArray(issues, payload, field, { required = false } = {}) {
  const witnesses = payload[field];
  if (witnesses === undefined || witnesses === null) {
    if (required) issues.push(field);
    return;
  }

  if (!Array.isArray(witnesses)) {
    issues.push(field);
    return;
  }

  if (required && witnesses.length === 0) {
    issues.push(field);
  }

  witnesses.forEach((witness, index) => {
    if (!witness || typeof witness !== 'object') {
      issues.push(`${field}[${index}]`);
      return;
    }
    if (!isNonEmptyString(witness.name)) {
      issues.push(`${field}[${index}].name`);
    }
  });
}

function validateBodyParts(issues, payload, { required }) {
  const bodyParts = asArray(payload.bodyPartsAffected);
  if (required && bodyParts.length === 0) {
    issues.push('bodyPartsAffected');
  }
  for (const bodyPart of bodyParts) {
    if (!BODY_PARTS.has(bodyPart)) {
      issues.push('bodyPartsAffected');
      break;
    }
  }
}

function validateSelfClaim(payload) {
  const issues = [];

  addRequired(issues, payload, [
    'reporterName',
    'reporterEmail',
    'reporterPhone',
    'retailer',
    'storeNumber',
    'storeAddress',
    'project',
    'mechanism',
    'dateOfInjury',
    'timeOfInjury',
    'sideAffected',
    'description',
  ]);
  validateEmailField(issues, payload, 'reporterEmail');
  validateSet(issues, 'retailer', payload.retailer, RETAILERS);
  validateSet(issues, 'project', payload.project, PROJECTS);
  validateSet(issues, 'mechanism', payload.mechanism, MECHANISMS);
  validateSet(issues, 'sideAffected', payload.sideAffected, SIDES);
  validateBodyParts(issues, payload, { required: true });

  if (payload.witnesses !== undefined) {
    validateWitnessArray(issues, payload, 'witnesses');
  }

  validateYesNo(issues, payload, 'reportedToSupervisor');
  if (payload.reportedToSupervisor === 'Yes') {
    addRequired(issues, payload, [
      'supervisorName',
      'supervisorDateReported',
      'supervisorTimeReported',
    ]);
  }

  validateYesNo(issues, payload, 'preExistingAny');
  if (payload.preExistingAny === 'Yes') {
    addRequired(issues, payload, ['preExistingDetails']);
  }

  return uniqueIssues(issues);
}

function validateWitnessReport(payload) {
  const issues = [];

  addRequired(issues, payload, [
    'reporterName',
    'reporterEmail',
    'reporterPhone',
    'relationshipToInjured',
    'injuredAssociateName',
    'retailer',
    'storeNumber',
    'storeAddress',
    'project',
    'mechanism',
    'dateOfInjury',
    'description',
  ]);
  validateEmailField(issues, payload, 'reporterEmail');
  validateSet(issues, 'relationshipToInjured', payload.relationshipToInjured, WITNESS_RELATIONSHIPS);
  validateSet(issues, 'retailer', payload.retailer, RETAILERS);
  validateSet(issues, 'project', payload.project, PROJECTS);
  validateSet(issues, 'mechanism', payload.mechanism, MECHANISMS);
  validateSet(issues, 'sideAffected', payload.sideAffected, SIDES);
  validateBodyParts(issues, payload, { required: false });

  if (payload.relationshipToInjured === 'Asked to provide a statement') {
    addRequired(issues, payload, ['statementAdditionalInfo']);
  }

  if (isNonEmptyString(payload.mentionedReporting) && !YES_NO.has(payload.mentionedReporting)) {
    issues.push('mentionedReporting');
  }
  if (isNonEmptyString(payload.preExistingAware) && !YES_NO.has(payload.preExistingAware)) {
    issues.push('preExistingAware');
  }
  if (payload.preExistingAware === 'Yes') {
    addRequired(issues, payload, ['preExistingDetails']);
  }

  return uniqueIssues(issues);
}

function validateInvestigationReport(payload) {
  const issues = [];

  addRequired(issues, payload, [
    'reporterName',
    'reporterEmail',
    'injuredAssociateName',
    'retailer',
    'storeNumber',
    'storeAddress',
    'project',
    'mechanism',
    'dateOfInjury',
    'firstLearnedDate',
    'firstLearnedTime',
    'witnessesPresent',
    'projectAtInjury',
    'confirmRetailer',
    'confirmStoreNumber',
    'confirmStoreAddress',
  ]);
  validateEmailField(issues, payload, 'reporterEmail');
  validateSet(issues, 'retailer', payload.retailer, RETAILERS);
  validateSet(issues, 'confirmRetailer', payload.confirmRetailer, RETAILERS);
  validateSet(issues, 'project', payload.project, PROJECTS);
  validateSet(issues, 'projectAtInjury', payload.projectAtInjury, PROJECTS);
  validateSet(issues, 'mechanism', payload.mechanism, MECHANISMS);
  validateYesNo(issues, payload, 'witnessesPresent');

  if (payload.witnessesPresent === 'Yes') {
    validateWitnessArray(issues, payload, 'witnesses', { required: true });
  }

  const yesDescribePairs = [
    ['inconsistenciesAny', 'inconsistenciesDescribe'],
    ['employmentDisciplinaryAny', 'employmentDisciplinaryDescribe'],
    ['preExistingRelevantAny', 'preExistingRelevantDescribe'],
    ['contributingFactorsAny', 'contributingFactorsDescribe'],
    ['sportsActivitiesAny', 'sportsActivitiesDescribe'],
    ['heavyLiftingAny', 'heavyLiftingDescribe'],
  ];

  for (const [radioField, describeField] of yesDescribePairs) {
    validateYesNo(issues, payload, radioField);
    if (payload[radioField] === 'Yes') {
      addRequired(issues, payload, [describeField]);
    }
  }

  const osha = asArray(payload.oshaIndicators);
  if (osha.length === 0) {
    issues.push('oshaIndicators');
  }
  for (const indicator of osha) {
    if (!OSHA_INDICATORS.has(indicator)) {
      issues.push('oshaIndicators');
      break;
    }
  }
  if (osha.some((indicator) => OSHA_EXCLUSIVE.has(indicator)) && osha.length > 1) {
    issues.push('oshaIndicators');
  }

  return uniqueIssues(issues);
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function displayValue(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map(formatListItem).join('\n');
  }
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

function formatListItem(value) {
  if (!value || typeof value !== 'object') return String(value);
  const name = value.name || '—';
  const contact = value.phoneOrEmail || '—';
  return `${name} (${contact})`;
}

function row(label, value) {
  const v = displayValue(value);
  return `<tr><td style="padding:8px 12px;border:1px solid #cbd5e1;vertical-align:top;font-weight:600;width:42%;background:#f8fafc;">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #cbd5e1;vertical-align:top;">${escapeHtml(v).replace(/\n/g, '<br/>')}</td></tr>`;
}

function sectionHtml(title, rows) {
  return `<h2 style="font-size:18px;margin:24px 0 12px;">${escapeHtml(title)}</h2>
<table style="border-collapse:collapse;width:100%;max-width:760px;font-family:system-ui,Segoe UI,sans-serif;font-size:14px;color:#0f172a;"><tbody>
${rows.map(([label, value]) => row(label, value)).join('\n')}
</tbody></table>`;
}

function buildHtmlEmail(title, sections) {
  return `<div style="font-family:system-ui,Segoe UI,sans-serif;color:#0f172a;line-height:1.5;">
<h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(title)}</h1>
${sections.map((section) => sectionHtml(section.title, section.rows)).join('\n')}
</div>`;
}

function buildTextEmail(title, sections) {
  const lines = [title];
  for (const section of sections) {
    lines.push('', section.title.toUpperCase());
    for (const [label, value] of section.rows) {
      lines.push(`${label}: ${displayValue(value)}`);
    }
  }
  return lines.join('\n');
}

function renderEmail(title, sections) {
  return {
    html: buildHtmlEmail(title, sections),
    text: buildTextEmail(title, sections),
  };
}

function selfSections(payload) {
  return [
    {
      title: 'Your Information',
      rows: [
        ['Reporter name', payload.reporterName],
        ['Reporter email', payload.reporterEmail],
        ['Reporter phone', payload.reporterPhone],
      ],
    },
    {
      title: 'Incident Details',
      rows: [
        ['Retailer', payload.retailer],
        ['Store / warehouse number', payload.storeNumber],
        ['Store address', payload.storeAddress],
        ['Project', payload.project],
        ['Mechanism', payload.mechanism],
        ['Date of injury', payload.dateOfInjury],
        ['Time of injury', payload.timeOfInjury],
        ['Body part(s) affected', asArray(payload.bodyPartsAffected)],
        ['Side affected', payload.sideAffected],
        ['Description of what happened', payload.description],
      ],
    },
    {
      title: 'Witnesses',
      rows: [['Witnesses', asArray(payload.witnesses)]],
    },
    {
      title: 'Reporting & History',
      rows: [
        ['Did you report it to a supervisor?', payload.reportedToSupervisor],
        ['Supervisor name', payload.reportedToSupervisor === 'Yes' ? payload.supervisorName : '—'],
        [
          'Date reported to supervisor',
          payload.reportedToSupervisor === 'Yes' ? payload.supervisorDateReported : '—',
        ],
        [
          'Time reported to supervisor',
          payload.reportedToSupervisor === 'Yes' ? payload.supervisorTimeReported : '—',
        ],
        ['Any pre-existing conditions or prior injuries to the affected area?', payload.preExistingAny],
        ['Please describe', payload.preExistingAny === 'Yes' ? payload.preExistingDetails : '—'],
      ],
    },
  ];
}

function witnessSections(payload) {
  return [
    {
      title: 'Your Information',
      rows: [
        ['Reporter name', payload.reporterName],
        ['Reporter email', payload.reporterEmail],
        ['Reporter phone', payload.reporterPhone],
        ['Relationship to injured person', payload.relationshipToInjured],
      ],
    },
    {
      title: 'About the Injured Person',
      rows: [
        ["Injured associate's name", payload.injuredAssociateName],
        ['Retailer', payload.retailer],
        ['Store / warehouse number', payload.storeNumber],
        ['Store address', payload.storeAddress],
        ['Project', payload.project],
      ],
    },
    {
      title: 'Incident Details',
      rows: [
        ['Mechanism', payload.mechanism],
        ['Date of injury', payload.dateOfInjury],
        ['Time of injury (if known)', payload.timeOfInjury],
        ['Body part(s) affected (if known)', asArray(payload.bodyPartsAffected)],
        ['Side affected (if known)', payload.sideAffected],
      ],
    },
    {
      title: 'What You Witnessed or Were Told',
      rows: [
        ['Description of what was witnessed or reported', payload.description],
        ['Statement / additional information', payload.statementAdditionalInfo],
      ],
    },
    {
      title: 'Reporting & History',
      rows: [
        ['Did the injured person mention reporting it to anyone?', payload.mentionedReporting],
        ['Name of person they mentioned reporting to', payload.mentionedReportName],
        ['Date of that report', payload.mentionedReportDate],
        ['Time of that report', payload.mentionedReportTime],
        [
          'Aware of pre-existing conditions relevant to affected body part(s)?',
          payload.preExistingAware,
        ],
        ['Please describe', payload.preExistingAware === 'Yes' ? payload.preExistingDetails : '—'],
      ],
    },
  ];
}

function investigationSections(payload) {
  return [
    {
      title: 'Manager Information',
      rows: [
        ['Reporter name (manager)', payload.reporterName],
        ['Reporter email', payload.reporterEmail],
        ['Reporter phone', payload.reporterPhone],
      ],
    },
    {
      title: 'About the Injured Associate',
      rows: [["Injured associate's name", payload.injuredAssociateName]],
    },
    {
      title: 'Incident Anchor',
      rows: [
        ['Retailer', payload.retailer],
        ['Store / warehouse number', payload.storeNumber],
        ['Store address', payload.storeAddress],
        ['Project', payload.project],
        ['Mechanism', payload.mechanism],
        ['Date of injury', payload.dateOfInjury],
      ],
    },
    {
      title: 'Investigation Questions',
      rows: [
        ['Q1. Date first learned about the incident', payload.firstLearnedDate],
        ['Q1. Time first learned about the incident', payload.firstLearnedTime],
        ['Q2. Were there any witnesses?', payload.witnessesPresent],
        ['Witness entries', payload.witnessesPresent === 'Yes' ? asArray(payload.witnesses) : '—'],
        ['Q3. Project associate was working on when injured', payload.projectAtInjury],
        ['Q4. Confirm retailer', payload.confirmRetailer],
        ['Q4. Confirm store / warehouse number', payload.confirmStoreNumber],
        ['Q4. Confirm store address', payload.confirmStoreAddress],
        [
          "Q5. Inconsistencies between worker's account and what you observed or were told?",
          payload.inconsistenciesAny,
        ],
        ['Q5. Describe', payload.inconsistenciesAny === 'Yes' ? payload.inconsistenciesDescribe : '—'],
        ['Q6. Current employment or disciplinary issues?', payload.employmentDisciplinaryAny],
        [
          'Q6. Describe',
          payload.employmentDisciplinaryAny === 'Yes' ? payload.employmentDisciplinaryDescribe : '—',
        ],
        ['Q7. Pre-existing injuries or conditions that might be relevant?', payload.preExistingRelevantAny],
        [
          'Q7. Describe',
          payload.preExistingRelevantAny === 'Yes' ? payload.preExistingRelevantDescribe : '—',
        ],
        ['Q8. Other contributing factors?', payload.contributingFactorsAny],
        [
          'Q8. Describe',
          payload.contributingFactorsAny === 'Yes' ? payload.contributingFactorsDescribe : '—',
        ],
        ['Q9. Sports, activities, or hobbies that could be relevant?', payload.sportsActivitiesAny],
        ['Q9. Describe', payload.sportsActivitiesAny === 'Yes' ? payload.sportsActivitiesDescribe : '—'],
        ['Q10. Heavy lifting or moving activities outside of work?', payload.heavyLiftingAny],
        ['Q10. Describe', payload.heavyLiftingAny === 'Yes' ? payload.heavyLiftingDescribe : '—'],
      ],
    },
    {
      title: 'OSHA Recordability',
      rows: [['OSHA recordability indicators', asArray(payload.oshaIndicators)]],
    },
    {
      title: 'Additional Follow-ups',
      rows: [['Additional follow-ups assigned', payload.additionalFollowUps]],
    },
  ];
}

function buildSelfEmail(payload) {
  return renderEmail('Injury Self-Report', selfSections(payload));
}

function buildWitnessEmail(payload) {
  return renderEmail('Witness/Statement Report', witnessSections(payload));
}

function buildInvestigationEmail(payload) {
  return renderEmail('Manager Investigation', investigationSections(payload));
}

function subjectLine(reportType, payload) {
  if (reportType === 'self') {
    return `Injury Self-Report — ${payload.reporterName} at ${payload.retailer} #${payload.storeNumber}`;
  }
  if (reportType === 'witness') {
    return `Witness/Statement Report — ${payload.injuredAssociateName} at ${payload.retailer} #${payload.storeNumber} (reported by ${payload.reporterName})`;
  }
  return `Manager Investigation — ${payload.injuredAssociateName} at ${payload.retailer} #${payload.storeNumber} (manager: ${payload.reporterName})`;
}

const validators = {
  self: validateSelfClaim,
  witness: validateWitnessReport,
  investigation: validateInvestigationReport,
};

const emailTemplates = {
  self: buildSelfEmail,
  witness: buildWitnessEmail,
  investigation: buildInvestigationEmail,
};

const app = express();

const allowedList = parseAllowedOrigins();
const corsOptions =
  allowedList.length > 0
    ? {
        origin(origin, cb) {
          if (!origin) return cb(null, true);
          if (allowedList.includes(origin)) return cb(null, true);
          return cb(null, false);
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
      }
    : {
        origin: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
      };

app.use(cors(corsOptions));

app.use((req, res, next) => {
  if (!isAllowedHost(req)) {
    console.warn(`[server] rejected request with disallowed host: ${req.headers.host || '(none)'}`);
    return res.status(404).send('Not Found');
  }
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/claims', limiter);

app.use(express.json({ limit: '512kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/claims', async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  let reportType = payload.reportType;

  if (!isNonEmptyString(reportType)) {
    reportType = 'self';
    console.warn('[claims] Missing reportType; treating payload as self for backwards compatibility.');
  }

  if (!REPORT_TYPES.has(reportType)) {
    return res.status(400).json({ error: 'Invalid reportType' });
  }

  if (reportType === 'investigation') {
    const auth = isAuthorizedManager(req);
    if (!auth.ok) {
      console.warn(`[claims] investigation submission rejected: ${auth.reason}`);
      return res.status(403).json({ error: 'Not authorized to submit an investigation report.' });
    }
    console.log(`[claims] investigation submission authorized for ${auth.email}`);
  }

  console.log(
    `[claims] submission reportType=${reportType} retailer=${payload.retailer || '—'} storeNumber=${payload.storeNumber || '—'}`
  );

  const missing = validators[reportType](payload);
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Validation failed.', missing });
  }

  const { html, text } = emailTemplates[reportType](payload);
  const subj = subjectLine(reportType, payload);
  const reporterEmail = payload.reporterEmail.trim();
  const ccRecipients = isEmail(reporterEmail) ? [reporterEmail] : [];
  const opsTo = parseOpsRecipients();
  if (opsTo.length === 0) {
    console.error('[claims] CLAIMS_OPS_TO resolves to no recipient addresses.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: opsTo.length === 1 ? opsTo[0] : opsTo,
      replyTo: reporterEmail,
      // CC the submitter so they have a record of what they submitted.
      ...(ccRecipients.length > 0 ? { cc: ccRecipients } : {}),
      subject: subj,
      html,
      text,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return res.status(500).json({ error: 'Failed to send notification email.' });
    }

    console.log(
      `[claims] email sent id=${result.data?.id ?? '(none)'} to=${opsTo.join(',')} reportType=${reportType}`
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Submission failed. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
