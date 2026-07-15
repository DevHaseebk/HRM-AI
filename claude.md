# HRFlow — Claude Code Rules

- Read `docs/HRFlow-Complete-Handover.md` FIRST for every task. Update it LAST.
- Auth is being migrated from spoofable headers (x-user-role/x-company-id) to
  JWT session (lib/server-auth.ts). Once server-auth.ts exists, NEW/EDITED
  routes must use getServerSession(), never trust x-user-role/x-company-id.
- Never touch /api/hrm/* (legacy JSON API) unless explicitly asked.
- Never add features not in the current task's Exact Scope.
- All Supabase writes go through supabaseAdmin (service role) — no RLS exists.
- Report format: files changed, what was verified (real output, not "works"),
  deviations from plan. Keep it short.
- Stop at the task's Stop Condition. Don't cascade into the next task.