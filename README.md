# Injury claim intake form

Monorepo: static **GitHub Pages** frontend (`web/`) and **Railway** **Node.js** API (`api/`) that emails submissions via [Resend](https://resend.com).

- **From:** `claims@retail-odyssey.com`
- **To:** `tyson.gauthier@retailodyssey.com` (operations inbox; **Reply-To** is the reporter’s email)
- **Auth:** None in-app. Use **Cloudflare Access (OTP)** on the hostname that serves the form.

## Repository layout

```
injury-claim-form/
  web/
    index.html
    app.js
  api/
    server.js
    package.json
    .env.example
  README.md
  .gitignore
```

## Prerequisites

- Node.js 18+
- Resend API key and verified sending domain for `claims@retail-odyssey.com`

## Local development

### API (`api/`)

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

### Web (`web/`)

1. At the **top** of [`web/app.js`](web/app.js), set **`API_BASE`** to your API base URL with **no trailing slash** (e.g. `http://localhost:3000` locally, or your Railway URL in production).
2. Serve the folder over HTTP (avoid `file://` for CORS). Example:

   ```bash
   npx --yes serve web -p 5173
   ```

3. Add the exact origin you use in the browser (e.g. `http://localhost:5173`) to `ALLOWED_ORIGINS` in the API `.env`.

## Railway (API)

1. Create a Railway service from this repo with **root directory** `api`.
2. **Install:** `npm install`
3. **Start:** `npm start` (`node server.js`)
4. **Variables:**
   - `RESEND_API_KEY`
   - `ALLOWED_ORIGINS` — e.g. `https://YOUR_USER.github.io,https://forms.yourdomain.com`
   - `PORT` is set by Railway automatically.

After deploy, set **`API_BASE`** in `web/app.js` to the public Railway **https://** URL, commit, and redeploy GitHub Pages.

## GitHub Pages (frontend)

- **Settings → Pages:** publish from branch and set the source folder to **`/web`**, or use a workflow that uploads the `web/` artifact.
- Add your live site origin to Railway’s **`ALLOWED_ORIGINS`**.

## Cloudflare Access (OTP)

Authentication is **not** implemented in this app. In **Cloudflare Zero Trust → Access**, create an **Application** for the hostname (or path) where the form is hosted and use a **One-time PIN** / email policy. No code changes are required.

## Environment variables (`api/.env.example`)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key (secret) |
| `PORT` | Listen port (default `3000`; Railway sets this) |
| `ALLOWED_ORIGINS` | Comma-separated browser `Origin` values allowed for CORS |

Do not commit `.env` (gitignored).

## Security

- Never expose `RESEND_API_KEY` in the frontend or in public repos.
- Set **`ALLOWED_ORIGINS`** in production.
- Cloudflare Access is the primary gate for end users.
