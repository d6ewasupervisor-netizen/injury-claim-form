# Injury claim intake API

Node.js API (`api/`) deployed on **Railway** that receives injury-report submissions from the three claim forms hosted in the [`the-dump-bin`](https://github.com/d6ewasupervisor-netizen/the-dump-bin) repo (under `claims/self/`, `claims/witness/`, `claims/investigation/`) and emails them via [Resend](https://resend.com).

The frontend lives in the `the-dump-bin` repo and is served from `https://the-dump-bin.com/claims/...`. This repo no longer ships any frontend code; the previously-served `claims.the-dump-bin.com` subdomain (formerly backed by a `docs/` folder via GitHub Pages) was retired during the consolidation.

- **From:** `claims@retail-odyssey.com`
- **To:** Operations inbox from **`CLAIMS_OPS_TO`** on the API host (comma-separated allowed); defaults to `tyson.gauthier@retailodyssey.com`. Reporter is **CC**'d; **Reply-To** is the reporter's email.
- **Auth:** None in-app. **Cloudflare Access (OTP)** gates the form pages on `the-dump-bin.com/claims/*`.

## Repository layout

```
injury-claim-form/
  api/
    server.js
    package.json
    .env.example
  FIELD-MAP.md
  README.md
  .gitignore
```

## Prerequisites

- Node.js 18+
- Resend API key and verified sending domain for `claims@retail-odyssey.com`

## Local development (API)

1. `cd api`
2. Copy `.env.example` to `.env` and set:
   - `RESEND_API_KEY` — Resend secret key
   - `PORT` — optional; defaults to `3000`
   - `ALLOWED_ORIGINS` — comma-separated browser origins allowed to call the API (e.g. `http://localhost:5173,http://127.0.0.1:5173`). If unset, CORS allows all origins (convenient for local dev only; **set in production**).
3. `npm install`
4. `npm run dev` (or `npm start`)

Endpoints:

- `GET /health` → `{ "ok": true }` (Railway health checks)
- `POST /api/claims` — JSON body matching the form; `200` `{ "ok": true }` or `400` with `{ "error": "...", "missing": ["fieldName", ...] }`

`POST /api/claims` is rate-limited (60 requests per 15 minutes per IP).

To exercise the API end-to-end locally, run a local copy of the `the-dump-bin/claims/` pages and set `API_BASE` in `the-dump-bin/claims/app.js` to your local API URL. Add the exact browser origin you use to `ALLOWED_ORIGINS` in the API `.env`.

## Railway (production)

1. Service root directory: `api`.
2. **Install:** `npm install`
3. **Start:** `npm start` (`node server.js`)
4. **Variables:**
   - `RESEND_API_KEY`
   - `CLAIMS_OPS_TO` — optional; comma-separated inbox(es) that receive every submission (see **To** above)
   - `ALLOWED_ORIGINS` — current production value: `https://the-dump-bin.com,https://www.the-dump-bin.com`
   - `PORT` is set by Railway automatically.

The frontend's `API_BASE` (in `the-dump-bin/claims/app.js`) points at this service's public Railway URL.

## Cloudflare Access (OTP)

Authentication is **not** implemented in this app. The form pages on `the-dump-bin.com/claims/*` are gated by a **Cloudflare Zero Trust → Access** Application using a **One-time PIN** / email policy. No code changes are required here.

## Environment variables (`api/.env.example`)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key (secret) |
| `PORT` | Listen port (default `3000`; Railway sets this) |
| `ALLOWED_ORIGINS` | Comma-separated browser `Origin` values allowed for CORS |
| `CLAIMS_OPS_TO` | Optional. Comma-separated recipient addresses for claim notifications |

Do not commit `.env` (gitignored).

### Troubleshooting missing notifications

1. **Railway logs** — On success you should see `[claims] email sent id=…`. If you see `Resend error:` instead, fix domain/API key in [Resend](https://resend.com).
2. **`CLAIMS_OPS_TO`** — Confirm this matches the mailbox you monitor (note `retailodyssey.com` vs `retail-odyssey.com` if your org uses both).
3. **Spam / quarantine** — Messages arrive From `claims@retail-odyssey.com`; allowlist that sender if needed.
4. **Submitter copy** — Valid reporter emails are **CC**'d; ask a test submitter to check their inbox if ops inbox receives nothing.

## Security

- Never expose `RESEND_API_KEY` in the frontend or in public repos.
- Set **`ALLOWED_ORIGINS`** in production.
- Cloudflare Access is the primary gate for end users.
