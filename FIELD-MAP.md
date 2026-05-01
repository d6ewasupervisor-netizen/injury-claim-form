# Injury Reporting — Field Map (Specification)

This document describes the field structure for a three-type injury reporting tool. Specification only; no implementation.

---

## Shared dropdown options

Apply these options wherever the corresponding field appears across all three form types.

| Option set | Values |
|------------|--------|
| **Retailer** | Kroger, Fred Meyer, Walmart, QFC |
| **Project** | Kompass ISE, Assembly, Remodel, Display Compliance, Central Pet |
| **Body part affected** (multi-select) | Head, Eye, Neck, Shoulder, Upper back, Lower back, Chest, Abdomen, Arm, Elbow, Wrist, Hand, Finger, Hip, Leg, Knee, Ankle, Foot, Toe, Other |
| **Side affected** | Left, Right, Both, Not applicable |
| **Mechanism** | Specific incident (single event), Gradual onset (developed over time / repetitive), Unsure |

---

## Confidentiality notice (Type 2 and Type 3 only)

Display at the **top** of the Type 2 and Type 3 forms:

> Information submitted may be shared with the injured worker, their representative, claims administrators, and the Washington State Department of Labor & Industries. Please be accurate and factual.

---

## Type 1 — Self-Claim (I was injured)

| Field label | Field type | Required | Notes |
|-------------|------------|----------|-------|
| Reporter name | text | yes | Injured worker completing the claim. |
| Reporter email | email | yes | Standard email validation. |
| Reporter phone | tel | yes | Format/validation per product standards. |
| Retailer | select | yes | Shared retailer options. |
| Store / warehouse number | text | yes | Free text or masked format per product standards. |
| Store address | text | yes | Street-level location of the facility. |
| Project | select | yes | Shared project options. |
| Mechanism | select | yes | Shared mechanism options. |
| Date of injury | date | yes | Not in the future unless product allows amended reporting; clarify in implementation. |
| Time of injury | time | yes | |
| Body part(s) affected | multi-select | yes | Shared body-part list; at least one selection typically expected. |
| Side affected | select | yes | Shared side options. |
| Description of what happened | textarea | yes | Factual narrative of the incident or onset. |
| Witnesses | repeater | no | Zero or more entries; each witness: **name** (text), **phone or email if known** (tel or email / combined text field). |
| Did you report it to a supervisor? | radio | yes | Values: Yes / No. |
| Supervisor name | text | conditional | Required when supervisor report = Yes. |
| Date reported to supervisor | date | conditional | Required when supervisor report = Yes. |
| Time reported to supervisor | time | conditional | Required when supervisor report = Yes. |
| Pre-existing conditions or prior injuries (affected body part(s)) | textarea | no | Free text; clarify affected area aligns with multi-select above. |

---

## Type 2 — Witness / Secondhand Report

**Confidentiality notice:** show at top (see above).

| Field label | Field type | Required | Notes |
|-------------|------------|----------|-------|
| Reporter name | text | yes | Person submitting the witness/secondhand form. |
| Reporter email | email | yes | |
| Reporter phone | tel | yes | |
| Relationship to injured person | select | yes | Options: Direct witness, Told secondhand, Asked to provide a statement, Other. |
| Injured associate's name | text | yes | |
| Retailer | select | yes | Shared retailer options. |
| Store / warehouse number | text | yes | |
| Store address | text | yes | |
| Project | select | yes | Shared project options. |
| Mechanism | select | yes | Shared mechanism options. |
| Date of injury | date | yes | |
| Time of injury | time | no | Label as “if known.” |
| Body part(s) affected | multi-select | no | Shared list; label as “if known.” |
| Side affected | select | no | Shared options; label as “if known.” |
| Description of what was witnessed or reported | textarea | yes | Narrative of what they saw or were told. |
| Statement / additional information | textarea | conditional | Required when Relationship = **Asked to provide a statement**. Optional or hidden otherwise (product decision: show optional for Other). |
| Did the injured person mention reporting it to anyone? | radio | no | Yes / No (or neutral “unknown” if added later). If Yes, capture **name**, **date**, **time** (all optional subfields unless product tightens rules). |
| Name (person they mentioned reporting to) | text | no | Use when preceding question indicates reporting mentioned; clarify in UI. |
| Date (of that report) | date | no | If known. |
| Time (of that report) | time | no | If known. |
| Pre-existing conditions relevant to affected body part(s) | textarea | no | Awareness-based; may be unknown. |

---

## Type 3 — Management Investigation Intake

**Confidentiality notice:** show at top (see above).

**Body part / side:** Not included as structured fields on Type 3. Injury description—including affected region, if discussed—is captured only in the narrative responses to the investigation questions below (not via the shared body-part or side dropdowns).

| Field label | Field type | Required | Notes |
|-------------|------------|----------|-------|
| Reporter name (manager) | text | yes | Managing reporter. |
| Reporter email | email | yes | |
| Reporter phone | tel | no | Optional. Format/validation per product standards. |
| Injured associate's name | text | yes | |
| Retailer | select | yes | Shared retailer options. |
| Store / warehouse number | text | yes | |
| Store address | text | yes | |
| Project | select | yes | Shared project options. |
| Mechanism | select | yes | Shared mechanism options. |
| Date of injury | date | yes | Incident/onset anchor for the investigation. |
| When did you first learn about the incident? — date | date | yes | |
| When did you first learn about the incident? — time | time | yes | Pair with date above. |
| Were there any witnesses? | radio | yes | Yes / No. |
| Witness entries | repeater | conditional | If Yes: one row per witness — **name** (text), **phone or email** (tel/email/combined text). |
| What project was the associate working on when injured? | text or select | yes | Same vocabulary as Project dropdown is ideal; textarea acceptable if free-form note needed alongside confirm. Spec lists as standard investigation question — align options with shared **Project** where possible. |
| Confirm retailer | select | yes | Prefill from above; acts as confirmation step. Same options as Retailer. |
| Confirm store / warehouse number | text | yes | Prefill from store number field. |
| Confirm store address | text | yes | Prefill from store address field. |
| Inconsistencies between worker account and what you observed or were told | radio + textarea | conditional | Radio: Yes / No. If Yes, **describe** (textarea required). |
| Current employment or disciplinary issues with the associate | radio + textarea | conditional | Yes / No. If Yes, **describe** (textarea required). |
| Pre-existing injuries or conditions that might be relevant | radio + textarea | conditional | Yes / No. If Yes, **describe** (textarea required). |
| Other contributing factors — accidents, falls, illnesses, etc. | radio + textarea | conditional | Yes / No. If Yes, **describe** (textarea required). |
| Sports, activities, or hobbies that could be relevant | radio + textarea | conditional | Yes / No. If Yes, **describe** (textarea required). |
| Heavy lifting or moving activities outside of work | radio + textarea | conditional | Yes / No. If Yes, **describe** (textarea required). |
| OSHA recordability indicators | multi-select | yes | Options: Required medical treatment beyond first aid; Resulted in lost time; Resulted in restricted duty or job transfer; None of the above; Unknown. At least one selection. Mutually exclusive: selecting 'None of the above' clears all other selections; selecting any other option clears 'None of the above'. 'Unknown' is also mutually exclusive with the three positive options but can coexist with 'None' if the form decides to treat them as separate axes — recommend treating 'Unknown' as fully mutually exclusive with all others for simplicity. |
| Additional follow-ups assigned | textarea | no | Example: notes on statements requested, confirmations, dates. |

---

## Shared across all three forms

- **Incident context:** Retailer, store / warehouse number, store address, project, mechanism, date of injury.
- **Harm detail (where collected):** Body part(s) affected and side affected use the same option sets when those fields appear on Type 1 (required) and Type 2 (optional / “if known”). Type 3 does **not** include those structured fields; injury detail appears only in narrative investigation responses.
- **Reporting party identification:** Reporter name and reporter email appear on every form. Reporter phone: required on Type 1 and Type 2; optional on Type 3.

---

## Unique to each form

- **Type 1:** First-person injured-worker flow; collects **time of injury**, supervisor reporting (conditional detail), structured **witness repeater**, and self-reported **pre-existing** information for affected areas.

- **Type 2:** Third-party / witness lens; **relationship to injured person** drives required **statement / additional information** when the reporter was asked to give a statement; **time**, **body parts**, and **side** are explicitly optional (“if known”); captures whether the injured person **mentioned** reporting to someone (with optional contact/timing).

- **Type 3:** Manager investigation intake after a claim exists; **optional reporter phone**; adds **learned-about** timing, structured **witness** block, duplicate **confirmation** fields for retailer/store/address, **inconsistency and HR/relevance** Yes/No+describe prompts, **OSHA recordability** multi-select, and **follow-up assignments** free text — with no structured body-part or side picker; narratives carry injury description.
