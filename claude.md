# HRFlow — Claude Code Rules

- This package is `admin/` — **UI only**. All APIs/DB/email/AI live in `../backend/`.
- Read `docs/HRFlow-Complete-Handover.md` FIRST for every task. Update it LAST.
- Do **not** recreate `app/api`, Supabase service-role clients, mailer, or Gemini in admin.
- Admin proxies `/api/*` via `next.config.mjs` → `BACKEND_URL`.
- Page middleware uses `lib/server-auth.ts` (JWT verify only; same `JWT_SECRET` as backend).
- Never add features not in the current task's Exact Scope.
- Report format: files changed, what was verified (real output), deviations. Keep it short.
- Stop at the task's Stop Condition. Don't cascade into the next task.