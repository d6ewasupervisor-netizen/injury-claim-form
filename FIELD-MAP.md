# Injury Reporting — Field Map (As Built)

This document describes the current three-form injury reporting tool as implemented in `the-dump-bin/claims/` and enforced by the API in `injury-claim-form/api/server.js`.

Source of truth used for this map:

- `the-dump-bin/claims/self/index.html`
- `the-dump-bin/claims/witness/index.html`
- `the-dump-bin/claims/investigation/index.html`
- `the-dump-bin/claims/app.js`
- `injury-claim-form/api/server.js`

---

## Shared dropdown options

Apply these options wherever the corresponding field appears across the forms.

| Option set | Values |
|------------|--------|
| **Retailer** | Kroger, Fred Meyer, Walmart, QFC |
| **Project** | Kompass ISE, Assembly, Remodel, Display Compliance, Central Pet |
| **Body part affected** | Head, Eye, Neck, Shoulder, Upper back, Lower back, Chest, Abdomen, Arm, Elbow, Wrist, Hand, Finger, Hip, Leg, Knee, Ankle, Foot, Toe, Other |
| **Side affected** | Left, Right, Both, Not applicable |
| **Mechanism** | Specific incident (single event), Gradual onset (developed over time / repetitive), Unsure |

---

## Confidentiality notice

Displayed at the top of the Witness / Statement and Manager Investigation forms:

> Information submitted may be shared with the injured worker, their representative, claims administrators, and the Washington State Department of Labor & Industries. Please be accurate and factual.

---

## Type 1 — Self-Report Injury

Form metadata:

- `<form id="claim-form" data-form-kind="self">`
- Hidden input: `name="reportType"` with value `self`

| Field label | Field type | name attribute | Required | Notes |
|-------------|------------|----------------|----------|-------|
| Report type | hidden | `reportType` | yes | Sent as `self`. If absent, the backend treats the payload as `self` for backwards compatibility. |
| Reporter name | text | `reporterName` | yes | Injured worker completing the claim. |
| Reporter email | email | `reporterEmail` | yes | Backend validates email format. Used as `replyTo` and `cc`. |
| Reporter phone | tel | `reporterPhone` | yes | Required by browser and backend. |
| Retailer | select | `retailer` | yes | Shared Retailer options. |
| Store / warehouse number | text | `storeNumber` | yes | Free text. |
| Store address | text | `storeAddress` | yes | Street-level location. |
| Project | select | `project` | yes | Shared Project options. |
| Mechanism | select | `mechanism` | yes | Shared Mechanism options. |
| Date of injury | date | `dateOfInjury` | yes | Required by browser and backend. |
| Time of injury | time | `timeOfInjury` | yes | Required by browser and backend. |
| Body part(s) affected | checkbox group | `bodyPart` | yes | Shared Body Part options. `claims/app.js` maps checked values to payload field `bodyPartsAffected`. Backend requires at least one valid value. |
| Side affected | select | `sideAffected` | yes | Shared Side options. |
| Description of what happened | textarea | `description` | yes | Factual narrative. |
| Witness name | repeater text | `witnessName` | no | Optional repeater. `claims/app.js` maps rows to `witnesses: [{ name, phoneOrEmail }]`. If a row is sent, backend requires `name`. |
| Witness phone or email | repeater text | `witnessPhoneOrEmail` | no | Optional contact value for each witness row. |
| Did you report it to a supervisor? | radio | `reportedToSupervisor` | yes | Values: Yes / No. |
| Supervisor name | text | `supervisorName` | conditional | Shown and required when `reportedToSupervisor` is Yes. |
| Date reported | date | `supervisorDateReported` | conditional | Shown and required when `reportedToSupervisor` is Yes. |
| Time reported | time | `supervisorTimeReported` | conditional | Shown and required when `reportedToSupervisor` is Yes. |
| Any pre-existing conditions or prior injuries to the affected area? | radio | `preExistingAny` | yes | Values: Yes / No. |
| Please describe | textarea | `preExistingDetails` | conditional | Shown and required when `preExistingAny` is Yes. |

---

## Type 2 — Witness / Statement

Form metadata:

- `<form id="claim-form" data-form-kind="witness">`
- Hidden input: `name="reportType"` with value `witness`

| Field label | Field type | name attribute | Required | Notes |
|-------------|------------|----------------|----------|-------|
| Report type | hidden | `reportType` | yes | Sent as `witness`. |
| Reporter name | text | `reporterName` | yes | Person submitting the witness/secondhand report. |
| Reporter email | email | `reporterEmail` | yes | Backend validates email format. Used as `replyTo` and `cc`. |
| Reporter phone | tel | `reporterPhone` | yes | Required by browser and backend. |
| Relationship to injured person | select | `relationshipToInjured` | yes | Options: Direct witness, Told secondhand, Asked to provide a statement, Other. |
| Injured associate's name | text | `injuredAssociateName` | yes | Required by browser and backend. |
| Retailer | select | `retailer` | yes | Shared Retailer options. |
| Store / warehouse number | text | `storeNumber` | yes | Required by browser and backend. |
| Store address | text | `storeAddress` | yes | Required by browser and backend. |
| Project | select | `project` | yes | Shared Project options. |
| Mechanism | select | `mechanism` | yes | Shared Mechanism options. |
| Date of injury | date | `dateOfInjury` | yes | Required by browser and backend. |
| Time of injury | time | `timeOfInjury` | no | Labeled "(if known)". |
| Body part(s) affected | checkbox group | `bodyPart` | no | Shared Body Part options. `claims/app.js` maps checked values to payload field `bodyPartsAffected`. Backend validates values if present. |
| Side affected | select | `sideAffected` | no | Shared Side options; labeled "(if known)". Backend validates value if present. |
| Description of what was witnessed or reported | textarea | `description` | yes | Required by browser and backend. |
| Statement / additional information | textarea | `statementAdditionalInfo` | conditional | Visible in all relationship states. Required only when `relationshipToInjured` is "Asked to provide a statement"; inline note appears in that state. |
| Did the injured person mention reporting it to anyone? | radio | `mentionedReporting` | no | Values: Yes / No. If Yes, detail block is shown. Backend validates value if present. |
| Name of person they mentioned reporting to | text | `mentionedReportName` | no | Shown only when `mentionedReporting` is Yes. Optional. |
| Date of that report | date | `mentionedReportDate` | no | Shown only when `mentionedReporting` is Yes. Optional. |
| Time of that report | time | `mentionedReportTime` | no | Shown only when `mentionedReporting` is Yes. Optional. |
| Are you aware of any pre-existing conditions relevant to the affected body part(s)? | radio | `preExistingAware` | no | Values: Yes / No. Backend validates value if present. |
| Please describe | textarea | `preExistingDetails` | conditional | Shown and required when `preExistingAware` is Yes. |

---

## Type 3 — Manager Investigation

Form metadata:

- `<form id="claim-form" data-form-kind="investigation">`
- Hidden input: `name="reportType"` with value `investigation`
- The form is rendered in the DOM but hidden until the manager gate authorizes the current user.

| Field label | Field type | name attribute | Required | Notes |
|-------------|------------|----------------|----------|-------|
| Report type | hidden | `reportType` | yes | Sent as `investigation`. |
| Reporter name (manager) | text | `reporterName` | yes | Manager completing the investigation intake. |
| Reporter email | email | `reporterEmail` | yes | Backend validates email format. Used as `replyTo` and `cc`. |
| Reporter phone | tel | `reporterPhone` | no | Optional. |
| Injured associate's name | text | `injuredAssociateName` | yes | Required by browser and backend. |
| Retailer | select | `retailer` | yes | Shared Retailer options. Used as the source for confirm retailer prefill. |
| Store / warehouse number | text | `storeNumber` | yes | Used as the source for confirm store number prefill. |
| Store address | text | `storeAddress` | yes | Used as the source for confirm store address prefill. |
| Project | select | `project` | yes | Shared Project options. |
| Mechanism | select | `mechanism` | yes | Shared Mechanism options. |
| Date of injury | date | `dateOfInjury` | yes | Incident/onset anchor for the investigation. |
| Q1. Date first learned about the incident | date | `firstLearnedDate` | yes | Paired with `firstLearnedTime`. |
| Q1. Time first learned about the incident | time | `firstLearnedTime` | yes | Paired with `firstLearnedDate`. |
| Q2. Were there any witnesses? | radio | `witnessesPresent` | yes | Values: Yes / No. If Yes, witness repeater is shown and one row is auto-added. |
| Witness name | repeater text | `witnessName` | conditional | Required for each witness row when `witnessesPresent` is Yes. `claims/app.js` maps rows to `witnesses: [{ name, phoneOrEmail }]`. |
| Witness phone or email | repeater text | `witnessPhoneOrEmail` | no | Optional contact value for each witness row. |
| Q3. Project at time of injury | select | `projectAtInjury` | yes | Shared Project options. Backend validates against the same set as `project`. |
| Q4. Confirm retailer | select | `confirmRetailer` | yes | Shared Retailer options. Prefilled from `retailer` until the manager edits the confirmation field. |
| Q4. Confirm store / warehouse number | text | `confirmStoreNumber` | yes | Prefilled from `storeNumber` until the manager edits the confirmation field. |
| Q4. Confirm store address | text | `confirmStoreAddress` | yes | Prefilled from `storeAddress` until the manager edits the confirmation field. |
| Q5. Are there any inconsistencies between the worker's account and what you observed or were told? | radio | `inconsistenciesAny` | yes | Values: Yes / No. |
| Q5. Describe | textarea | `inconsistenciesDescribe` | conditional | Shown and required when `inconsistenciesAny` is Yes. Disabled while hidden. |
| Q6. Are there current employment or disciplinary issues with the associate? | radio | `employmentDisciplinaryAny` | yes | Values: Yes / No. |
| Q6. Describe | textarea | `employmentDisciplinaryDescribe` | conditional | Shown and required when `employmentDisciplinaryAny` is Yes. Disabled while hidden. |
| Q7. Pre-existing injuries or conditions that might be relevant? | radio | `preExistingRelevantAny` | yes | Values: Yes / No. |
| Q7. Describe | textarea | `preExistingRelevantDescribe` | conditional | Shown and required when `preExistingRelevantAny` is Yes. Disabled while hidden. |
| Q8. Other contributing factors — accidents, falls, illnesses, etc.? | radio | `contributingFactorsAny` | yes | Values: Yes / No. |
| Q8. Describe | textarea | `contributingFactorsDescribe` | conditional | Shown and required when `contributingFactorsAny` is Yes. Disabled while hidden. |
| Q9. Sports, activities, or hobbies that could be relevant? | radio | `sportsActivitiesAny` | yes | Values: Yes / No. |
| Q9. Describe | textarea | `sportsActivitiesDescribe` | conditional | Shown and required when `sportsActivitiesAny` is Yes. Disabled while hidden. |
| Q10. Heavy lifting or moving activities outside of work? | radio | `heavyLiftingAny` | yes | Values: Yes / No. |
| Q10. Describe | textarea | `heavyLiftingDescribe` | conditional | Shown and required when `heavyLiftingAny` is Yes. Disabled while hidden. |
| OSHA recordability indicators | checkbox group | `oshaIndicators` | yes | Options: Required medical treatment beyond first aid; Resulted in lost time; Resulted in restricted duty or job transfer; None of the above; Unknown. At least one selection required via custom validity. "None of the above" and "Unknown" are each fully mutually exclusive with every other option. Backend enforces the same exclusivity. |
| Additional follow-ups assigned | textarea | `additionalFollowUps` | no | Helper text: "Use this space to log delegated follow-ups (e.g., 'Asked Evan for written statement on 3-18 reset')." |

---

## Shared across all three forms

- **Submission endpoint:** All forms submit JSON to `POST https://api.the-dump-bin.com/api/claims`. Requests route through Cloudflare Access, which injects the `Cf-Access-Authenticated-User-Email` header before forwarding to Railway.
- **Form metadata:** All forms use `id="claim-form"` and `data-form-kind` to route to the correct payload builder in `claims/app.js`.
- **Report type:** All forms include hidden `reportType`; the backend branches on `self`, `witness`, or `investigation`.
- **Reporter identity:** All forms collect `reporterName` and `reporterEmail`. `reporterEmail` is validated by the backend and used for `replyTo` and `cc`.
- **Incident context:** Retailer, store / warehouse number, store address, project, mechanism, and date of injury are collected on all three forms.
- **Shared option validation:** The backend validates retailer, project, mechanism, side affected, body parts, witness relationship, and OSHA values against fixed allowlists.

---

## Time picker component

- All `<input type="time">` fields across self, witness, and investigation forms are progressively enhanced by `the-dump-bin/claims/time-picker.js`, loaded on every form via `<script src="/claims/time-picker.js" defer>` before `app.js`.
- The script finds each native time input, hides it (`type="hidden"`), and renders a custom widget in its place: two numeric text inputs (`HH` and `MM`) and an AM/PM segmented toggle.
- Affected fields: `timeOfInjury` and `supervisorTimeReported` (self), `timeOfInjury` and `mentionedReportTime` (witness), `firstLearnedTime` (investigation).
- Behavior:
  - Hour input accepts 1–12, auto-advances focus to minutes after two digits or on `:` keypress.
  - Minute input accepts 0–59 typed; on blur, snaps to the nearest 15-minute increment (`:00`, `:15`, `:30`, `:45`).
  - AM/PM toggle defaults to unset and must be explicitly chosen for the value to be considered valid.
  - Hidden field receives standard 24-hour `HH:MM` format (e.g., `14:15`), matching the original payload contract — no backend changes required.
  - Required validation runs on form submit; missing/invalid values block submission, focus the hour field, and add `.ro-time-invalid` for visual feedback.
- Styling lives in the inline `<style>` block of each form HTML, scoped under `.ro-time-picker` and uses existing brand tokens for visual consistency. On screens ≤480px, the AM/PM toggle stacks below the digits and spans full width.
- Why custom: native `<input type="time">` on Android Chrome lacks an explicit confirm action, so tapping outside the picker discards the selection — a critical defect for an injury reporting workflow.

---

## Unique to each form

- **Self-Report Injury:** First-person injured-worker flow. Requires time of injury, body part(s), side affected, supervisor reporting answer, and pre-existing condition answer. Supports an optional witness repeater.
- **Witness / Statement:** Third-party flow. Requires relationship to injured person and injured associate name. Time, body part(s), side, reporting-mentioned details, and pre-existing awareness are optional unless their conditional rules make detail text required.
- **Manager Investigation:** Manager-only UX flow. No structured body-part or side fields. Adds learned-about timing, witness presence/repeater, project-at-injury confirmation, location confirmation prefills, six Yes/No + Describe investigation prompts, OSHA recordability indicators, and optional follow-up notes.

---

## Backend payload contract

The frontend collects DOM fields and normalizes them into these JSON shapes in `claims/app.js`. The backend validators in `api/server.js` enforce the field names below.

### Self report payload

```json
{
  "reportType": "self",
  "reporterName": "string",
  "reporterEmail": "string email",
  "reporterPhone": "string",
  "retailer": "Kroger | Fred Meyer | Walmart | QFC",
  "storeNumber": "string",
  "storeAddress": "string",
  "project": "Kompass ISE | Assembly | Remodel | Display Compliance | Central Pet",
  "mechanism": "Specific incident (single event) | Gradual onset (developed over time / repetitive) | Unsure",
  "dateOfInjury": "YYYY-MM-DD",
  "timeOfInjury": "HH:MM",
  "bodyPartsAffected": ["Head"],
  "sideAffected": "Left | Right | Both | Not applicable",
  "description": "string",
  "witnesses": [
    {
      "name": "string",
      "phoneOrEmail": "string"
    }
  ],
  "reportedToSupervisor": "Yes | No",
  "supervisorName": "string when reportedToSupervisor is Yes",
  "supervisorDateReported": "YYYY-MM-DD when reportedToSupervisor is Yes",
  "supervisorTimeReported": "HH:MM when reportedToSupervisor is Yes",
  "preExistingAny": "Yes | No",
  "preExistingDetails": "string when preExistingAny is Yes"
}
```

### Witness / statement payload

```json
{
  "reportType": "witness",
  "reporterName": "string",
  "reporterEmail": "string email",
  "reporterPhone": "string",
  "relationshipToInjured": "Direct witness | Told secondhand | Asked to provide a statement | Other",
  "injuredAssociateName": "string",
  "retailer": "Kroger | Fred Meyer | Walmart | QFC",
  "storeNumber": "string",
  "storeAddress": "string",
  "project": "Kompass ISE | Assembly | Remodel | Display Compliance | Central Pet",
  "mechanism": "Specific incident (single event) | Gradual onset (developed over time / repetitive) | Unsure",
  "dateOfInjury": "YYYY-MM-DD",
  "timeOfInjury": "HH:MM optional",
  "bodyPartsAffected": ["Head"],
  "sideAffected": "Left | Right | Both | Not applicable optional",
  "description": "string",
  "statementAdditionalInfo": "string required when relationshipToInjured is Asked to provide a statement",
  "mentionedReporting": "Yes | No optional",
  "mentionedReportName": "string optional",
  "mentionedReportDate": "YYYY-MM-DD optional",
  "mentionedReportTime": "HH:MM optional",
  "preExistingAware": "Yes | No optional",
  "preExistingDetails": "string when preExistingAware is Yes"
}
```

### Manager investigation payload

```json
{
  "reportType": "investigation",
  "reporterName": "string",
  "reporterEmail": "string email",
  "reporterPhone": "string optional",
  "injuredAssociateName": "string",
  "retailer": "Kroger | Fred Meyer | Walmart | QFC",
  "storeNumber": "string",
  "storeAddress": "string",
  "project": "Kompass ISE | Assembly | Remodel | Display Compliance | Central Pet",
  "mechanism": "Specific incident (single event) | Gradual onset (developed over time / repetitive) | Unsure",
  "dateOfInjury": "YYYY-MM-DD",
  "firstLearnedDate": "YYYY-MM-DD",
  "firstLearnedTime": "HH:MM",
  "witnessesPresent": "Yes | No",
  "witnesses": [
    {
      "name": "string required when witnessesPresent is Yes",
      "phoneOrEmail": "string optional"
    }
  ],
  "projectAtInjury": "Kompass ISE | Assembly | Remodel | Display Compliance | Central Pet",
  "confirmRetailer": "Kroger | Fred Meyer | Walmart | QFC",
  "confirmStoreNumber": "string",
  "confirmStoreAddress": "string",
  "inconsistenciesAny": "Yes | No",
  "inconsistenciesDescribe": "string when inconsistenciesAny is Yes",
  "employmentDisciplinaryAny": "Yes | No",
  "employmentDisciplinaryDescribe": "string when employmentDisciplinaryAny is Yes",
  "preExistingRelevantAny": "Yes | No",
  "preExistingRelevantDescribe": "string when preExistingRelevantAny is Yes",
  "contributingFactorsAny": "Yes | No",
  "contributingFactorsDescribe": "string when contributingFactorsAny is Yes",
  "sportsActivitiesAny": "Yes | No",
  "sportsActivitiesDescribe": "string when sportsActivitiesAny is Yes",
  "heavyLiftingAny": "Yes | No",
  "heavyLiftingDescribe": "string when heavyLiftingAny is Yes",
  "oshaIndicators": [
    "Required medical treatment beyond first aid"
  ],
  "additionalFollowUps": "string optional"
}
```

OSHA payload rule: `oshaIndicators` must contain at least one valid value. If it contains `None of the above` or `Unknown`, that value must be the only entry in the array.

---

## Manager gate

The Manager Investigation form uses a soft access gate:

- Cloudflare Access OTP is the first layer for the site/application.
- The client-side gate fetches Cloudflare Access identity from `/cdn-cgi/access/get-identity`.
- The email is checked against the allowlist in `the-dump-bin/claims/managers.js`.
- This is defense-in-depth UX gating only, not a security boundary. Investigation submissions are enforced server-side; see **Manager investigation hard auth** below.

To add a manager:

1. Edit `MANAGER_EMAILS` in `the-dump-bin/claims/managers.js`.
2. Commit the change.
3. Push/deploy the static site.

---

## Manager investigation hard auth

- The API enforces manager identity for `reportType: investigation` using `parseManagerEmails` and `isAuthorizedManager` in `injury-claim-form/api/server.js`.
- `MANAGER_EMAILS` is set on Railway as a comma-separated list of emails (stored lowercase; matching is case-insensitive against the normalized `Cf-Access-Authenticated-User-Email` value).
- The client-side gate in `claims/managers.js` is UX-only; the server-side check is the authority for accepting or rejecting investigation payloads.
- All forms must reach the API via `api.the-dump-bin.com` so Cloudflare Access can inject `Cf-Access-Authenticated-User-Email` before the request hits Express.

---

## CORS and origin lockdown

- `ALLOWED_ORIGINS` on Railway restricts which browser origins may call the API (currently `https://the-dump-bin.com`).
- The Express app enables CORS credentials so the Cloudflare Access session cookie can be sent on cross-origin requests to the API.
- The Cloudflare Access application has its own CORS settings (allowed origin, credentials, methods `GET`/`POST`, header `Content-Type`, `max-age` 600) so `OPTIONS` preflights are answered at the edge without forwarding to Express.

---

## Host allowlist

- `ALLOWED_HOSTS` on Railway lists acceptable `Host` header values (currently `api.the-dump-bin.com`).
- Middleware in `injury-claim-form/api/server.js` returns `404 Not Found` for any request whose `Host` is not allowlisted, which blocks direct use of the default `*.up.railway.app` hostname.
- If `ALLOWED_HOSTS` is empty or unset, the check is disabled (useful for local development).

---

## Email behavior

- All three forms POST to the same backend endpoint: `https://api.the-dump-bin.com/api/claims` (via Cloudflare Access; see **Shared across all three forms**).
- The backend branches on `reportType` and renders one of three email templates: self, witness, or investigation.
- All emails are sent to `OPS_TO`.
- `replyTo` is set to the submitter's `reporterEmail`.
- `cc` is also set to the submitter's `reporterEmail`, guarded by backend email validation, so submitters receive a record of what they submitted.
- Subjects are:
  - Self: `Injury Self-Report — {reporterName} at {retailer} #{storeNumber}`
  - Witness: `Witness/Statement Report — {injuredAssociateName} at {retailer} #{storeNumber} (reported by {reporterName})`
  - Investigation: `Manager Investigation — {injuredAssociateName} at {retailer} #{storeNumber} (manager: {reporterName})`
