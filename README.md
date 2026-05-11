# nextjs_supervision

Production-grade **SuperAdmin Portal** for Vivance Travels, built with **Next.js 14+ (App Router)** + **TypeScript**.

Base path: `http://127.0.0.1:3010/supervision` (dev server uses **port 3010** so it does not clash with another app on 3000).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```bash
copy .env.example .env.local
```

3. Update `.env.local` (see `.env.example`):

```env
USER_REPO_URL=http://localhost:8082
AUTH_URL=http://localhost:8084
VIV_X_API_KEY=your-x-api-key
AUTH_APP_DOMAIN_KEY=...
AUTH_APP_USERNAME=...
AUTH_APP_PASSWORD=...
AUTH_APP_SYSTEM=...
```

`AUTH_URL` is used for `POST /vivapi-auth/app/auth/login` to obtain a **Bearer** token. That token and `VIV_X_API_KEY` are sent to `USER_REPO_URL` when calling user authenticate.

4. Run the dev server (listens on **http://localhost:3010**):

```bash
npm run dev
```

To use another port temporarily: `npx next dev -p 3020`.

## Routes

- `/supervision/login` (public)
- `/supervision/dashboard` (protected)

## Authentication

- **Login API (proxied via Next.js)**: `POST /api/supervision/auth/login`
- Proxies to: `POST {USER_REPO_URL}/vivapi-user/user/authenticate`
- Enforces `userType = 1` (SuperAdmin)
- Stores JWT in an **httpOnly cookie** (`sv_token`)

## Security

- Route protection via `middleware.ts`
- Auto-redirect to login when unauthenticated/expired
- JWT is **never exposed to browser JavaScript**

## API troubleshooting logs (opt-in)

Set in `.env.local` when debugging (passwords, tokens, and auth headers are **redacted** in logs):

- **`SUPERVISION_API_DEBUG=true`** — logs incoming/outgoing API route traffic in the **server terminal** (e.g. login proxy to `USER_REPO_URL`, `/api/supervision/auth/*`).
- **`NEXT_PUBLIC_SUPERVISION_API_DEBUG=true`** — logs **browser** Axios calls (endpoint, method, params, sanitized headers/body, response).

Output prefix: `[Supervision API]` with JSON details.
