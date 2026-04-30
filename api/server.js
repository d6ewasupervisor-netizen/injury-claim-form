import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';

const PORT = process.env.PORT || 3000;
const OPS_TO = 'tyson.gauthier@retailodyssey.com';
const FROM = 'Retail Odyssey Claims <claims@retail-odyssey.com>';

const ynUnknown = new Set(['Yes', 'No', 'Unknown']);
const witnessSet = new Set(['Yes', 'No', 'Unknown']);

const REPORTER_ROLES = new Set([
  'Field Operations Supervisor',
  'District Manager',
  'Lead',
  'Other',
]);
const HOW_LEARNED = new Set([
  'Phone call',
  'Text message',
  'In person',
  'Email',
  'Other',
]);
const PROJECT_TYPES = new Set([
  'Reset',
  'Remodel',
  'Audit',
  'Vitamins',
  'Cosmetics',
  'New store set',
  'Other',
]);
const RETAILERS = new Set([
  'Fred Meyer',
  'Kroger',
  'QFC',
  'Albertsons',
  'Safeway',
  'Other',
]);

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label, value) {
  const v = value === undefined || value === null || value === '' ? '—' : String(value);
  return `<tr><td style="padding:8px 12px;border:1px solid #cbd5e1;vertical-align:top;font-weight:600;width:42%;background:#f8fafc;">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #cbd5e1;vertical-align:top;">${escapeHtml(v).replace(/\n/g, '<br/>')}</td></tr>`;
}

function buildOpsHtml(body) {
  const {
    reporterName,
    reporterRole,
    reporterEmail,
    reporterPhone,
    associateName,
    incidentDate,
    firstLearnedAt,
    howLearned,
    witnessesPresent,
    witnessDetails,
    projectType,
    projectOther,
    retailer,
    storeNumber,
    storeAddress,
    validityQuestioned,
    validityExplain,
    employmentIssues,
    employmentExplain,
    preExisting,
    preExistingExplain,
    otherFactors,
    otherFactorsExplain,
    sportsHobbies,
    sportsExplain,
    heavyLiftingOutsideWork,
    heavyLiftingExplain,
  } = body;

  const validityRows = [
    ['Any reason to question the validity of the injury claim?', validityQuestioned, validityExplain],
    ['Any current employment or disciplinary issues with the associate?', employmentIssues, employmentExplain],
    ['Aware of any pre-existing injuries or conditions that might be relevant?', preExisting, preExistingExplain],
    ['Aware of any other factors (car accidents, falls, illnesses) that may have contributed?', otherFactors, otherFactorsExplain],
    ['Associate involved in any sports, activities, or hobbies that could be relevant?', sportsHobbies, sportsExplain],
    ['Aware of heavy lifting or moving activities outside of work?', heavyLiftingOutsideWork, heavyLiftingExplain],
  ];

  let validityTable = `<table style="border-collapse:collapse;width:100%;max-width:720px;font-family:system-ui,Segoe UI,sans-serif;font-size:14px;color:#0f172a;"><tbody>`;
  for (const [q, ans, expl] of validityRows) {
    const explainBlock =
      ans === 'Yes' && isNonEmptyString(expl)
        ? `<div style="margin-top:6px;"><strong>Please explain:</strong><br/>${escapeHtml(expl).replace(/\n/g, '<br/>')}</div>`
        : '';
    validityTable += `<tr><td colspan="2" style="padding:10px 12px;border:1px solid #cbd5e1;background:#f1f5f9;"><div style="font-weight:600;margin-bottom:4px;">${escapeHtml(q)}</div><div><strong>Answer:</strong> ${escapeHtml(ans)}</div>${explainBlock}</td></tr>`;
  }
  validityTable += `</tbody></table>`;

  const reporterTable = `<table style="border-collapse:collapse;width:100%;max-width:720px;font-family:system-ui,Segoe UI,sans-serif;font-size:14px;color:#0f172a;"><tbody>
${row('Reporter name', reporterName)}
${row('Reporter role/title', reporterRole)}
${row('Reporter email', reporterEmail)}
${row('Reporter phone', reporterPhone || '—')}
</tbody></table>`;

  const incidentTable = `<table style="border-collapse:collapse;width:100%;max-width:720px;font-family:system-ui,Segoe UI,sans-serif;font-size:14px;color:#0f172a;"><tbody>
${row("Associate's full name", associateName)}
${row('Date of incident', incidentDate)}
${row('Date/time first learned of incident', firstLearnedAt)}
${row('How you learned of the incident', howLearned)}
${row('Witnesses present?', witnessesPresent)}
${row('Witness names and contact info', witnessesPresent === 'Yes' ? witnessDetails : 'N/A')}
${row('Project the associate was working on', projectType)}
${row('Project (other detail)', projectType === 'Other' ? projectOther : 'N/A')}
${row('Retailer', retailer)}
${row('Store/warehouse number', storeNumber)}
${row('Store address', storeAddress)}
</tbody></table>`;

  return `<div style="font-family:system-ui,Segoe UI,sans-serif;color:#0f172a;line-height:1.5;">
<h2 style="font-size:18px;margin:0 0 12px;">Reporter</h2>
${reporterTable}
<h2 style="font-size:18px;margin:24px 0 12px;">Incident</h2>
${incidentTable}
<h2 style="font-size:18px;margin:24px 0 12px;">Validity &amp; context</h2>
${validityTable}
</div>`;
}

function buildOpsText(body) {
  const lines = [];
  const add = (label, val) => {
    const v = val === undefined || val === null || val === '' ? '—' : String(val);
    lines.push(`${label}: ${v}`);
  };

  lines.push('REPORTER');
  add('Reporter name', body.reporterName);
  add('Reporter role/title', body.reporterRole);
  add('Reporter email', body.reporterEmail);
  add('Reporter phone', body.reporterPhone);

  lines.push('');
  lines.push('INCIDENT');
  add("Associate's full name", body.associateName);
  add('Date of incident', body.incidentDate);
  add('Date/time first learned of incident', body.firstLearnedAt);
  add('How you learned of the incident', body.howLearned);
  add('Witnesses present?', body.witnessesPresent);
  add(
    'Witness names and contact info',
    body.witnessesPresent === 'Yes' ? body.witnessDetails : 'N/A'
  );
  add('Project', body.projectType);
  add('Project (other)', body.projectType === 'Other' ? body.projectOther : 'N/A');
  add('Retailer', body.retailer);
  add('Store/warehouse number', body.storeNumber);
  add('Store address', body.storeAddress);

  const validityRows = [
    ['Any reason to question the validity of the injury claim?', body.validityQuestioned, body.validityExplain],
    ['Any current employment or disciplinary issues with the associate?', body.employmentIssues, body.employmentExplain],
    ['Aware of any pre-existing injuries or conditions that might be relevant?', body.preExisting, body.preExistingExplain],
    ['Aware of any other factors (car accidents, falls, illnesses) that may have contributed?', body.otherFactors, body.otherFactorsExplain],
    ['Associate involved in any sports, activities, or hobbies that could be relevant?', body.sportsHobbies, body.sportsExplain],
    ['Aware of heavy lifting or moving activities outside of work?', body.heavyLiftingOutsideWork, body.heavyLiftingExplain],
  ];

  lines.push('');
  lines.push('VALIDITY & CONTEXT');
  for (const [q, ans, expl] of validityRows) {
    lines.push(q);
    lines.push(`  Answer: ${ans}`);
    if (ans === 'Yes' && isNonEmptyString(expl)) {
      lines.push(`  Please explain: ${expl}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function collectMissing(body) {
  const missing = [];

  const req = [
    ['reporterName', body.reporterName],
    ['reporterRole', body.reporterRole],
    ['reporterEmail', body.reporterEmail],
    ['associateName', body.associateName],
    ['incidentDate', body.incidentDate],
    ['firstLearnedAt', body.firstLearnedAt],
    ['howLearned', body.howLearned],
    ['witnessesPresent', body.witnessesPresent],
    ['projectType', body.projectType],
    ['retailer', body.retailer],
    ['storeNumber', body.storeNumber],
    ['storeAddress', body.storeAddress],
    ['validityQuestioned', body.validityQuestioned],
    ['employmentIssues', body.employmentIssues],
    ['preExisting', body.preExisting],
    ['otherFactors', body.otherFactors],
    ['sportsHobbies', body.sportsHobbies],
    ['heavyLiftingOutsideWork', body.heavyLiftingOutsideWork],
  ];

  for (const [key, val] of req) {
    if (!isNonEmptyString(val)) missing.push(key);
  }

  if (!witnessSet.has(body.witnessesPresent)) {
    if (!missing.includes('witnessesPresent')) missing.push('witnessesPresent');
  }

  if (isNonEmptyString(body.reporterRole) && !REPORTER_ROLES.has(body.reporterRole.trim())) {
    missing.push('reporterRole');
  }
  if (isNonEmptyString(body.howLearned) && !HOW_LEARNED.has(body.howLearned.trim())) {
    missing.push('howLearned');
  }
  if (isNonEmptyString(body.projectType) && !PROJECT_TYPES.has(body.projectType.trim())) {
    missing.push('projectType');
  }
  if (isNonEmptyString(body.retailer) && !RETAILERS.has(body.retailer.trim())) {
    missing.push('retailer');
  }

  for (const k of [
    'validityQuestioned',
    'employmentIssues',
    'preExisting',
    'otherFactors',
    'sportsHobbies',
    'heavyLiftingOutsideWork',
  ]) {
    if (body[k] != null && body[k] !== '' && !ynUnknown.has(body[k])) {
      missing.push(k);
    }
  }

  if (body.witnessesPresent === 'Yes' && !isNonEmptyString(body.witnessDetails)) {
    missing.push('witnessDetails');
  }

  if (body.projectType === 'Other' && !isNonEmptyString(body.projectOther)) {
    missing.push('projectOther');
  }

  const pairs = [
    ['validityQuestioned', 'validityExplain'],
    ['employmentIssues', 'employmentExplain'],
    ['preExisting', 'preExistingExplain'],
    ['otherFactors', 'otherFactorsExplain'],
    ['sportsHobbies', 'sportsExplain'],
    ['heavyLiftingOutsideWork', 'heavyLiftingExplain'],
  ];
  for (const [radioKey, explainKey] of pairs) {
    if (body[radioKey] === 'Yes' && !isNonEmptyString(body[explainKey])) {
      missing.push(explainKey);
    }
  }

  return [...new Set(missing)];
}

function subjectLine(body) {
  const { associateName, retailer, storeNumber, incidentDate } = body;
  return `Injury Claim — ${associateName} — ${retailer} #${storeNumber} — ${incidentDate}`;
}

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
        credentials: false,
      }
    : {
        origin: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      };

app.use(cors(corsOptions));

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

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const missing = collectMissing(body);

  if (missing.length > 0) {
    return res.status(400).json({ error: 'Validation failed.', missing });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = buildOpsHtml(body);
  const text = buildOpsText(body);
  const subj = subjectLine(body);
  const reporterEmail = body.reporterEmail.trim();

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: OPS_TO,
      replyTo: reporterEmail,
      subject: subj,
      html,
      text,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return res.status(500).json({ error: 'Failed to send notification email.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Submission failed. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
