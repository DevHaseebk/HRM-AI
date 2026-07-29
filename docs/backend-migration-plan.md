# HRFlow — Next.js to Node.js Backend Migration Plan

**Document date:** 24 July 2026  
**Source app:** `admin/` (Next.js 14 App Router — UI + current API routes)  
**Target backend:** `backend/` (Node.js + Express — currently empty scaffold target)  
**Database:** Same Supabase PostgreSQL (no schema changes)  
**UI:** No UI redesign — only API base URL / credentials changes in frontend callers  

**Related handovers:**
- [`admin/HANDOVER.md`](../HANDOVER.md) — Next.js admin app after monorepo split
- [`backend/HANDOVER.md`](../../backend/HANDOVER.md) — Express backend target
- [`HRFlow-Complete-Handover.md`](./HRFlow-Complete-Handover.md) — full product handover

---

## Executive Summary

### What is being migrated

All **in-scope** Next.js API routes under [`admin/app/api/`](../app/api/) move to a separate Express server in [`backend/`](../../backend/). The Next.js app in `admin/` keeps the UI and becomes an API **client** of `backend/`.

| Item | Count |
|------|------:|
| Total `route.ts` files | **44** |
| Migrate to Express | **41** |
| Exclude (legacy `/api/hrm/*`) | **3** |

### Auth bucket breakdown (corrected — must sum to 44)

| Bucket | Count | Notes |
|--------|------:|-------|
| Session (`getServerSession`) | **24** | JWT cookie `hrm_session` via `jose` HS256 |
| Header-scope (`getCompanyScope`) | **11** | Spoofable `x-user-role` / `x-company-id` — convert to session during migrate |
| Public (no auth) | **6** | login, logout, forgot-password, verify-otp, reset-password, **ai-interview** |
| Excluded (`/api/hrm/*`) | **3** | JSON fake-db; do not migrate unless explicitly asked |
| **Total** | **44** | |

> **Fix from plan review:** earlier draft said “~28 session routes”. Actual count is **24**.  
> Check: 24 + 11 + 6 + 3 = **44**.

### Why

Separate backend for clearer deployment, rate limiting, and security hardening; keep Next.js for UI only.

### Key risks

1. **Cross-origin cookies** (`SameSite=lax` today → need `None; Secure` + CORS credentials when API host ≠ admin host) — #1 risk  
2. **11 spoofable header routes** must become session-authenticated during move  
3. **`ai-interview` is public** — open Gemini endpoint; **must add auth** during migration (do not port as-is)  
4. Complex AI routes (`ai-chat`, `ai-reports`, `ai-churn`, `ai-anomalies`, `ai-documents`) are schedule risk  
5. Next.js page middleware still needs cookies readable on the **admin** origin  

### Estimated effort

**10–14 engineer-days** for 41 in-scope routes. Pad if AI routes slip. Dual-run via Next rewrite optional during cutover.

### Locked decisions

| Decision | Choice |
|----------|--------|
| Backend location | Monorepo `backend/` |
| Legacy `/api/hrm/*` | **Do not migrate** |
| Schema / UI | Unchanged |
| Frontend API access | `NEXT_PUBLIC_API_BASE_URL` + `apiFetch()` |
| Local dual-run | Optional Next rewrite `/api/*` → Express `:4000` |
| Production auth | Express `hrm_session` httpOnly + CORS `credentials` |
| Header spoofing | Migrate 11 routes to session during move |
| TypeScript | `tsx` (dev) + `tsc` (prod) |
| Deploy | Admin Next on Vercel; Express on Railway |

---

## Part 1: Current API Routes Audit

**Base path:** `admin/app/api/`  
**Middleware:** [`admin/middleware.ts`](../middleware.ts) protects **pages only**; matcher **excludes** `/api/*`.

### Auth pattern legend

| Pattern | Meaning |
|---------|---------|
| **Session** | `getServerSession(request)` — cookie JWT `hrm_session` |
| **Headers** | `getCompanyScope(request)` — `x-user-role`, `x-company-id` (spoofable) |
| **Public** | No session / no role gate |
| **Excluded** | Legacy JSON API — out of scope |

### Complexity rollup (in-scope 41 + 3 excluded)

| Complexity | Approx | Typical reason |
|------------|-------:|----------------|
| Easy | ~24 | Session CRUD / public auth flows |
| Medium | ~11 | Header→session swap, multi-step (bulk, QR, employees create) |
| Complex | ~6 | AI pipelines + geo check-in (+ leave alone `hrm/*`) |

---

### 1. `admin/app/api/auth/login/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Validate email/password (`users.password_hash` via bcrypt); load linked `employees`; build `AuthUser`; `createSession` |
| Tables | `users` (select); `employees` (select) |
| External | `bcryptjs` |
| Request | Body `{ email, password }` |
| Response | `{ user: AuthUser }` \| `{ error }` 400/401/500 |
| Auth | **Public** |
| Lib | `@/lib/supabase`, `@/lib/types`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextResponse`, `Request` |

### 2. `admin/app/api/auth/logout/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Clears `hrm_session` via `clearSession` |
| Tables | none |
| External | none |
| Request | none |
| Response | `{ success: true }` |
| Auth | **Public** |
| Lib | `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextResponse` |

### 3. `admin/app/api/auth/change-password/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Session user verifies current password; hashes new; clears temp-password flags |
| Tables | `users` (select, update) |
| External | `bcryptjs` |
| Request | Body `{ currentPassword, newPassword }`; session cookie |
| Response | `{ success, message }` \| errors 400/401/500 |
| Auth | **Session** |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 4. `admin/app/api/auth/forgot-password/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Rate-limited OTP; delete prior OTP; insert; email via mailer; generic success if unknown email |
| Tables | `users` (select); `password_reset_otp` (select, delete, insert) |
| External | nodemailer (`sendPasswordResetOtpEmail`) |
| Request | Body `{ email }` |
| Response | `{ success, message }` \| `{ error, remainingSeconds? }` 400/429/500 |
| Auth | **Public** |
| Lib | `@/lib/supabase`, `@/lib/otp`, `@/lib/mailer` |
| Complexity | **Easy** |
| Next APIs | `NextResponse`, `Request` |

### 5. `admin/app/api/auth/verify-otp/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Validate OTP; bump attempts on fail; on match issue `reset_token` (UUID, 15 min) |
| Tables | `password_reset_otp` (select, update) |
| External | `crypto.randomUUID` |
| Request | Body `{ email, otp }` |
| Response | `{ success, reset_token }` \| `{ error }` |
| Auth | **Public** |
| Lib | `@/lib/supabase`, `@/lib/otp` |
| Complexity | **Easy** |
| Next APIs | `NextResponse`, `Request` |

### 6. `admin/app/api/auth/reset-password/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Validate reset token + password rules; update hash; delete OTP row |
| Tables | `password_reset_otp` (select, delete); `users` (update) |
| External | `bcryptjs` |
| Request | Body `{ email, reset_token, newPassword }` |
| Response | `{ success, message }` \| `{ error }` |
| Auth | **Public** (token-gated) |
| Lib | `@/lib/supabase`, `@/lib/password-utils` |
| Complexity | **Easy** |
| Next APIs | `NextResponse`, `Request` |

### 7. `admin/app/api/auth/send-credentials/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | HR roles resend credentials email; non–super_admin must match employee company |
| Tables | `employees` (select) |
| External | nodemailer (`sendCredentialsEmail`) |
| Request | Body `{ email, name, password }`; session |
| Response | `{ success, message }` \| 400/401/403/404/500 |
| Auth | **Session**; roles `super_admin\|company_admin\|hr_manager` |
| Lib | `@/lib/mailer`, `@/lib/server-auth`, `@/lib/supabase` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 8. `admin/app/api/scripts/hash-passwords/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET` |
| Logic | One-shot password hash migration |
| Tables | `users` (via script) |
| External | `bcryptjs` |
| Request | Query `?secret=` = `MIGRATION_SECRET`; session `super_admin` |
| Response | `{ success, count }` \| 403/500 |
| Auth | **Session** + secret |
| Lib | `@/lib/server-auth`; `@/scripts/hash-passwords` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse`, `dynamic = "force-dynamic"` |

### 9. `admin/app/api/employees/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | List (company-scoped); create employee + user + optional company + temp password email; rollback employee if user insert fails |
| Tables | `employees`, `users`, `companies` |
| External | `bcryptjs`, nodemailer |
| Request | POST body employee fields + `role?`, `company_id?`, `new_company_name?` |
| Response | GET array; POST employee + `user_id` |
| Auth | **Session**; POST manage roles; `company_admin` create only by super_admin |
| Lib | `@/lib/supabase`, `@/lib/password-utils`, `@/lib/mailer`, `@/lib/server-auth` |
| Complexity | **Medium** |
| Next APIs | `NextRequest`, `NextResponse` |

### 10. `admin/app/api/employees/[id]/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `PUT`, `DELETE` |
| Logic | CRUD by id; DELETE checks `role_permissions` / `DEFAULT_PERMISSIONS` for `can_delete` on `employees` |
| Tables | `employees`, `role_permissions` |
| External | none |
| Request | Params `id`; PUT body employee fields |
| Response | row / `{ message, data }` |
| Auth | **Session** |
| Lib | `@/lib/supabase`, `@/lib/server-auth`, `@/lib/permissions` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse`, dynamic params |

### 11. `admin/app/api/companies/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | List companies (all vs own); create (super_admin only) |
| Tables | `companies` |
| External | none |
| Request | POST `{ name }` |
| Response | array / created row |
| Auth | **Session**; POST `super_admin` |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 12. `admin/app/api/office-profile/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | Get/upsert office profile (hours, geo, policies); snake↔camel map |
| Tables | `office_profiles` |
| External | none |
| Request | POST camelCase/snake_case profile fields (incl. base64 `logoUrl`) |
| Response | `{ profile }` |
| Auth | **Session**; POST manage roles |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 13. `admin/app/api/roles-permissions/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | Load/merge permissions + user counts; upsert matrix; company_admin role-edit limits |
| Tables | `role_permissions`, `users` |
| External | none |
| Request | POST `{ permissions: RolePermission[] }` |
| Response | `{ permissions, userCounts, usingDefaults?, warning? }` |
| Auth | **Session**; POST `super_admin\|company_admin` |
| Lib | `@/lib/server-auth`, `@/lib/permissions`, `@/lib/supabase`, `@/lib/types` |
| Complexity | **Medium** |
| Next APIs | `NextRequest`, `NextResponse` |

### 14. `admin/app/api/document-templates/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | List (`?type=`); create with variable extraction |
| Tables | `document_templates` |
| External | none |
| Request | Query `type`; POST `{ type, name, content, variables?, companyId? }` |
| Response | `{ templates }` / `{ template }` |
| Auth | **Session**; company-scoped |
| Lib | `@/lib/server-auth`, `@/lib/document-templates`, `@/lib/supabase` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 15. `admin/app/api/document-templates/[id]/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `PUT`, `DELETE` |
| Logic | CRUD single template; PUT regenerates variables |
| Tables | `document_templates` |
| External | none |
| Request | Params `id`; PUT fields |
| Response | `{ template }` / `{ success: true }` |
| Auth | **Session** |
| Lib | `@/lib/server-auth`, `@/lib/document-templates`, `@/lib/supabase` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 16. `admin/app/api/leaves/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | List with filters; employees create for self only |
| Tables | `leaves`, `employees` |
| External | none |
| Request | Query `employee_id`, `status`; POST leave fields |
| Response | array / row |
| Auth | **Session** |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 17. `admin/app/api/leaves/[id]/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `PUT` |
| Logic | Approve/reject; email employee; `emailWarning` on mail fail |
| Tables | `leaves`, `employees` |
| External | nodemailer (`sendLeaveStatusEmail`) |
| Request | Body `{ status: approved\|rejected, approved_by? }` |
| Response | leave row (+ optional `emailWarning`) |
| Auth | **Session**; manage roles incl. `team_lead` |
| Lib | `@/lib/supabase`, `@/lib/mailer`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 18. `admin/app/api/announcements/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | List/create announcements via header company scope |
| Tables | `announcements` |
| External | none |
| Request | Headers `x-user-role`, `x-company-id`; POST fields |
| Response | array / row |
| Auth | **Headers** (spoofable) → migrate to **Session** |
| Lib | `@/lib/supabase`, `@/lib/company-scope` |
| Complexity | **Medium** |
| Next APIs | `NextResponse`, `Request` |

### 19. `admin/app/api/announcements/[id]/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `DELETE` |
| Logic | Delete with optional company filter from headers |
| Tables | `announcements` |
| External | none |
| Request | Params `id`; headers |
| Response | `{ message, data }` |
| Auth | **Headers** → migrate to **Session** |
| Lib | `@/lib/supabase`, `@/lib/company-scope` |
| Complexity | **Medium** |
| Next APIs | `NextResponse`, `Request` |

### 20. `admin/app/api/attendance/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | List (company join); managers create |
| Tables | `attendance`, `employees` |
| External | none |
| Request | Query `employee_id`, `date`; POST fields |
| Response | array / row |
| Auth | **Session** |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 21. `admin/app/api/attendance/[id]/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `PUT` |
| Logic | Update after company ownership check |
| Tables | `attendance` |
| External | none |
| Request | Params `id`; body |
| Response | updated row |
| Auth | **Session** |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 22. `admin/app/api/attendance/checkin/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Geo check-in (haversine); may bootstrap office location; present/late via Asia/Karachi office times |
| Tables | `employees`, `office_profiles`, `companies`, `attendance` |
| External | none (`@/lib/location`) |
| Request | Body `{ employee_id, latitude, longitude }` must match `session.employee_id` |
| Response | `{ success, status, checkInTime, distance, radius, ... }` \| `OUTSIDE_OFFICE_RANGE` 403 |
| Auth | **Session**; self only |
| Lib | `@/lib/supabase`, `@/lib/location`, `@/lib/server-auth` |
| Complexity | **Complex** |
| Next APIs | `NextRequest`, `NextResponse` |

### 23. `admin/app/api/attendance/checkout/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Self checkout; compute hours worked |
| Tables | `attendance` |
| External | none |
| Request | Body `{ employee_id }` |
| Response | `{ success, checkOutTime, hoursWorked, message }` |
| Auth | **Session**; self only |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 24. `admin/app/api/attendance/bulk/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | HR bulk upsert attendance for a date |
| Tables | `employees`, `attendance` |
| External | none |
| Request | Body `{ date, records: [...], override_note? }` |
| Response | `{ success, count, message }` |
| Auth | **Session** |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Medium** |
| Next APIs | `NextRequest`, `NextResponse` |

### 25. `admin/app/api/attendance/reminder/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Email active employees missing today’s attendance |
| Tables | `employees`, `attendance` |
| External | nodemailer |
| Request | none (session company scope) |
| Response | `{ success, count, totalCandidates, failures, message }` |
| Auth | **Session**; `super_admin\|company_admin\|hr_manager` |
| Lib | `@/lib/supabase`, `@/lib/mailer`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 26. `admin/app/api/attendance/qr/generate/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET` |
| Logic | Daily QR token; store on attendance; return PNG data URL |
| Tables | `employees`, `attendance` |
| External | `qrcode` (`QRCode.toDataURL`) |
| Request | Query `employee_id` |
| Response | `{ token, qrCode, date, status, checkInTime }` |
| Auth | **Session**; self OR same-company managers OR super_admin |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Medium** |
| Next APIs | `NextRequest`, `NextResponse` |

### 27. `admin/app/api/attendance/qr/scan/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Manager scans token; marks present/late; clears token |
| Tables | `attendance`, `employees` |
| External | none |
| Request | Body `{ token }` |
| Response | `{ success, message, employeeName, status, checkInTime }` |
| Auth | **Session**; manager roles |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 28. `admin/app/api/payroll/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | Role-aware list; create with net_salary calc |
| Tables | `payroll`, `employees` |
| External | none |
| Request | POST payroll fields |
| Response | array / row |
| Auth | **Session**; CREATE excludes team_lead/employee |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 29. `admin/app/api/payroll/[id]/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `PUT` |
| Logic | Update after ownership check |
| Tables | `payroll` |
| External | none |
| Request | Params `id`; body |
| Response | updated row |
| Auth | **Session** |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse` |

### 30. `admin/app/api/performance/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | List/create reviews via headers |
| Tables | `performance`, `employees` |
| External | none |
| Request | Headers; POST `{ employee_id, rating, ... }` |
| Response | array / row |
| Auth | **Headers** → migrate to **Session** |
| Lib | `@/lib/supabase`, `@/lib/company-scope` |
| Complexity | **Medium** |
| Next APIs | `NextResponse`, `Request` |

### 31. `admin/app/api/performance/[id]/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `PUT` |
| Logic | Update with header company check |
| Tables | `performance` |
| External | none |
| Request | Params `id`; body; headers |
| Response | updated row |
| Auth | **Headers** → migrate to **Session** |
| Lib | `@/lib/supabase`, `@/lib/company-scope` |
| Complexity | **Medium** |
| Next APIs | `NextResponse`, `Request` |

### 32. `admin/app/api/jobs/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | List/create jobs; force `company_id` when scoped |
| Tables | `jobs` |
| External | none |
| Request | Headers; POST `{ title, ... }` |
| Response | array / row |
| Auth | **Headers** → migrate to **Session** |
| Lib | `@/lib/supabase`, `@/lib/company-scope` |
| Complexity | **Medium** |
| Next APIs | `NextResponse`, `Request` |

### 33. `admin/app/api/applicants/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST` |
| Logic | List (job/stage filters); create after job company check |
| Tables | `applicants`, `jobs` |
| External | none |
| Request | Query `job_id`, `stage`; POST; headers |
| Response | array / row |
| Auth | **Headers** → migrate to **Session** |
| Lib | `@/lib/supabase`, `@/lib/company-scope` |
| Complexity | **Medium** |
| Next APIs | `NextResponse`, `Request` |

### 34. `admin/app/api/applicants/[id]/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `PUT` |
| Logic | Update stage + notes (pipeline) |
| Tables | `applicants` |
| External | none |
| Request | Body `{ stage, notes? }` |
| Response | updated row |
| Auth | **Headers** → migrate to **Session** |
| Lib | `@/lib/supabase`, `@/lib/company-scope` |
| Complexity | **Medium** |
| Next APIs | `NextResponse`, `Request` |

### 35–37. `admin/app/api/hrm/**` — EXCLUDED

| File | Methods | Notes |
|------|---------|-------|
| `hrm/route.ts` | `GET` | Aggregates fake-db JSON — **no auth** |
| `hrm/[resource]/route.ts` | `GET`, `POST` | Generic JSON CRUD |
| `hrm/[resource]/[id]/route.ts` | `PATCH`, `DELETE` | Update/delete by id |

**Do not migrate.** Lib: `@/lib/fake-db`, `@/lib/resource-map`, `@/lib/types`.

### 38. `admin/app/api/ai-interview/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Gemini interview kit JSON (technical/behavioral/cultureFit) |
| Tables | none |
| External | Gemini (`askGemini`) |
| Request | Body `{ jobTitle, experienceLevel?, skills? }` |
| Response | `{ kit }` \| `{ error, raw? }` |
| Auth | **Public — SECURITY GAP** → **must add Session + role gate on migrate** |
| Lib | `@/lib/ai-gemini` |
| Complexity | **Easy** (auth add required) |
| Next APIs | `NextResponse`, `Request` |

### 39. `admin/app/api/ai-reports/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Aggregate monthly HR metrics; Gemini narrative |
| Tables | `employees`, `applicants`, `attendance`, `leaves`, `payroll`, `performance` |
| External | Gemini |
| Request | Body `{ month?, year? }`; headers |
| Response | `{ report, metrics }` |
| Auth | **Headers** → migrate to **Session** |
| Lib | `@/lib/supabase`, `@/lib/ai-gemini`, `@/lib/company-scope` |
| Complexity | **Complex** |
| Next APIs | `NextResponse`, `Request` |

### 40. `admin/app/api/ai-churn/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET` |
| Logic | Churn risk scoring + AI enrichment |
| Tables | `employees`, `attendance`, `leaves`, `payroll`, `performance` |
| External | Gemini |
| Request | Headers |
| Response | `{ employees, summary }` |
| Auth | **Headers** → migrate to **Session** |
| Lib | `@/lib/supabase`, `@/lib/ai-gemini`, `@/lib/company-scope` |
| Complexity | **Complex** |
| Next APIs | `NextResponse`, `Request`, `dynamic`, `revalidate = 0` |

### 41. `admin/app/api/ai-anomalies/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET` |
| Logic | Attendance anomaly detection + Gemini insights |
| Tables | `employees`, `attendance` |
| External | Gemini |
| Request | Headers |
| Response | `{ anomalies, summary }` |
| Auth | **Headers** → migrate to **Session** |
| Lib | `@/lib/supabase`, `@/lib/ai-gemini`, `@/lib/company-scope` |
| Complexity | **Complex** |
| Next APIs | `NextResponse`, `Request`, `dynamic`, `revalidate = 0` |

### 42. `admin/app/api/ai-documents/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Prefer `document_templates`; else Gemini draft; optional `forceRegenerate` |
| Tables | `document_templates` |
| External | Gemini |
| Request | Body `{ documentType, formData?, forceRegenerate?, ... }`; headers |
| Response | `{ document, documentType, source, template?, suggestedVariables }` |
| Auth | **Headers** → migrate to **Session** |
| Lib | `@/lib/ai-gemini`, `@/lib/company-scope`, `@/lib/document-templates`, `@/lib/supabase` |
| Complexity | **Complex** |
| Next APIs | `NextResponse`, `Request` |

### 43. `admin/app/api/ai-chat/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `POST` |
| Logic | Intent detection (EN/Urdu); resolve employees; `fetchRelevantData`; `callGemini`; suggestion chips |
| Tables | `employees`, `users`, `leaves`, `attendance`, `performance`, `payroll`, `jobs`, `applicants`, `announcements` |
| External | Gemini (`callGemini`) |
| Request | Body `{ message, conversationHistory? }`; session |
| Response | `{ reply, suggestions, matchedEmployee, intent }` |
| Auth | **Session** |
| Lib | `@/lib/supabase`, `@/lib/ai-gemini`, `@/lib/server-auth` |
| Complexity | **Complex** |
| Next APIs | `NextRequest`, `NextResponse` |

### 44. `admin/app/api/ai-chat/history/route.ts`

| Field | Detail |
|-------|--------|
| Methods | `GET`, `POST`, `DELETE` |
| Logic | Per-user chat history (limit 50 on GET) |
| Tables | `ai_chat_history` |
| External | none |
| Request | POST `{ role, message }` |
| Response | `{ messages }` / `{ message }` / `{ ok: true }` |
| Auth | **Session** |
| Lib | `@/lib/supabase`, `@/lib/server-auth` |
| Complexity | **Easy** |
| Next APIs | `NextRequest`, `NextResponse`, `dynamic`, `revalidate = 0` |

### Session routes list (24)

1. `auth/change-password`  
2. `auth/send-credentials`  
3. `scripts/hash-passwords`  
4. `employees`  
5. `employees/[id]`  
6. `companies`  
7. `office-profile`  
8. `roles-permissions`  
9. `document-templates`  
10. `document-templates/[id]`  
11. `leaves`  
12. `leaves/[id]`  
13. `attendance`  
14. `attendance/[id]`  
15. `attendance/checkin`  
16. `attendance/checkout`  
17. `attendance/bulk`  
18. `attendance/reminder`  
19. `attendance/qr/generate`  
20. `attendance/qr/scan`  
21. `payroll`  
22. `payroll/[id]`  
23. `ai-chat`  
24. `ai-chat/history`  

### Header-scope routes list (11)

1. `announcements`  
2. `announcements/[id]`  
3. `jobs`  
4. `applicants`  
5. `applicants/[id]`  
6. `performance`  
7. `performance/[id]`  
8. `ai-reports`  
9. `ai-churn`  
10. `ai-anomalies`  
11. `ai-documents`  

### Public routes list (6)

1. `auth/login`  
2. `auth/logout`  
3. `auth/forgot-password`  
4. `auth/verify-otp`  
5. `auth/reset-password`  
6. `ai-interview` ← **add auth during migration**

### Supabase tables touched (union)

`users`, `employees`, `companies`, `office_profiles`, `role_permissions`, `document_templates`, `leaves`, `announcements`, `attendance`, `payroll`, `performance`, `jobs`, `applicants`, `password_reset_otp`, `ai_chat_history`

### External services across API

| Service | Routes |
|---------|--------|
| bcryptjs | login, change-password, reset-password, employees POST, hash-passwords |
| nodemailer | forgot-password, send-credentials, employees POST, leaves/[id], attendance/reminder |
| Gemini | ai-interview, ai-reports, ai-churn, ai-anomalies, ai-documents, ai-chat |
| qrcode | attendance/qr/generate |
| fake-db | hrm/* only |

### Next.js-specific APIs in routes

| API | Usage |
|-----|--------|
| `NextRequest` / `NextResponse` | Most routes |
| Plain `Request` | Some auth / header / AI routes |
| `dynamic` / `revalidate` | ai-churn, ai-anomalies, ai-chat/history, hash-passwords |
| Cookie session | via `admin/lib/server-auth.ts` (`cookies()` from `next/headers`) |
| **Not found** | Streaming, FormData multipart, `headers()` from `next/headers` in route files |

---

## Part 2: Library Files Audit

**Base:** `admin/lib/` — **20** `.ts` files.  
**Missing (requested but absent):** `notifications.ts`, `activity-log.ts`.

| File | Exports (summary) | npm | Express reuse | Layer |
|------|-------------------|-----|---------------|-------|
| `supabase.ts` | `supabase`, `supabaseAdmin` | `@supabase/supabase-js` | Needs env rename (`SUPABASE_URL`) | Backend |
| `server-auth.ts` | `SessionPayload`, `createSession`, `getServerSession`, `clearSession`, `refreshSessionCookie` | `jose` | **Rewrite** — replace `next/headers` cookies with Express cookies | Backend |
| `ai-gemini.ts` | `callGemini`, `askGemini`, `GeminiError`, types | none (fetch) | **Yes** | Backend |
| `mailer.ts` | `sendCredentialsEmail`, `sendLeaveStatusEmail`, `sendAttendanceReminderEmail`, `sendPasswordResetOtpEmail` | `nodemailer` | Needs `APP_URL` env | Backend |
| `otp.ts` | `generateOTP`, backoff helpers | none | **Yes** | Backend |
| `location.ts` | `haversineDistance` | none | **Yes** | Backend |
| `fake-db.ts` | JSON file CRUD | none | Yes (legacy only) | Backend / excluded |
| `resource-map.ts` | `RESOURCE_MAP`, `getDataFile`, `generateId` | none | Yes (legacy) | Backend / excluded |
| `auth.ts` | ROLE_*, saveAuth/getAuthUser, capability helpers | none | **No** (browser) | Frontend |
| `hrm-api.ts` | `fetchAllHrmData`, CRUD helpers, CSV export | none | **No** | Frontend |
| `utils.ts` | `cn` | `clsx`, `tailwind-merge` | No | Frontend |
| `helpers.ts` | `getEmployeeName`, `formatPKR` | none | Yes but unused on API | Frontend |
| `dashboard-data.ts` | chart/leave helpers | none | Yes but unused on API | Frontend |
| `page-titles.ts` | `PAGE_TITLES`, `getPageTitle` | none | No need | Frontend |
| `types.ts` | Role, AuthUser, entities | none | **Yes** | Shared |
| `permissions.ts` | defaults, `hasPermission`, `loadPermissions`, merge | none | Split: pure Yes; `loadPermissions` needs API URL | Shared |
| `company-scope.ts` | `getClientAuthHeaders`, `getCompanyScope` | none | Split client/server; retire spoofable server path | Shared |
| `document-templates.ts` | extract/render/map template helpers | none | **Yes** | Shared |
| `password-utils.ts` | temp password, validate, email HTML | none | Needs `APP_URL` | Shared |
| `db-mappers.ts` | map/toDb pairs, `daysBetween` | none | **Yes** | Shared |

### Deep notes — `server-auth.ts`

- Cookie name: `hrm_session`  
- Algorithm: HS256 via `jose` (`SignJWT` / `jwtVerify`)  
- Secret: `JWT_SECRET`  
- Duration: 7 days  
- Options today: `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`  
- Uses `cookies()` from `next/headers` and optional `NextRequest` — **must rewrite for Express**

### Deep notes — `company-scope.ts`

- Client: `getClientAuthHeaders()` → `x-user-role`, `x-user-id`, `x-company-id` from localStorage  
- Server: `getCompanyScope(request)` trusts those headers — **spoofable**  
- Migration: company scope must come from `SessionPayload`, not headers

---

## Part 3: Frontend Impact Analysis

**Frontend lives in:** `admin/` (pages + components).  
**Call pattern today:** relative `fetch("/api/...")` same-origin.

### Files with live `/api` strings (19)

1. `admin/lib/hrm-api.ts`  
2. `admin/lib/permissions.ts`  
3. `admin/app/login/page.tsx`  
4. `admin/app/forgot-password/page.tsx`  
5. `admin/app/forgot-password/verify/page.tsx`  
6. `admin/app/forgot-password/reset/page.tsx`  
7. `admin/components/auth/change-password-form.tsx`  
8. `admin/components/shared/app-sidebar.tsx`  
9. `admin/components/settings/office-profile-tab.tsx`  
10. `admin/app/(dashboard)/employees/page.tsx`  
11. `admin/app/(dashboard)/attendance/page.tsx`  
12. `admin/app/(dashboard)/attendance/bulk/page.tsx`  
13. `admin/app/(dashboard)/attendance/qr/page.tsx`  
14. `admin/app/(dashboard)/settings/roles/page.tsx`  
15. `admin/app/(dashboard)/reports/page.tsx`  
16. `admin/app/(dashboard)/ai-assistant/page.tsx`  
17. `admin/app/(dashboard)/ai-assistant/anomalies/page.tsx`  
18. `admin/app/(dashboard)/ai-assistant/documents/page.tsx`  
19. `admin/app/(dashboard)/ai-assistant/documents/templates/page.tsx`  

Indirect consumers of `hrm-api` (OK if base URL centralized): leaves, payroll, recruitment, performance, announcements pages + `hrm-data-provider`.

### Auth sent today

| Mechanism | Purpose |
|-----------|---------|
| `hrm_session` httpOnly JWT | Real API auth |
| `hrm_auth` non-httpOnly cookie (user id) | Middleware presence |
| `localStorage["hrm_auth"]` | UI + spoofable headers source |
| `x-user-role` / `x-company-id` / `x-user-id` | Header-scoped routes |
| `Authorization` | **Not used** |
| `credentials: "include"` | **Not set** (same-origin default) |

### Env for API base

Add: `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://localhost:4000` or production Railway URL).  
Today: none — only `NEXT_PUBLIC_APP_URL` for email links.

### CORS

Same-origin → cross-origin when calling Express directly. Required:

- `Access-Control-Allow-Origin: <admin origin>` (not `*`)  
- `Access-Control-Allow-Credentials: true`  
- Allow headers: `Content-Type`, `x-user-role`, `x-user-id`, `x-company-id` (until removed)  
- Client: `credentials: "include"` on every `apiFetch`

### Uploads / streaming / realtime

- Logo: base64 data URL in JSON to office-profile — raise Express JSON limit to **5mb**  
- No FormData multipart  
- No streaming AI responses  
- No WebSockets / SSE / notification polling  

### Shared lib used by both client and API

`types`, `permissions`, `company-scope`, `document-templates`, `password-utils` (+ `db-mappers` via client/mailer)

---

## Part 4: Node.js Project Structure

Target under empty [`backend/`](../../backend/):

```
backend/
  package.json
  tsconfig.json
  .env.example
  HANDOVER.md
  docs/
    migration-plan.md          # copy/symlink of this plan
  src/
    index.ts                   # listen
    app.ts                     # express app + middleware stack
    config/
      env.ts
    middleware/
      auth.ts                  # requireSession / optionalSession
      requireRole.ts
      companyScope.ts          # from session, not headers
      errorHandler.ts
      requestLogger.ts
    routes/
      index.ts
      auth.routes.ts
      employees.routes.ts
      attendance.routes.ts
      leaves.routes.ts
      payroll.routes.ts
      companies.routes.ts
      officeProfile.routes.ts
      rolesPermissions.routes.ts
      documentTemplates.routes.ts
      announcements.routes.ts
      jobs.routes.ts
      applicants.routes.ts
      performance.routes.ts
      ai.routes.ts
      scripts.routes.ts
    controllers/
      auth.controller.ts
      employees.controller.ts
      attendance.controller.ts
      leaves.controller.ts
      payroll.controller.ts
      companies.controller.ts
      officeProfile.controller.ts
      rolesPermissions.controller.ts
      documentTemplates.controller.ts
      announcements.controller.ts
      jobs.controller.ts
      applicants.controller.ts
      performance.controller.ts
      aiChat.controller.ts
      aiReports.controller.ts
      aiChurn.controller.ts
      aiAnomalies.controller.ts
      aiDocuments.controller.ts
      aiInterview.controller.ts
      scripts.controller.ts
    services/
      AuthService.ts
      EmployeeService.ts
      AttendanceService.ts
      LeaveService.ts
      PayrollService.ts
      CompanyService.ts
      OfficeProfileService.ts
      RolesPermissionsService.ts
      DocumentTemplateService.ts
      AnnouncementService.ts
      RecruitmentService.ts
      PerformanceService.ts
      AiService.ts
      EmailService.ts
      OtpService.ts
    lib/
      supabase.ts
      server-auth.ts           # Express rewrite
      ai-gemini.ts
      mailer.ts
      otp.ts
      location.ts
      password-utils.ts
      document-templates.ts
      permissions.ts           # pure helpers only
      types.ts
      db-mappers.ts
```

**Naming:** kebab/camel file names as above; HTTP paths stay `/api/...` identical to Next for minimal frontend churn.

---

## Part 5: Controllers Mapping Table

| Current Next.js Route | Node.js Controller | Express Route | Function(s) |
|-----------------------|--------------------|---------------|-------------|
| `auth/login` | `auth.controller.ts` | `POST /api/auth/login` | `login` |
| `auth/logout` | `auth.controller.ts` | `POST /api/auth/logout` | `logout` |
| `auth/change-password` | `auth.controller.ts` | `POST /api/auth/change-password` | `changePassword` |
| `auth/forgot-password` | `auth.controller.ts` | `POST /api/auth/forgot-password` | `forgotPassword` |
| `auth/verify-otp` | `auth.controller.ts` | `POST /api/auth/verify-otp` | `verifyOtp` |
| `auth/reset-password` | `auth.controller.ts` | `POST /api/auth/reset-password` | `resetPassword` |
| `auth/send-credentials` | `auth.controller.ts` | `POST /api/auth/send-credentials` | `sendCredentials` |
| `scripts/hash-passwords` | `scripts.controller.ts` | `GET /api/scripts/hash-passwords` | `hashPasswords` |
| `employees` | `employees.controller.ts` | `GET/POST /api/employees` | `list`, `create` |
| `employees/[id]` | `employees.controller.ts` | `GET/PUT/DELETE /api/employees/:id` | `getById`, `update`, `remove` |
| `companies` | `companies.controller.ts` | `GET/POST /api/companies` | `list`, `create` |
| `office-profile` | `officeProfile.controller.ts` | `GET/POST /api/office-profile` | `get`, `upsert` |
| `roles-permissions` | `rolesPermissions.controller.ts` | `GET/POST /api/roles-permissions` | `get`, `save` |
| `document-templates` | `documentTemplates.controller.ts` | `GET/POST /api/document-templates` | `list`, `create` |
| `document-templates/[id]` | `documentTemplates.controller.ts` | `GET/PUT/DELETE /api/document-templates/:id` | `getById`, `update`, `remove` |
| `leaves` | `leaves.controller.ts` | `GET/POST /api/leaves` | `list`, `create` |
| `leaves/[id]` | `leaves.controller.ts` | `PUT /api/leaves/:id` | `updateStatus` |
| `announcements` | `announcements.controller.ts` | `GET/POST /api/announcements` | `list`, `create` |
| `announcements/[id]` | `announcements.controller.ts` | `DELETE /api/announcements/:id` | `remove` |
| `attendance` | `attendance.controller.ts` | `GET/POST /api/attendance` | `list`, `create` |
| `attendance/[id]` | `attendance.controller.ts` | `PUT /api/attendance/:id` | `update` |
| `attendance/checkin` | `attendance.controller.ts` | `POST /api/attendance/checkin` | `checkin` |
| `attendance/checkout` | `attendance.controller.ts` | `POST /api/attendance/checkout` | `checkout` |
| `attendance/bulk` | `attendance.controller.ts` | `POST /api/attendance/bulk` | `bulk` |
| `attendance/reminder` | `attendance.controller.ts` | `POST /api/attendance/reminder` | `reminder` |
| `attendance/qr/generate` | `attendance.controller.ts` | `GET /api/attendance/qr/generate` | `qrGenerate` |
| `attendance/qr/scan` | `attendance.controller.ts` | `POST /api/attendance/qr/scan` | `qrScan` |
| `payroll` | `payroll.controller.ts` | `GET/POST /api/payroll` | `list`, `create` |
| `payroll/[id]` | `payroll.controller.ts` | `PUT /api/payroll/:id` | `update` |
| `performance` | `performance.controller.ts` | `GET/POST /api/performance` | `list`, `create` |
| `performance/[id]` | `performance.controller.ts` | `PUT /api/performance/:id` | `update` |
| `jobs` | `jobs.controller.ts` | `GET/POST /api/jobs` | `list`, `create` |
| `applicants` | `applicants.controller.ts` | `GET/POST /api/applicants` | `list`, `create` |
| `applicants/[id]` | `applicants.controller.ts` | `PUT /api/applicants/:id` | `update` |
| `ai-interview` | `aiInterview.controller.ts` | `POST /api/ai-interview` | `generateKit` (+ **requireSession**) |
| `ai-reports` | `aiReports.controller.ts` | `POST /api/ai-reports` | `generate` |
| `ai-churn` | `aiChurn.controller.ts` | `GET /api/ai-churn` | `analyze` |
| `ai-anomalies` | `aiAnomalies.controller.ts` | `GET /api/ai-anomalies` | `detect` |
| `ai-documents` | `aiDocuments.controller.ts` | `POST /api/ai-documents` | `generate` |
| `ai-chat` | `aiChat.controller.ts` | `POST /api/ai-chat` | `chat` |
| `ai-chat/history` | `aiChat.controller.ts` | `GET/POST/DELETE /api/ai-chat/history` | `listHistory`, `addMessage`, `clearHistory` |
| `hrm/**` | — | — | **EXCLUDED** |

---

## Part 6: Middleware Architecture

| Middleware | Purpose | Notes |
|------------|---------|-------|
| `helmet` | Security headers | Standard |
| `cors` | Cross-origin | `origin: FRONTEND_URL` (admin origin), `credentials: true` |
| `express.json({ limit: "5mb" })` | Body parse | Base64 logos |
| `cookie-parser` | Read/set cookies | Replaces `next/headers` |
| `express-rate-limit` | Abuse control | Stricter on auth/OTP/AI |
| `requestLogger` | Access logs | morgan or custom |
| `requireSession` | Auth gate | Verify `hrm_session` JWT |
| `requireRole([...])` | Role gate | Uses `session.role` |
| `companyScope` | Tenant filter | From `session.company_id`, not headers |
| `errorHandler` | Central errors | Last middleware |

**Replace:** Next `middleware.ts` continues to protect **admin pages only**. Express owns API auth.

---

## Part 7: Services Layer Design

| Service | Key methods | Depends on |
|---------|-------------|------------|
| `AuthService` | login, logout, changePassword, forgot/verify/reset, sendCredentials | supabase, bcrypt, jose, EmailService, OtpService |
| `EmployeeService` | list, create (+user+email), get, update, delete | supabase, EmailService, permissions |
| `AttendanceService` | list, create, update, checkin, checkout, bulk, reminder, qrGenerate, qrScan | supabase, location, qrcode, EmailService |
| `LeaveService` | list, create, updateStatus | supabase, EmailService |
| `PayrollService` | list, create, update | supabase |
| `CompanyService` | list, create | supabase |
| `OfficeProfileService` | get, upsert | supabase |
| `RolesPermissionsService` | getMerged, save | supabase, permissions defaults |
| `DocumentTemplateService` | CRUD + variable extract | supabase, document-templates lib |
| `AnnouncementService` | list, create, delete | supabase |
| `RecruitmentService` | jobs + applicants CRUD | supabase |
| `PerformanceService` | list, create, update | supabase |
| `AiService` | chat, reports, churn, anomalies, documents, interview | supabase, ai-gemini |
| `EmailService` | all mailer wrappers | nodemailer |
| `OtpService` | generate, backoff | otp lib + supabase |

---

## Part 8: Shared Code Strategy

| Destination | Files |
|-------------|-------|
| **Backend only** (`backend/src/lib`) | `supabase`, `server-auth` (rewritten), `ai-gemini`, `mailer`, `otp`, `location` |
| **Admin frontend only** | `auth`, `hrm-api`, `utils`, `helpers`, `dashboard-data`, `page-titles` |
| **Both (copy / dual-maintain initially)** | `types`, `document-templates`, `password-utils` (env tweak), `db-mappers`, pure `permissions` helpers |
| **Split then delete spoof path** | `company-scope`: keep client headers temporarily; server uses session |

Do **not** create a shared npm package in phase 1 — copy into `backend/src/lib` and keep admin copies. Revisit a `packages/shared` later if drift hurts.

---

## Part 9: Environment Variables Plan

### Backend `backend/.env`

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:3000
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
GEMINI_API_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
MIGRATION_SECRET=
COOKIE_SAME_SITE=lax
COOKIE_SECURE=false
```

Production cross-origin: `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true`, `FRONTEND_URL=https://admin.example.com`.

### Admin `admin/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
JWT_SECRET=   # only while Next middleware still verifies hrm_session locally
```

After full cutover: remove from admin: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GMAIL_*`, `MIGRATION_SECRET` (backend-only secrets).

---

## Part 10: Potential Issues & Solutions

### 1. CORS (same-origin → cross-origin)

- Set CORS as above; client `credentials: "include"`  
- Never use `Access-Control-Allow-Origin: *` with credentials  
- Preflight must allow custom `x-*` headers until removed  

### 2. Authentication / cookies

- Today: Express-equivalent must set `hrm_session` via `res.cookie`  
- Cross-site: `SameSite=None; Secure`  
- Page middleware on admin still needs session readable on admin domain — options:  
  a) Temporary Next rewrite proxy (same-origin cookies during migration)  
  b) Shared parent cookie domain  
  c) Keep middleware checking `hrm_auth` + call backend `/api/auth/me` (future)  
- Existing users may need one re-login if cookie domain/path/SameSite changes  

### 3. File uploads

- No multipart today  
- Base64 logo → `express.json({ limit: "5mb" })`  

### 4. Streaming

- None — keep JSON responses  

### 5. Next.js-only APIs to replace

| Next | Express |
|------|---------|
| `NextResponse.json(data, { status })` | `res.status(n).json(data)` |
| `NextRequest` | `Request` / Express `req` |
| `cookies()` / `request.cookies` | `cookie-parser` + `req.cookies` / `res.cookie` |
| `params` Promise/object | `req.params` |
| `searchParams` | `req.query` |
| `dynamic` / `revalidate` | N/A |

### 6. Supabase

- `@supabase/supabase-js` works identically in Node  
- Use service role only on backend; no browser-specific Auth used  

### 7. Rate limiting

- None today → `express-rate-limit` on `/api/auth/*`, OTP, AI  

### 8. TypeScript

- `tsx` for `npm run dev`; `tsc` → `dist/` for prod  
- `tsconfig` paths: `"@/*": ["src/*"]`  

### 9. Deployment

- Admin: Vercel  
- Backend: Railway (or Render)  
- Both have free tiers; set CORS + cookie flags for prod URLs  

### 10. WebSocket / realtime

- None today — no Socket.io work required  
- Header bell is decorative  

### 11. `ai-interview` security

- **Must** wrap with `requireSession` + HR/recruitment role check when porting  

---

## Part 11: Packages Required

### `backend/package.json` (target)

```json
{
  "name": "hrflow-backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.106.2",
    "bcryptjs": "^3.0.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.0.0",
    "jose": "^6.2.3",
    "morgan": "^1.10.0",
    "nodemailer": "^8.0.11",
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^3.0.0",
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20",
    "@types/nodemailer": "^8.0.0",
    "@types/qrcode": "^1.5.6",
    "tsx": "^4.19.0",
    "typescript": "^5"
  }
}
```

---

## Part 12: Step-by-Step Migration Sequence

| Step | Work | Est. |
|------|------|------|
| 1 | Scaffold `backend/` (packages, tsconfig, middleware, health route) | 0.5d |
| 2 | Port lib: supabase, server-auth→Express, mailer, otp, location, ai-gemini, types | 1d |
| 3 | Auth routes + companies + office-profile | 1d |
| 4 | Employees, leaves, payroll CRUD | 1–2d |
| 5 | Attendance CRUD → checkout → QR → bulk → **checkin last** | 2d |
| 6 | Header→session: announcements, jobs, applicants, performance | 1d |
| 7 | Document templates + AI (**add auth to ai-interview**); complex AI last | 2–3d |
| 8 | Admin `apiFetch` + `NEXT_PUBLIC_API_BASE_URL`; optional Next rewrite dual-run | 1d |
| 9 | CORS/cookie prod hardening; stop serving migrated routes from Next | 0.5d |
| 10 | Deploy Railway + Vercel; E2E smoke (login, checkin, leave approve, AI chat) | 1d |

**Dual-run:** Next rewrite `/api/:path*` → `http://localhost:4000/api/:path*` keeps same-origin cookies while Express serves logic.

**Switch frontend:** set `NEXT_PUBLIC_API_BASE_URL` and ensure all fetches use `apiFetch` with `credentials: "include"`.

**Test strategy:** Postman/HTTP collection per route family; login→cookie→CRUD; geo checkin with mock coords; AI with real Gemini key; regression on header-route pages after session migration.

---

## Part 13: Deployment Plan

| Layer | Platform | Notes |
|-------|----------|-------|
| Admin UI (+ temporary API) | Vercel | Root or `admin/` as project directory |
| Express API | Railway | `PORT` from env; health check `/api/health` |
| DB | Supabase | Unchanged |

**Prod checklist**

1. Same `JWT_SECRET` if you want seamless session continuity (still expect re-login if SameSite changes)  
2. `FRONTEND_URL` = exact Vercel admin origin  
3. `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true` for cross-origin  
4. Remove service-role / Gemini / Gmail from admin env once unused  
5. Do **not** deploy `/api/hrm/*` to Express  

---

## Appendix A — Monorepo layout (current)

```
hrm/
  admin/          # Next.js 14 HR admin (UI + current API) — THIS is the source of routes/lib
  backend/        # Express target (empty → scaffold per Part 4)
  frontend/       # (separate app slot — not in this migration scope)
  mobile/         # (separate app slot — not in this migration scope)
```

All path references in this document use `admin/` as the Next.js source of truth.

---

## Appendix B — Verification counts

| Metric | Value | Verified |
|--------|------:|----------|
| `admin/app/api/**/route.ts` | 44 | yes |
| `getServerSession` route files | 24 | yes (rg) |
| `getCompanyScope` route files | 11 | yes (rg) |
| Public | 6 | yes |
| Excluded hrm | 3 | yes |
| Sum | 44 | 24+11+6+3 |
| `admin/lib/*.ts` | 20 | yes |
| Frontend `/api` call-site files | 19 | yes |

---

*End of migration plan. Execute scaffolding only after this document is accepted as the runbook.*
