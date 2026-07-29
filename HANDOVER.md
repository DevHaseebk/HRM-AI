# HRFlow Admin — Handover

**Package:** `admin/`  
**Role:** Next.js 14 — **UI only** (no API routes, no DB writes, no mailer/Gemini)  
**Updated:** 24 July 2026  

---

## What this folder is

| Path | Contents |
|------|----------|
| `app/` | Pages only — **no `app/api`** |
| `components/` | UI |
| `lib/` | Client helpers + JWT **verify** for middleware |
| `middleware.ts` | Protects dashboard pages |
| `next.config.mjs` | Rewrites `/api/:path*` → Express `BACKEND_URL` |

**Removed from admin (live on `backend/`):** supabase admin client, mailer, Gemini, otp, location, fake-db, bcrypt/qrcode/nodemailer deps, `data/` JSON, `scripts/hash-passwords`.

---

## Run

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — UI
cd admin && npm install && npm run dev
```

`.env.local` needs only: `JWT_SECRET` (same as backend), `BACKEND_URL`, optional `NEXT_PUBLIC_APP_URL`.

---

## Auth

- Express sets `hrm_session` on login (proxied through rewrite)
- Client sets `hrm_auth` via `lib/auth.ts`
- `lib/server-auth.ts` **only verifies** JWT for middleware (does not create sessions)

---

## Docs

- [`docs/HRFlow-Complete-Handover.md`](docs/HRFlow-Complete-Handover.md)
- [`../backend/HANDOVER.md`](../backend/HANDOVER.md)
