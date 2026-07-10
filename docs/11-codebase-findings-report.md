# HRFlow Codebase Findings Report

**Project:** HRFlow (package name `hrm`)  
**Stack:** Next.js 14.2.35 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL, Google Gemini 2.5 Flash, Nodemailer/Gmail  
**Generated:** 2026-07-11  
**Purpose:** Full handover analysis for a new developer. Paths are absolute from repo root `d:\project\hrm` (shown as relative paths below).

---

## 1. Project Structure Overview

### 1.1 Major folders

| Folder | Purpose |
|--------|---------|
| `app/` | Next.js App Router — pages, layouts, global CSS, all API routes |
| `app/(dashboard)/` | Authenticated shell (sidebar, header, providers) + all HR module pages |
| `app/api/` | REST API route handlers (43 `route.ts` files) |
| `components/ui/` | shadcn/ui primitives (23 files) |
| `components/shared/` | App shell: sidebar, header, auth/permissions/data providers, skeletons |
| `components/dashboard/` | Role-specific dashboards + Recharts charts |
| `components/auth/` | Change-password form |
| `components/settings/` | Office profile settings tab |
| `lib/` | Business logic: auth, permissions, Supabase, AI, mail, mappers, types |
| `hooks/` | `useApiCall`, `useIsMobile` |
| `data/` | Legacy JSON-file DB used by `lib/fake-db.ts` (10 JSON files) |
| `supabase/` | Canonical `schema.sql` + migrations `002`–`009` (no `001`) |
| `docs/` | Architecture, permissions, API map, manuals |
| `scripts/` | `hash-passwords.ts` one-time migration helper |
| `middleware.ts` | Cookie presence gate for protected page routes |

**Not present:** `public/` assets, `types/` folder, `contexts/` folder, `error.tsx`, `not-found.tsx`, PWA manifest, CI workflows, automated tests.

### 1.2 Pages / routes (App Router)

| File | URL |
|------|-----|
| `app/page.tsx` | `/` → redirects to `/login` |
| `app/login/page.tsx` | `/login` |
| `app/forgot-password/page.tsx` | `/forgot-password` |
| `app/forgot-password/verify/page.tsx` | `/forgot-password/verify` |
| `app/forgot-password/reset/page.tsx` | `/forgot-password/reset` |
| `app/(dashboard)/dashboard/page.tsx` | `/dashboard` |
| `app/(dashboard)/employees/page.tsx` | `/employees` |
| `app/(dashboard)/attendance/page.tsx` | `/attendance` |
| `app/(dashboard)/attendance/bulk/page.tsx` | `/attendance/bulk` |
| `app/(dashboard)/attendance/qr/page.tsx` | `/attendance/qr` |
| `app/(dashboard)/leaves/page.tsx` | `/leaves` |
| `app/(dashboard)/payroll/page.tsx` | `/payroll` |
| `app/(dashboard)/recruitment/page.tsx` | `/recruitment` |
| `app/(dashboard)/performance/page.tsx` | `/performance` |
| `app/(dashboard)/announcements/page.tsx` | `/announcements` |
| `app/(dashboard)/reports/page.tsx` | `/reports` |
| `app/(dashboard)/ai-assistant/page.tsx` | `/ai-assistant` |
| `app/(dashboard)/ai-assistant/anomalies/page.tsx` | `/ai-assistant/anomalies` |
| `app/(dashboard)/ai-assistant/documents/page.tsx` | `/ai-assistant/documents` |
| `app/(dashboard)/ai-assistant/documents/templates/page.tsx` | `/ai-assistant/documents/templates` |
| `app/(dashboard)/settings/page.tsx` | `/settings` |
| `app/(dashboard)/settings/change-password/page.tsx` | `/settings/change-password` |
| `app/(dashboard)/settings/roles/page.tsx` | `/settings/roles` |
| `app/(dashboard)/change-password/page.tsx` | `/change-password` (forced) |

**Layouts:** `app/layout.tsx` (root), `app/(dashboard)/layout.tsx` (AuthProvider + PermissionsProvider + HrmDataProvider + sidebar/header)  
**Loading:** `app/(dashboard)/loading.tsx` only  
**Error pages:** none (`error.tsx` / `not-found.tsx` missing)

### 1.3 Components (54 files)

**Shared (`components/shared/`):** `ai-assistant-tabs`, `app-header`, `app-sidebar`, `auth-guard`, `auth-provider`, `empty-state`, `hrm-data-provider`, `navigation-provider`, `nprogress-provider`, `page-loading-skeleton`, `page-transition`, `page-wrapper`, `permissions-provider`, `sidebar-nav-link`, `skeletons`, `stat-card`, `status-badge`, `toast-provider`

**Dashboard:** `admin-dashboard`, `employee-dashboard`, `team-lead-dashboard`, `attendance-calendar`, charts (`attendance-trend`, `department-headcount`, `hiring-attrition`, `leave-distribution`, `team-week-attendance`)

**Auth / settings / theme:** `change-password-form`, `office-profile-tab`, `theme-provider`, `theme-toggle`

**UI primitives:** alert-dialog, avatar, badge, button, card, chart, checkbox, dialog, dropdown-menu, input, label, progress, scroll-area, select, separator, sheet, sidebar, skeleton, switch, table, tabs, textarea, tooltip

### 1.4 Lib modules & main exports

| File | Key exports |
|------|-------------|
| `lib/ai-gemini.ts` | `callGemini`, `askGemini`, `GeminiError`, `GeminiContent` |
| `lib/auth.ts` | `ROLE_LABELS`, `ROLE_RANK`, `NAV_ITEMS`, `saveAuth`, `getAuthUser`, `clearAuth`, role helpers |
| `lib/company-scope.ts` | `getClientAuthHeaders`, `getCompanyScope`, `userCompanyPayload` |
| `lib/dashboard-data.ts` | Chart/leave helpers, `LEAVE_QUOTA`, `getTeamMembers` |
| `lib/db-mappers.ts` | `mapEmployee`, `employeeToDb`, attendance/leave/payroll/job/applicant/performance/announcement mappers |
| `lib/document-templates.ts` | `renderTemplate`, `extractTemplate`, `extractVariablesFromContent`, `DOCUMENT_TYPE_LABELS` |
| `lib/fake-db.ts` | JSON file CRUD (`readData`, `writeData`, …) — legacy |
| `lib/helpers.ts` | `getEmployeeName`, `formatPKR` |
| `lib/hrm-api.ts` | `fetchAllHrmData`, `createRecord`, `updateRecordApi`, `deleteRecordApi`, `exportToCsv` |
| `lib/location.ts` | `haversineDistance` |
| `lib/mailer.ts` | `sendCredentialsEmail`, `sendLeaveStatusEmail`, `sendAttendanceReminderEmail`, `sendPasswordResetOtpEmail` |
| `lib/otp.ts` | `generateOTP`, resend backoff helpers |
| `lib/page-titles.ts` | `PAGE_TITLES`, `getPageTitle` |
| `lib/password-utils.ts` | `generateTempPassword`, `validateNewPassword`, `buildCredentialsEmailHtml` |
| `lib/permissions.ts` | `DEFAULT_PERMISSIONS`, `hasPermission`, `loadPermissions`, `getModuleForPath` |
| `lib/resource-map.ts` | `RESOURCE_MAP`, `getDataFile`, `generateId` (legacy JSON API) |
| `lib/supabase.ts` | `supabase`, `supabaseAdmin` |
| `lib/types.ts` | `Role`, `AuthUser`, `Employee`, all domain types |
| `lib/utils.ts` | `cn` |

### 1.5 Dependencies (`package.json`)

**Runtime:** `next@14.2.35`, `react@18`, `@supabase/supabase-js`, `@anthropic-ai/sdk` (**unused**), `bcryptjs`, `nodemailer`, `next-themes`, `nprogress`, `qrcode`, `recharts`, `react-hot-toast`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@base-ui/react`, `shadcn`, `tw-animate-css`

**Dev:** TypeScript 5, ESLint, Tailwind 3.4, type packages for bcryptjs/nodemailer/nprogress/qrcode/react/node

**Scripts:** `dev`, `build`, `start`, `lint` only — no test/migrate scripts.

---

## 2. Database Schema (tables + columns found in code)

**Sources:** `supabase/schema.sql` + migrations `002`–`009`.  
**Client:** `lib/supabase.ts` — `supabase` (anon) and `supabaseAdmin` (service role). All primary APIs use `supabaseAdmin`. **No RLS policies** in repo SQL.

### 2.1 Tables (16)

| Table | Columns (as in schema) | Used in app? |
|-------|------------------------|--------------|
| `users` | `id`, `email`, `password`, `password_hash`, `role`, `company_id`, `is_temp_password`, `must_change_password`, `created_at` | Yes |
| `employees` | `id`, `user_id`, `full_name`, `cnic`, `phone`, `email`, `department`, `designation`, `joining_date`, `salary`, `status`, `company_id`, `created_at` | Yes |
| `companies` | `id`, `name`, `created_at` | Yes |
| `departments` | `id`, `name`, `head_id`, `created_at` | **Schema only — never queried** |
| `attendance` | `id`, `employee_id`, `date`, `check_in`, `check_out`, `check_in_time`, `check_out_time`, `marked_by`, `qr_token`, `latitude`, `longitude`, `distance_from_office`, `override_note`, `status`, `created_at` | Yes |
| `leaves` | `id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `approved_by`, `created_at` | Yes |
| `payroll` | `id`, `employee_id`, `month`, `year`, `basic_salary`, `deductions`, `bonuses`, `net_salary`, `status`, `created_at` | Yes |
| `jobs` | `id`, `title`, `department`, `description`, `requirements`, `status`, `company_id`, `created_at` | Yes |
| `applicants` | `id`, `job_id`, `full_name`, `email`, `phone`, `cv_url`, `stage`, `notes`, `created_at` | Yes |
| `performance` | `id`, `employee_id`, `reviewer_id`, `period`, `rating`, `goals`, `feedback`, `created_at` | Yes |
| `announcements` | `id`, `title`, `content`, `created_by`, `department`, `company_id`, `created_at` | Yes |
| `ai_chat_history` | `id`, `user_id`, `role` (`user`/`model`), `message`, `created_at` | Yes |
| `password_reset_otp` | `id`, `email`, `otp`, `attempt_count`, `next_allowed_at`, `expires_at`, `used`, `reset_token`, `reset_token_expires_at`, `created_at` | Yes |
| `office_profiles` | `id`, `company_id`, `name`, `logo_url`, `email`, `phone`, `address`, `check_in_time`, `check_out_time`, `late_threshold_minutes`, `grace_period_minutes`, `work_days`, `latitude`, `longitude`, `location_radius_meters`, `location_set`, `policies` (jsonb), `created_at` | Yes |
| `role_permissions` | `id`, `role`, `module`, `can_view`, `can_create`, `can_edit`, `can_delete` | Yes |
| `document_templates` | `id`, `type`, `name`, `content`, `variables` (jsonb), `company_id`, `created_by`, `created_at`, `updated_at` | Yes |

**Not in schema / not used:** `notifications`, `activity_logs`, overtime, salary advances, employee documents storage.

### 2.2 Foreign keys

```
users.company_id              → companies(id)
employees.user_id             → users(id)
employees.company_id          → companies(id)
departments.head_id           → employees(id)
attendance.employee_id        → employees(id)
leaves.employee_id            → employees(id)
leaves.approved_by            → employees(id)
payroll.employee_id           → employees(id)
jobs.company_id               → companies(id)
applicants.job_id             → jobs(id)
performance.employee_id       → employees(id)
performance.reviewer_id       → employees(id)
announcements.created_by      → employees(id)
announcements.company_id      → companies(id)
ai_chat_history.user_id       → users(id) ON DELETE CASCADE
office_profiles.company_id    → companies(id)
document_templates.company_id → companies(id)
document_templates.created_by → users(id)
```

### 2.3 Mapper quirks (`lib/db-mappers.ts`)

- `employeeCode` = `cnic` or `EMP-{id.slice(0,8)}` — no dedicated employee-code column
- `managerId` **always mapped to `null`** — breaks team-lead team views
- `location` hardcoded `"Karachi"`; `gender` hardcoded `"—"`
- Attendance DB statuses `half_day`/`wfh` remapped to `late`/`present` in UI type

### 2.4 Migrations

| File | Purpose |
|------|---------|
| `002_user_password_flags.sql` | `is_temp_password`, `must_change_password` |
| `003_attendance_enhancements.sql` | check-in/out timestamps, `marked_by`, `qr_token` |
| `004_ai_chat_history.sql` | chat history table |
| `005_password_reset_and_hashing.sql` | `password_hash`, `password_reset_otp` |
| `006_company_admin_office_profile.sql` | companies, multi-tenant columns, office profiles, `company_admin` |
| `007_location_attendance.sql` | lat/lng/distance/override on attendance |
| `008_role_permissions.sql` | `role_permissions` + seed |
| `009_document_templates.sql` | `document_templates` |

---

## 3. Authentication Implementation

### How it works

**Custom auth — not Supabase Auth.** Supabase is used only as Postgres via service-role client.

| Step | Implementation |
|------|----------------|
| Login | `POST /api/auth/login` → lookup `users` by email → `bcrypt.compare` against `password_hash` (fallback: plaintext `password`) → join `employees` for name/`employeeId`/`companyId` |
| Client storage | `saveAuth()` in `lib/auth.ts` writes full `AuthUser` JSON to **localStorage** key `hrm_auth` |
| Cookie | Client sets `hrm_auth=<user.id>` (30 days, `SameSite=Lax`) — **ID only, unsigned** |
| Context | `AuthProvider` (`components/shared/auth-provider.tsx`) reads localStorage; redirects to `/login` if missing; enforces forced password change |
| Middleware | `middleware.ts` — cookie **presence** only; does not validate against DB |
| Logout | `clearAuth()` removes localStorage + cookie → hard redirect `/login` |

### Password hashing

- **Yes — `bcryptjs`**, cost factor 10
- Used in: login, change-password, reset-password, employee create
- Legacy plaintext still accepted at login during migration
- One-time helper: `GET /api/scripts/hash-passwords` (**unauthenticated**)

### Forgot password / OTP

| Page | API |
|------|-----|
| `/forgot-password` | `POST /api/auth/forgot-password` — 6-digit OTP, 10 min expiry, email via Nodemailer |
| `/forgot-password/verify` | `POST /api/auth/verify-otp` — issues `reset_token` (15 min) |
| `/forgot-password/reset` | `POST /api/auth/reset-password` — bcrypt hash new password |

OTP helpers: `lib/otp.ts` — resend backoff 60s → 2m → 5m → 10m → 30m. OTP stored in plaintext in `password_reset_otp`.

### Session management

**No real server session / JWT.** APIs trust client headers from `getClientAuthHeaders()`:

- `x-user-role`
- `x-user-id`
- `x-company-id` (optional)

### Protected routes

Middleware protects: `/dashboard`, `/employees`, `/attendance`, `/leaves`, `/payroll`, `/recruitment`, `/performance`, `/announcements`, `/ai-assistant`, `/settings`, `/change-password`.

**Gap:** `/reports` is **not** in `PROTECTED_PREFIXES` (relies on `AuthProvider` only). All `/api/*` excluded from middleware.

### Register / signup

**None.** Users created only via `POST /api/employees` (admin creates account + temp password email).

### Demo logins (`app/login/page.tsx`)

`super@hr.com`, `hr@hr.com`, `lead@hr.com`, `emp@hr.com` — no quick-login for `company_admin`.

---

## 4. Roles & Permissions Deep Dive

### 4a. Roles Found & Hierarchy

**Five roles** (TypeScript union in `lib/types.ts` + DB CHECK):

| Role | Label | `ROLE_RANK` |
|------|-------|-------------|
| `super_admin` | Super Admin | 5 |
| `company_admin` | Company Admin | 4 |
| `hr_manager` | HR Manager | 3 |
| `team_lead` | Team Lead | 2 |
| `employee` | Employee | 1 |

**Hierarchy:** `super_admin > company_admin > hr_manager > team_lead > employee`  
**Note:** `ROLE_RANK` is **never used for authorization** — display/docs only.

**Defined in:** `lib/types.ts`, `lib/auth.ts`, `lib/permissions.ts` (`DEFAULT_PERMISSIONS`), `users.role` CHECK, `role_permissions.role` CHECK, migration `006`/`008`.

**Storage:** string role on `users.role` (not a Postgres enum type).

### 4b. Per-Role Access Matrix

Based on `DEFAULT_PERMISSIONS` in `lib/permissions.ts` + page/sidebar behavior. DB `role_permissions` can override (except `super_admin` always bypasses via `hasPermission`).

| Page/Feature | super_admin | company_admin | hr_manager | team_lead | employee |
| ------------ | ----------- | ------------- | ---------- | --------- | -------- |
| Dashboard | ✅ Admin | ✅ Admin | ✅ Admin | ✅ Team | ✅ Self |
| Employees | ✅ CRUD | ✅ CRUD | ✅ VCE (no delete default) | ✅ View | ❌ Hidden |
| Attendance (view/self) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attendance bulk | ✅ | ✅ (if edit perm) | ✅ | ✅ | ❌ |
| Attendance QR | if linked emp | if linked | if linked | if linked | ✅ Own |
| Leaves apply | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leaves approve | ✅ | ✅ | ✅ | ✅ | ❌ |
| Payroll | ✅ Manage | ✅ Manage | ✅ VC | ✅ View* | ✅ View* (no nav default for TL/emp in NAV_ITEMS; perms allow view) |
| Recruitment | ✅ | ✅ | ✅ | ✅ View | ❌ |
| Performance | ✅ | ✅ | ✅ | ✅ VCE | ✅ View |
| Announcements | ✅ | ✅ | ✅ | ✅ View | ✅ View |
| AI Assistant chat/docs | ✅ | ✅ | ✅ | ✅ | ✅ Create/view |
| AI Anomalies | ✅ (edit) | ✅ (edit) | ✅ (edit) | ✅ (edit) | ❌ |
| Reports / churn | ✅ | ✅ | ✅ | ✅ View | ❌ |
| Settings | ✅ | ✅ | ❌ default | ❌ | ❌ |
| Settings → Roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create company | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create company_admin user | ✅ | ❌ | ❌ | ❌ | ❌ |

\*Payroll: `NAV_ITEMS` historically limited payroll to admin/HR; current sidebar uses `can("payroll","view")` so team_lead/employee may see it if defaults apply. Employee page has own-filter branch.

**Data scope intent:**

| Role | Data scope |
|------|------------|
| super_admin | All companies (unscoped when no `x-company-id`) |
| company_admin / hr_manager | Company via `x-company-id` when `shouldScope` |
| team_lead | Team via `managerId` — **broken** because mapper sets `managerId: null` |
| employee | Own records filtered client-side by `employeeId` |

### 4c. How Role Checks Are Implemented

| Layer | Mechanism |
|-------|-----------|
| **Sidebar** | `NAV_ITEMS.filter` + `can(module, "view")` via `getModuleForPath` (`app-sidebar.tsx`). Sub-items: anomalies need `ai_assistant` edit; bulk needs `attendance` edit; QR needs `role === "employee" && employeeId` |
| **Pages** | `PermissionRouteGuard` in `permissions-provider.tsx` — module view check; `/settings/roles` hardcoded to super/company admin. Pages also use `can()` and legacy helpers (`canManageEmployees`, etc.) |
| **API** | Mostly `getCompanyScope(request)` reading spoofable headers. Explicit role checks only on: `POST /api/companies` (super_admin), `POST /api/roles-permissions` (super/company admin), employee create `company_admin` role branch, AI chat payroll visibility |
| **Centralized?** | Yes for **frontend**: `lib/permissions.ts` + `role_permissions` table. **Backend does not enforce** the permission matrix |
| **Dead code** | `canAccessRoute`, `getNavItemsForRole` — defined, never called |

### 4d. Company Admin & Multi-Company Status

| Question | Answer |
|----------|--------|
| Does `company_admin` exist? | **Yes** — role, permissions, settings/roles UI |
| Multi-company support? | **Partial** — `companies` table; Super Admin can create companies + company_admin users; company-scoped queries when header present |
| `company_id` tracked? | Yes on `users`, `employees`, `jobs`, `announcements`, `office_profiles`, `document_templates` |
| API filtering? | Via `getCompanyScope().shouldScope` — **only if** `x-company-id` present AND role ≠ `super_admin` |
| Per-company permissions? | **No** — `role_permissions` has no `company_id`; Company Admin edits are global |

### 4e. Gaps & Inconsistencies Found

1. **Critical:** APIs trust `x-user-role` / `x-company-id` without verifying cookie/session against DB.
2. Middleware excludes all `/api` routes; `/reports` missing from protected prefixes.
3. Missing `companyId` on non-super-admin → **unscoped** queries (`shouldScope = false`).
4. HR Manager: `NAV_ITEMS` / `canManageSettings()` include settings, but `DEFAULT_PERMISSIONS` gives **no settings** → PermissionRouteGuard blocks.
5. AI chat payroll gate: `super_admin || hr_manager` — **omits `company_admin`**.
6. `managerId` always null → team lead team filters empty.
7. Employee create API does not expose creating `hr_manager` / `team_lead` roles cleanly (mainly `employee` or `company_admin` for super_admin).
8. Many APIs have company scope but **zero** role/permission checks (leaves approve, bulk attendance, payroll, etc.).
9. Unauthenticated sensitive routes: hash-passwords, send-credentials, attendance reminder, QR scan/generate, several AI routes, legacy `/api/hrm`.

---

## 5. Features Status Table

| Feature | Status | File Path | Notes |
| ------- | ------ | --------- | ----- |
| Employee CRUD | ✅ Complete | `app/(dashboard)/employees/page.tsx`, `app/api/employees/*` | Create user + bcrypt temp password + credentials email |
| Employee ID format | ⚠️ Partial | `lib/db-mappers.ts` | Uses CNIC or `EMP-{uuid8}`; no dedicated code column |
| Probation tracking | ❌ Missing | — | Only AI doc form default `"3 months"` |
| Exit / offboarding | ❌ Missing | — | Status can be `inactive`; no clearance workflow |
| Bulk employee CSV import | ❌ Missing | — | Export CSV exists; no import |
| Attendance self check-in/out | ✅ Complete | `attendance/page.tsx`, `api/attendance/checkin`, `checkout` | Location-aware |
| Location-based check-in | ✅ Complete | `lib/location.ts`, `api/attendance/checkin`, office profile | Haversine + radius; first check-in can set office location |
| QR attendance | ⚠️ Partial | `attendance/qr/page.tsx`, `api/attendance/qr/*` | Generate UI exists; **no scanner page**; scan API unauthenticated |
| Bulk attendance marking | ✅ Complete | `attendance/bulk/page.tsx`, `api/attendance/bulk` | Writes `marked_by: "hr_override"`; no API role check |
| Leave apply / approve / reject | ✅ Complete | `leaves/page.tsx`, `api/leaves/*` | Email on status change |
| Leave email notifications | ✅ Complete | `lib/mailer.ts` `sendLeaveStatusEmail` | |
| Leave balance / policy DB | ⚠️ Partial | `lib/dashboard-data.ts` `LEAVE_QUOTA` | Hardcoded 20/10/7; AI prompts use 14/8/10 |
| Payroll create / mark paid | ✅ Complete | `payroll/page.tsx`, `api/payroll/*` | Manual basic + allowances + deductions |
| Tax calculation | ❌ Missing | — | Manual deductions only |
| Payslip generation | ⚠️ Partial | `payroll/page.tsx` | Dialog view only; no PDF/email |
| Recruitment job postings | ✅ Complete | `recruitment/page.tsx`, `api/jobs` | |
| Recruitment Kanban | ✅ Complete | `recruitment/page.tsx` | Stages: applied→screening→interview→offer→hired/rejected |
| Interview scheduling | ❌ Missing | — | Stage only; no calendar/scheduling |
| Offer letter (AI) | ✅ Complete | `ai-assistant/documents` | Via AI docs, not recruitment workflow |
| Hired → employee conversion | ❌ Missing | — | |
| Performance reviews | ⚠️ Partial | `performance/page.tsx`, `api/performance/*` | CRUD; no cycles/self-review; team filter broken |
| Announcements | ✅ Complete | `announcements/page.tsx`, `api/announcements/*` | Priority not persisted |
| AI Chat Assistant | ✅ Complete | `ai-assistant/page.tsx`, `api/ai-chat` | Intent + SQL RAG |
| AI Document Generator | ✅ Complete | `ai-assistant/documents`, `api/ai-documents` | 12+ doc types |
| Document templates (reuse) | ✅ Complete | `documents/templates`, `api/document-templates`, `lib/document-templates.ts` | `{{variables}}` |
| AI Anomaly detection | ✅ Complete | `ai-assistant/anomalies`, `api/ai-anomalies` | Rule engine + Gemini insights |
| Churn risk prediction | ✅ Complete | `reports/page.tsx`, `api/ai-churn` | Deterministic score + AI top 15 |
| Monthly HR report AI | ✅ Complete | `reports/page.tsx`, `api/ai-reports` | |
| Interview questions AI | ✅ Complete | `api/ai-interview` | Via documents page `interview_kit` |
| Policy document AI | ✅ Complete | `api/ai-documents` PROMPTS | leave/remote/code/etc. |
| In-app notifications bell | ❌ Missing | `app-header.tsx` | Bell UI + red dot only; no dropdown/data |
| Activity / audit logs | ❌ Missing | — | No table/UI |
| Office profile settings | ✅ Complete | `settings` + `office-profile-tab`, `api/office-profile` | |
| Roles & permissions screen | ✅ Complete | `settings/roles/page.tsx`, `api/roles-permissions` | |
| Dark / light theme | ✅ Complete | `theme-provider`, `theme-toggle`, `next-themes` | |
| Global search | ❌ Missing | — | Per-page search only (employees, anomalies) |
| Data export CSV | ⚠️ Partial | `lib/hrm-api.ts` `exportToCsv` | Employees + anomalies; no Excel |
| Forgot password + OTP | ✅ Complete | `forgot-password/*`, `api/auth/forgot|verify|reset` | |
| Password hashing (bcrypt) | ✅ Complete | `bcryptjs` across auth/employee APIs | |
| Company admin / multi-company | ⚠️ Partial | migrations 006, company-scope | Works with header gaps |
| Loading skeletons | ✅ Complete | `skeletons.tsx`, `page-loading-skeleton`, dashboard `loading.tsx` | |
| Mobile responsiveness | ⚠️ Partial | sidebar `useIsMobile`, responsive classes | Usable; not fully polished PWA |
| Error pages 404/500 | ❌ Missing | — | No `not-found.tsx` / `error.tsx` |
| Employee documents upload | ❌ Missing | — | `cv_url` on applicants only |
| Holidays calendar | ⚠️ Partial | settings localStorage | Browser-only; not shared DB |
| Overtime tracking | ❌ Missing | — | |
| Salary advances | ❌ Missing | — | |
| PWA support | ❌ Missing | — | No manifest/service worker |
| Attendance reminders email | ✅ Complete | `api/attendance/reminder` | Manual trigger; **no auth/company scope** |

---

## 6. API Routes Complete List

| Method | Route | Purpose | Role Restriction |
| ------ | ----- | ------- | ---------------- |
| POST | `/api/auth/login` | Authenticate | Public |
| POST | `/api/auth/forgot-password` | Send OTP | Public |
| POST | `/api/auth/verify-otp` | Verify OTP → reset token | Public |
| POST | `/api/auth/reset-password` | Set new password | Public (token) |
| POST | `/api/auth/change-password` | Change password | **None** — trusts body `userId` |
| POST | `/api/auth/send-credentials` | Resend credentials email | **None** |
| GET | `/api/scripts/hash-passwords` | Migrate plaintext → bcrypt | **None (critical)** |
| GET/POST | `/api/employees` | List / create employees | Company scope headers; create role branch for company_admin |
| GET/PUT/DELETE | `/api/employees/[id]` | Employee CRUD | Company scope only |
| GET/POST | `/api/companies` | List / create companies | POST: **super_admin only** |
| GET/POST | `/api/attendance` | List / create attendance | Company scope |
| PUT | `/api/attendance/[id]` | Update attendance | Company scope |
| POST | `/api/attendance/checkin` | Self check-in + geo | **No role check** |
| POST | `/api/attendance/checkout` | Self check-out | **No role check** |
| POST | `/api/attendance/bulk` | Bulk mark | Company scope; no role |
| GET | `/api/attendance/qr/generate` | QR token + image | **No auth** |
| POST | `/api/attendance/qr/scan` | Mark via QR | **No auth** |
| POST | `/api/attendance/reminder` | Email all active | **No auth / unscoped** |
| GET/POST | `/api/leaves` | List / apply | Company scope |
| PUT | `/api/leaves/[id]` | Approve/reject + email | Company scope; no role |
| GET/POST | `/api/payroll` | List / create | Company scope |
| PUT | `/api/payroll/[id]` | Update / mark paid | Company scope |
| GET/POST | `/api/jobs` | Jobs | Company scope |
| GET/POST | `/api/applicants` | Applicants | Company scope |
| PUT | `/api/applicants/[id]` | Update stage | Company scope |
| GET/POST | `/api/performance` | Reviews | Company scope |
| PUT | `/api/performance/[id]` | Update review | Company scope |
| GET/POST | `/api/announcements` | List / create | Company scope |
| DELETE | `/api/announcements/[id]` | Delete | Company scope |
| GET/POST | `/api/office-profile` | Office profile | Company scope; no role |
| GET/POST | `/api/roles-permissions` | Permission matrix | POST: super_admin \| company_admin |
| GET/POST | `/api/document-templates` | Template list/create | Company scope |
| GET/PUT/DELETE | `/api/document-templates/[id]` | Template CRUD | Company scope |
| POST | `/api/ai-chat` | HR chat + RAG | **No auth**; role from body |
| GET/POST/DELETE | `/api/ai-chat/history` | Chat history | **No ownership check** |
| POST | `/api/ai-documents` | Generate docs / templates | Company scope for templates |
| GET | `/api/ai-anomalies` | Anomaly detection | Company scope; no role |
| GET | `/api/ai-churn` | Churn risk | Company scope; no role |
| POST | `/api/ai-reports` | Monthly report | Company scope; no role |
| POST | `/api/ai-interview` | Interview kit JSON | **No auth** |
| GET | `/api/hrm` | Legacy aggregate JSON | **No auth** |
| GET/POST | `/api/hrm/[resource]` | Legacy JSON CRUD | **No auth** |
| PATCH/DELETE | `/api/hrm/[resource]/[id]` | Legacy JSON mutate | **No auth** |

---

## 7. Email System

**Configured:** Yes — Nodemailer + Gmail SMTP (`lib/mailer.ts`)  
**Env:** `GMAIL_USER`, `GMAIL_APP_PASSWORD`, optional `NEXT_PUBLIC_APP_URL` for links

| Function | Trigger | Subject |
|----------|---------|---------|
| `sendCredentialsEmail` | Employee create / `send-credentials` | Welcome + login credentials |
| `sendLeaveStatusEmail` | Leave approve/reject | Approved ✅ / Update ❌ |
| `sendAttendanceReminderEmail` | Manual reminder POST | Attendance reminder |
| `sendPasswordResetOtpEmail` | Forgot password | Password Reset OTP |

**Templates:** Inline HTML in `mailer.ts` + `buildCredentialsEmailHtml()` in `password-utils.ts`.  
**Not present:** Queue, retry, bounce handling, payslip email, announcement email, cron reminders.  
**Gap:** User-controlled values interpolated into HTML without confirmed escaping.

---

## 8. AI Integration

### 8a. AI Provider & Config

| Item | Value |
|------|-------|
| Provider | **Google Gemini only** |
| Model | `gemini-2.5-flash` |
| Init | `lib/ai-gemini.ts` → `callGemini()` / `askGemini()` |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` |
| API key | `GEMINI_API_KEY` (rejects missing / `"your_key_here"`) |
| Defaults | `temperature: 0.5`, `maxOutputTokens: 2048`, `timeoutMs: 45000` |
| Fallback provider | **None** (no Anthropic despite unused `@anthropic-ai/sdk` dep) |
| Streaming | **No** — full `generateContent` response |
| Rate limiting | **None** |

**Per-endpoint overrides:** chat 1024 tokens; anomalies/churn temp 0.4; documents 0.55/0.45; interview 0.55.

### 8b. AI Features Implementation Status

| Feature | Status | Page Path | API Route | Uses DB Data | Notes |
| ------- | ------ | --------- | --------- | ------------ | ----- |
| AI Chat Assistant | ✅ | `ai-assistant/page.tsx` | `POST /api/ai-chat` | Yes | Keyword intent + SQL |
| RAG (DB context) | ✅ | — | `ai-chat` `fetchRelevantData` | Yes | Not vector RAG |
| Intent detection | ✅ | — | `detectIntent()` in `ai-chat/route.ts` | — | Regex/keywords EN + Roman Urdu |
| Conversation history (in-request) | ✅ | — | Last **10** turns to Gemini | — | |
| Chat history persistence | ✅ | Chat page | `/api/ai-chat/history` | `ai_chat_history` | Last 50 stored; no ownership check |
| Document generator | ✅ | `ai-assistant/documents` | `POST /api/ai-documents` | Templates table | 12+ types |
| Document templates reuse | ✅ | `documents/templates` | `/api/document-templates`, ai-documents cache | Yes | Skip AI if template exists |
| Variable substitution | ✅ | `lib/document-templates.ts` | — | — | `{{employee_name}}` etc. |
| Template editor UI | ✅ | `documents/templates/page.tsx` | — | — | Edit/preview/regenerate |
| PDF download | ⚠️ | documents pages | — | — | `window.print()` labeled as PDF |
| Attendance anomalies | ✅ | `ai-assistant/anomalies` | `GET /api/ai-anomalies` | Yes | Rules + Gemini insights; action buttons unwired |
| Churn prediction | ✅ | `reports/page.tsx` | `GET /api/ai-churn` | Yes | AI enriches top 15 |
| Monthly HR report | ✅ | `reports/page.tsx` | `POST /api/ai-reports` | Yes | Print via `window.print()` |
| Interview questions | ✅ | documents (`interview_kit`) | `POST /api/ai-interview` | No | JSON kit |
| Policy documents | ✅ | documents | `ai-documents` PROMPTS | Form fields only | Not from `office_profiles.policies` |
| Suggestion chips | ✅ | Chat UI | `buildSuggestions()` | — | Hardcoded follow-ups |
| Vector embeddings / semantic RAG | ❌ | — | — | — | Not implemented |

### 8c. System Prompts Found

**Chat** (`app/api/ai-chat/route.ts`): Pakistani software company HR assistant; role/name/date; answer only from `COMPANY_DATA` JSON; match language (EN/Urdu/Roman Urdu); PKR; Pakistani labour law (EOBI, PESSI); ~250 word limit; payroll restriction awareness.

**Documents** (`SYSTEM_BASE` in `ai-documents/route.ts`): Senior HR at Pakistani software company HRFlow; formal letter format; Shops & Establishments / Labour Act / EOBI / PESSI; PKR; plain text UPPERCASE headings.

**Document types with dedicated `PROMPTS` builders:** `offer_letter`, `appointment_letter`, `warning_letter`, `termination_letter`, `experience_letter`, `job_description`, `performance_review_template`, `hr_policy`, `leave_policy`, `remote_work_policy`, `code_of_conduct`, `performance_review_policy`, `salary_increment_policy`.

**Anomalies / Churn / Reports / Interview:** JSON or structured plain-text prompts with Pakistani workplace context (see exploration; all hardcoded in respective route files).

**Prompts are hardcoded** in route files — not DB-configurable. Pakistani context is strong (PKR, labour law, Urdu language matching).

### 8d. RAG Implementation Analysis

| Aspect | Detail |
|--------|--------|
| Pattern | Keyword `detectIntent(message)` → `findEmployeeMention` → `fetchRelevantData` → inject `JSON.stringify(dbData)` into system prompt |
| Intent flags | employee, leave, attendance, payroll, recruitment, performance, announcement, aggregate + timeframe today/yesterday/week/month/all |
| Tables | employees, leaves, attendance, payroll (gated), jobs, applicants, performance, announcements |
| Employee name match | Full-name substring then token match (≥3 chars); loads all active employees |
| Token risk | Pretty-printed JSON of up to ~25–30 rows per section; chat capped at 1024 output tokens; large company lists could bloat prompt |
| Slow queries | Full employee scan for name matching; unscoped multi-company data in chat |
| **Critical gap** | `ai-chat` does **not** use `getCompanyScope()` — can leak cross-company data |

### 8e. Document Template System Status

| Capability | Status |
|------------|--------|
| `document_templates` table | ✅ Used |
| Check template before AI | ✅ `ai-documents` returns `source: "template"` if found |
| Variable extraction | ✅ `extractVariablesFromContent`, `extractTemplate`, `renderTemplate` |
| Template editor UI | ✅ `/ai-assistant/documents/templates` |
| AI regenerate template | ✅ Keeps `{{placeholders}}` |
| Company scoping | ✅ Via `company_id` + headers |
| True PDF library | ❌ Browser print only |

### 8f. AI Cost & Performance Concerns

- Typical session: 1 chat call per message + optional history writes; document gen 0–1 Gemini calls (0 if template hit); anomalies 1 batched insight call; churn 1 call for top 15; reports 1 call.
- **Caching:** document templates only; no response cache for chat/reports.
- **No streaming** — UX waits for full response (45s timeout).
- **No rate limiting** on AI endpoints — cost/abuse risk.
- Anomalies capped at 30 candidates; churn AI limited to top 15 (good cost control).
- Unused `@anthropic-ai/sdk` adds install weight with no benefit.

### 8g. Missing AI Features

- Vector/semantic RAG
- Streaming responses
- Server-side auth + company scoping on chat
- Wiring anomaly action buttons (Schedule / Warning / Recognise)
- Pulling live `office_profiles.policies` into policy doc generation
- Configurable prompts / admin prompt editor
- Scheduled monthly report email
- Anthropic fallback (dependency present but unused)

---

## 9. Environment Variables Required

| Variable | Required? | Used in |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | `lib/supabase.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Required** | `lib/supabase.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** (all admin APIs) | `lib/supabase.ts` |
| `GEMINI_API_KEY` | **Required** for AI | `lib/ai-gemini.ts` |
| `GMAIL_USER` | Optional (emails skip/fail gracefully if missing) | `lib/mailer.ts` |
| `GMAIL_APP_PASSWORD` | Optional with GMAIL_USER | `lib/mailer.ts` |
| `NEXT_PUBLIC_APP_URL` | Optional (login/attendance links in emails) | `mailer.ts`, `password-utils.ts` |

No `.env.example` in repo.

---

## 10. Missing & Incomplete Features (Prioritized)

### P0 — Security (fix before production)

1. Server-side session verification on all APIs (do not trust `x-user-role` headers alone)
2. Protect or remove `GET /api/scripts/hash-passwords`, unauthenticated reminder/credentials/QR/AI history routes
3. Company-scope AI chat queries
4. Add Supabase RLS or equivalent server authz
5. Hash OTPs at rest; lock change-password to authenticated user only

### P1 — Core product gaps

1. Fix `managerId` mapping (add DB column or relation) — team lead features broken
2. Enforce `role_permissions` on API mutations
3. Per-company `role_permissions` (add `company_id`)
4. `/reports` in middleware protected list
5. Custom `error.tsx` / `not-found.tsx`
6. Real notifications system (bell is decorative)
7. QR scanner page + authenticated QR APIs

### P2 — Feature completeness

1. Tax/EOBI payroll engine; payslip PDF + email
2. Interview scheduling; applicant create UI; hire→employee
3. Probation / offboarding workflows
4. Bulk CSV employee import
5. Shared holidays/departments in DB (not localStorage)
6. Employee document uploads
7. Overtime / salary advances
8. Audit / activity logs
9. Global search
10. PWA

### P3 — Polish / ops

1. Replace README with HRFlow setup guide
2. Remove unused `@anthropic-ai/sdk` or implement fallback
3. Remove or gate legacy `/api/hrm` JSON API
4. Automated tests + CI
5. Align leave quotas (UI 20/10/7 vs AI 14/8/10)
6. Cron for attendance reminders

---

## 11. Bugs & Issues Found

| Issue | Location | Severity |
|-------|----------|----------|
| APIs trust spoofable role/company headers | `lib/company-scope.ts` + most routes | Critical |
| `managerId` always `null` | `lib/db-mappers.ts` `mapEmployee` | High — breaks team lead |
| AI chat not company-scoped | `app/api/ai-chat/route.ts` | Critical (data leak) |
| `company_admin` excluded from AI payroll visibility | `ai-chat/route.ts` `canSeePayroll` | Medium |
| `/reports` not in middleware protect list | `middleware.ts` | Medium |
| Notification bell non-functional | `app-header.tsx` | Low |
| Attendance reminder emails all companies, no auth | `api/attendance/reminder` | Critical |
| Change-password accepts arbitrary `userId` | `api/auth/change-password` | Critical |
| Hash-passwords endpoint public | `api/scripts/hash-passwords` | Critical |
| Settings departments/holidays localStorage-only | `settings/page.tsx` | Medium — not multi-user |
| Leave quota inconsistency UI vs AI | `dashboard-data.ts` vs AI prompts | Low |
| Timezone mix Asia/Karachi vs UTC on attendance paths | checkin vs checkout/QR | Medium |
| First employee check-in can set office geo | `api/attendance/checkin` | Medium |
| Anomaly action buttons unwired | `ai-assistant/anomalies/page.tsx` | Low |
| Announcement priority not persisted | mapper/schema | Low |
| Employee location/gender placeholders | `db-mappers.ts` | Low |
| Duplicate data loading possible | `HrmDataProvider` + page fetches | Medium — review for double calls |
| No TypeScript DB types generated | — | Medium — schema drift risk |
| Login plaintext password fallback | `api/auth/login` | Medium (migration leftover) |
| `departments` table unused | schema | Low |
| PDF = `window.print()` | documents/reports | Low — not real PDF |

### Code quality observations

- **TypeScript:** Domain types in `lib/types.ts` are solid; mappers use `any` (`eslint-disable`).
- **Loading states:** Generally present (skeletons, nprogress, toast errors).
- **Error handling:** API routes usually return JSON `{ error }`; AI has deterministic fallbacks for anomalies/churn.
- **Duplication:** Legacy JSON API (`/api/hrm` + `data/*.json`) parallel to Supabase — primary UI uses Supabase via `hrm-data-provider` / module APIs.
- **No TODOs/FIXMEs** in app TS/TSX (gaps documented in `docs/10-missing-or-unclear-items.md` instead).
- **Frontend RBAC is mature**; **backend RBAC is not** — largest architectural risk for handover.

---

## Appendix A — Quick file index for new developers

| Concern | Start here |
|---------|------------|
| Auth | `lib/auth.ts`, `components/shared/auth-provider.tsx`, `middleware.ts`, `app/api/auth/*` |
| Permissions | `lib/permissions.ts`, `components/shared/permissions-provider.tsx`, `settings/roles`, `008_role_permissions.sql` |
| Company tenancy | `lib/company-scope.ts`, migration `006` |
| Schema | `supabase/schema.sql` |
| AI | `lib/ai-gemini.ts`, `app/api/ai-*` |
| Email | `lib/mailer.ts` |
| Known gaps | `docs/10-missing-or-unclear-items.md`, this report |

## Appendix B — Dependency note

`@anthropic-ai/sdk` is installed but **never imported**. Safe to remove unless planning a multi-provider fallback.

---

*End of HRFlow Codebase Findings Report.*
