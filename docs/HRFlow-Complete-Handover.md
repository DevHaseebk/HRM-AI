# HRFlow — Complete Developer Handover Document

**Project:** HRFlow — HR Management System for Pakistani Software Houses  
**Handover Date:** July 11, 2026  
**Prepared by:** Muhammad Haseeb Khan (Senior Frontend Engineer & Team Lead, Digitli)  
**For:** New Developer (Claude Code)  
**Repo location:** `d:\project\hrm`

---

## 1. PROJECT OVERVIEW

### What is HRFlow?

HRFlow is a full-stack HR Management System built specifically for small Pakistani software houses where the owner handles all HR work manually via WhatsApp and Excel. It digitizes and automates all core HR operations in one platform.

### Business Problem
- 90% of small Pakistani software houses have no dedicated HR person
- Owner manages attendance, leaves, payroll via WhatsApp groups and Excel sheets
- No structured hiring pipeline, no payslips, no formal leave approval
- HRFlow replaces all of this with a role-based, multi-company platform

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14.2.35 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3.4, shadcn/ui, lucide-react |
| Database | Supabase (PostgreSQL) — custom auth, NOT Supabase Auth |
| AI | Google Gemini 2.5 Flash (`gemini-2.5-flash`) |
| Email | Nodemailer + Gmail SMTP |
| Charts | Recharts |
| Animations | nprogress, tw-animate-css |
| QR Code | `qrcode` library |
| Password | `bcryptjs` (cost factor 10) |
| Theme | `next-themes` (dark/light) |
| Toasts | `react-hot-toast` |

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://idahwvrlgroixlhunnjf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
GEMINI_API_KEY=<gemini api key>
GMAIL_USER=<gmail address>
GMAIL_APP_PASSWORD=<16 digit app password>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note:** No `.env.example` file exists — create one.

---

## 2. ROLE SYSTEM

### 5 Roles (Hierarchy)

```
super_admin (5)
    └── company_admin (4)
            └── hr_manager (3)
                    └── team_lead (2)
                            └── employee (1)
```

| Role | Label | ROLE_RANK | Purpose |
|------|-------|-----------|---------|
| `super_admin` | Super Admin | 5 | Full system access, manages all companies |
| `company_admin` | Company Admin | 4 | Full access to their company only |
| `hr_manager` | HR Manager | 3 | All HR operations, cannot delete employees |
| `team_lead` | Team Lead | 2 | Manages their team's attendance/leaves |
| `employee` | Employee | 1 | Self-service only |

**Defined in:** `lib/types.ts`, `lib/auth.ts`, `lib/permissions.ts`, `users.role` DB CHECK

### Demo Login Accounts

| Email | Password | Role |
|-------|----------|------|
| super@hr.com | pass123 | super_admin |
| hr@hr.com | pass123 | hr_manager |
| lead@hr.com | pass123 | team_lead |
| emp@hr.com | pass123 | employee |

**Missing:** No `company_admin` demo account exists yet.

### Per-Role Access Matrix

| Page/Feature | super_admin | company_admin | hr_manager | team_lead | employee |
|---|---|---|---|---|---|
| Dashboard | ✅ Admin view | ✅ Admin view | ✅ Admin view | ✅ Team view | ✅ Self view |
| Employees | ✅ CRUD | ✅ CRUD | ✅ View+Create+Edit | ✅ View only | ❌ Hidden |
| Attendance | ✅ All | ✅ All | ✅ All | ✅ Team | ✅ Own only |
| Attendance Bulk Mark | ✅ | ✅ | ✅ | ✅ | ❌ |
| Attendance QR | ✅ | ✅ | ✅ | ✅ | ✅ Own |
| Leaves | ✅ All+Approve | ✅ All+Approve | ✅ All+Approve | ✅ Team+Approve | ✅ Apply only |
| Payroll | ✅ Manage | ✅ Manage | ✅ View+Create | ✅ View* | ✅ View own* |
| Recruitment | ✅ | ✅ | ✅ | ✅ View | ❌ |
| Performance | ✅ | ✅ | ✅ | ✅ VCE | ✅ View own |
| Announcements | ✅ | ✅ | ✅ | ✅ View | ✅ View |
| AI Assistant | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Anomalies | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ✅ | ✅ View | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Settings → Roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Company | ✅ | ❌ | ❌ | ❌ | ❌ |

### How Role Checks Work

**Frontend (solid):**
- `lib/permissions.ts` → `hasPermission(role, module, action)` 
- `PermissionsProvider` → `can(module, action)` hook in all pages
- `PermissionRouteGuard` blocks page if no view permission
- Sidebar filters nav items via `can()` check
- `role_permissions` table in DB overrides defaults

**Backend (CRITICAL GAP — not enforced):**
- APIs read `x-user-role` and `x-company-id` headers
- These headers come from `localStorage` via `getClientAuthHeaders()`
- **Anyone can spoof these headers** — no server-side session validation
- Only 3 routes actually check role: `POST /api/companies`, `POST /api/roles-permissions`, employee create for `company_admin` branch

---

## 3. AUTHENTICATION SYSTEM

### How Login Works

1. User submits email + password to `POST /api/auth/login`
2. API looks up user in `users` table
3. `bcrypt.compare(input, user.password_hash)` — fallback to plaintext `password` (migration leftover)
4. On success: returns full user object
5. Client: `saveAuth()` in `lib/auth.ts` writes to `localStorage` key `hrm_auth`
6. Client: sets cookie `hrm_auth=<user.id>` (30 days, SameSite=Lax) — **unsigned, ID only**

### Middleware (`middleware.ts`)

- Checks cookie **presence only** — does NOT validate against DB
- Protected paths: `/dashboard`, `/employees`, `/attendance`, `/leaves`, `/payroll`, `/recruitment`, `/performance`, `/announcements`, `/ai-assistant`, `/settings`, `/change-password`
- **NOT protected:** `/reports` (relies on `AuthProvider` only), all `/api/*`

### Forgot Password Flow

```
/forgot-password → POST /api/auth/forgot-password → 6-digit OTP email
     ↓
/forgot-password/verify → POST /api/auth/verify-otp → reset_token (15 min)
     ↓
/forgot-password/reset → POST /api/auth/reset-password → bcrypt new password
```

**OTP resend backoff:** 1min → 2min → 5min → 10min → 30min  
**OTP stored:** plaintext in `password_reset_otp` table (should be hashed)

### Forced Password Change

- New employees get temp password via email
- `must_change_password = true` in `users` table
- `AuthProvider` redirects to `/change-password` (forced, no sidebar)
- After change: `must_change_password = false`, redirect to `/dashboard`
- Voluntary change: `Settings → Change Password`

### Session Management

**No real session/JWT.** Token = unsigned cookie with user ID only. No expiry refresh, no server-side invalidation. This is a known P0 security gap.

---

## 4. DATABASE SCHEMA

### 16 Tables

```sql
users               -- Auth accounts (custom, not Supabase Auth)
employees           -- Employee profiles linked to users
companies           -- Multi-tenant companies
departments         -- Defined but NEVER QUERIED in app
attendance          -- Daily check-in/out records
leaves              -- Leave requests + approvals
payroll             -- Monthly salary records
jobs                -- Job postings
applicants          -- Job applicants (Kanban)
performance         -- Performance reviews
announcements       -- Company/dept announcements
ai_chat_history     -- Per-user AI chat messages
password_reset_otp  -- OTP records for forgot password
office_profiles     -- Company settings, work hours, location
role_permissions    -- Customizable RBAC matrix
document_templates  -- AI-generated reusable letter templates
```

### Tables NOT in Schema (need to be created)

```sql
notifications       -- In-app notification bell (❌ not implemented)
activity_logs       -- Audit trail (❌ not implemented)
overtime            -- Overtime tracking (❌ not implemented)
salary_advances     -- Salary advance requests (❌ not implemented)
employee_documents  -- File uploads per employee (❌ not implemented)
holidays            -- Shared holidays calendar (❌ not implemented)
interview_schedules -- Scheduled interviews (❌ not implemented)
```

### Key Column Notes

- `employees.employee_id`: Uses CNIC or `EMP-{uuid8}` — no dedicated auto-increment code column
- `employees.manager_id`: **Does not exist in DB** — `mapEmployee()` always returns `managerId: null` → team_lead features broken
- `attendance.status`: DB values `half_day`/`wfh` remapped to `late`/`present` in UI mapper (inconsistency)
- `leave_quota`: Hardcoded in `lib/dashboard-data.ts` as 20/10/7 but AI prompts use 14/8/10

### Foreign Keys

```
users.company_id              → companies(id)
employees.user_id             → users(id)
employees.company_id          → companies(id)
attendance.employee_id        → employees(id)
leaves.employee_id            → employees(id)
leaves.approved_by            → employees(id)
payroll.employee_id           → employees(id)
jobs.company_id               → companies(id)
applicants.job_id             → jobs(id)
performance.employee_id       → employees(id)
announcements.company_id      → companies(id)
ai_chat_history.user_id       → users(id) ON DELETE CASCADE
office_profiles.company_id    → companies(id)
document_templates.company_id → companies(id)
```

### Migrations Applied

| File | What it adds |
|------|-------------|
| `002_user_password_flags.sql` | `is_temp_password`, `must_change_password` |
| `003_attendance_enhancements.sql` | check-in/out timestamps, `marked_by`, `qr_token` |
| `004_ai_chat_history.sql` | `ai_chat_history` table |
| `005_password_reset_and_hashing.sql` | `password_hash`, `password_reset_otp` |
| `006_company_admin_office_profile.sql` | companies, multi-tenant, office profiles, `company_admin` role |
| `007_location_attendance.sql` | lat/lng/distance/override on attendance |
| `008_role_permissions.sql` | `role_permissions` table + seed |
| `009_document_templates.sql` | `document_templates` table |

**No RLS policies** in Supabase — all access via service role key.

---

## 5. FEATURES STATUS

### ✅ Fully Implemented

| Feature | Key Files |
|---------|-----------|
| Employee CRUD | `employees/page.tsx`, `api/employees/*` |
| Employee create → user account + temp password email | `api/employees/route.ts` |
| Attendance self check-in/out | `attendance/page.tsx`, `api/attendance/checkin`, `checkout` |
| Location-based check-in (Haversine + 1km radius) | `lib/location.ts`, `api/attendance/checkin` |
| Bulk attendance marking | `attendance/bulk/page.tsx`, `api/attendance/bulk` |
| Leave apply / approve / reject | `leaves/page.tsx`, `api/leaves/*` |
| Email on leave status change | `lib/mailer.ts` `sendLeaveStatusEmail` |
| Payroll create / mark paid | `payroll/page.tsx`, `api/payroll/*` |
| Recruitment job postings | `recruitment/page.tsx`, `api/jobs` |
| Recruitment Kanban (6 stages) | `recruitment/page.tsx` |
| Performance reviews CRUD | `performance/page.tsx`, `api/performance/*` |
| Announcements | `announcements/page.tsx`, `api/announcements/*` |
| AI Chat (intent + SQL RAG) | `ai-assistant/page.tsx`, `api/ai-chat` |
| AI Document Generator (12+ types) | `ai-assistant/documents`, `api/ai-documents` |
| AI Document Templates (generate once, reuse) | `documents/templates`, `api/document-templates` |
| AI Anomaly Detection | `ai-assistant/anomalies`, `api/ai-anomalies` |
| AI Churn Risk Prediction | `reports/page.tsx`, `api/ai-churn` |
| AI Monthly HR Report | `reports/page.tsx`, `api/ai-reports` |
| AI Interview Questions | `api/ai-interview` |
| Office Profile settings (hours, location, policies) | `settings` + `office-profile-tab` |
| Roles & Permissions screen | `settings/roles/page.tsx`, `api/roles-permissions` |
| Dark/Light theme | `theme-provider.tsx`, `theme-toggle.tsx` |
| Forgot Password + OTP flow | `forgot-password/*`, `api/auth/forgot|verify|reset` |
| Password hashing (bcrypt) | `lib/password-utils.ts` |
| Loading skeletons | `components/shared/skeletons.tsx` |
| Page transitions (nprogress) | `nprogress-provider.tsx` |
| CSV export | `lib/hrm-api.ts` `exportToCsv` |

### ⚠️ Partially Implemented

| Feature | Gap | Files |
|---------|-----|-------|
| QR Attendance | Generate UI works; no scanner page; APIs unauthenticated | `attendance/qr/page.tsx`, `api/attendance/qr/*` |
| Employee ID format | Uses CNIC/uuid8 — no auto EMP-001 sequence | `lib/db-mappers.ts` |
| Leave balance | Hardcoded quota, inconsistent between UI and AI | `lib/dashboard-data.ts` |
| Payslip | Dialog view only — no PDF/email | `payroll/page.tsx` |
| Company Admin / Multi-company | Works with correct headers; header spoofing is gap | `lib/company-scope.ts` |
| Holidays calendar | localStorage only — not shared across users | `settings/page.tsx` |
| Team Lead team view | `managerId` always null — team filters empty | `lib/db-mappers.ts` |
| Mobile responsiveness | Usable but not fully polished | Sidebar `useIsMobile` |

### ❌ Not Implemented (Remaining Work)

| Feature | Priority | Notes |
|---------|----------|-------|
| **Notifications system (in-app)** | P1 | Bell UI exists but is decorative only |
| **Activity / Audit logs** | P1 | No table, no UI, no logging |
| **API-level role enforcement** | P0 | Critical security gap |
| **Server-side session** | P0 | Currently trusts spoofable headers |
| **Fix `/reports` middleware** | P1 | Not in protected paths |
| **Error pages (404, 500)** | P1 | `error.tsx` / `not-found.tsx` missing |
| **Fix `managerId` (team_lead broken)** | P1 | Add `manager_id` column to employees |
| **Tax calculation (Pakistani slabs)** | P2 | Manual deductions only |
| **Payslip PDF + email** | P2 | Only dialog view |
| **Interview scheduling** | P2 | Stage exists, no calendar/booking |
| **Hired → Employee conversion** | P2 | No flow from recruitment to employee |
| **Probation tracking** | P2 | No probation_end_date, no reminders |
| **Exit / offboarding workflow** | P2 | No clearance checklist, no exit form |
| **Employee documents upload** | P2 | cv_url only on applicants |
| **Overtime tracking** | P2 | No table, no UI |
| **Salary advances** | P2 | No table, no UI |
| **Bulk CSV employee import** | P2 | Export exists, no import |
| **Global search** | P2 | Per-page search only |
| **Holidays DB (shared)** | P2 | localStorage is not multi-user |
| **AI chat company scoping** | P0 | Cross-tenant data leak risk |
| **Anomaly action buttons** | P3 | Buttons rendered but not wired |
| **Real PDF generation** | P3 | `window.print()` only |
| **PWA support** | P3 | No manifest/service worker |
| **Per-company role permissions** | P2 | `role_permissions` has no `company_id` |
| **Remove unused Anthropic SDK** | P3 | Installed, never imported |
| **Remove/gate legacy `/api/hrm`** | P3 | Unauthenticated JSON API |

---

## 6. ALL API ROUTES (43 routes)

| Method | Route | Purpose | Auth/Role |
|--------|-------|---------|-----------|
| POST | `/api/auth/login` | Authenticate | Public |
| POST | `/api/auth/forgot-password` | Send OTP email | Public |
| POST | `/api/auth/verify-otp` | Verify OTP → reset token | Public |
| POST | `/api/auth/reset-password` | Set new password | Public (token) |
| POST | `/api/auth/change-password` | Change password | ⚠️ No auth — trusts body userId |
| POST | `/api/auth/send-credentials` | Resend credentials email | ⚠️ No auth |
| GET | `/api/scripts/hash-passwords` | Migrate passwords | ⚠️ No auth — DISABLE IN PROD |
| GET/POST | `/api/employees` | List / create employees | Company scope |
| GET/PUT/DELETE | `/api/employees/[id]` | Employee CRUD | Company scope |
| GET/POST | `/api/companies` | List / create companies | POST: super_admin only |
| GET/POST | `/api/attendance` | List / create attendance | Company scope |
| PUT | `/api/attendance/[id]` | Update attendance | Company scope |
| POST | `/api/attendance/checkin` | Self check-in + geo | ⚠️ No role check |
| POST | `/api/attendance/checkout` | Self check-out | ⚠️ No role check |
| POST | `/api/attendance/bulk` | Bulk mark attendance | ⚠️ No role check |
| GET | `/api/attendance/qr/generate` | QR token + image | ⚠️ No auth |
| POST | `/api/attendance/qr/scan` | Mark via QR token | ⚠️ No auth |
| POST | `/api/attendance/reminder` | Email unscoped all active | ⚠️ No auth |
| GET/POST | `/api/leaves` | List / apply leave | Company scope |
| PUT | `/api/leaves/[id]` | Approve/reject + email | Company scope; no role |
| GET/POST | `/api/payroll` | List / create payroll | Company scope |
| PUT | `/api/payroll/[id]` | Update / mark paid | Company scope |
| GET/POST | `/api/jobs` | Job postings | Company scope |
| GET/POST | `/api/applicants` | Applicants list/create | Company scope |
| PUT | `/api/applicants/[id]` | Update stage | Company scope |
| GET/POST | `/api/performance` | Reviews | Company scope |
| PUT | `/api/performance/[id]` | Update review | Company scope |
| GET/POST | `/api/announcements` | List / create | Company scope |
| DELETE | `/api/announcements/[id]` | Delete | Company scope |
| GET/POST | `/api/office-profile` | Office profile | Company scope; no role |
| GET/POST | `/api/roles-permissions` | Permission matrix | POST: super/company admin |
| GET/POST | `/api/document-templates` | Templates list/create | Company scope |
| GET/PUT/DELETE | `/api/document-templates/[id]` | Template CRUD | Company scope |
| POST | `/api/ai-chat` | HR chat + RAG | ⚠️ No auth; role from body |
| GET/POST/DELETE | `/api/ai-chat/history` | Chat history | ⚠️ No ownership check |
| POST | `/api/ai-documents` | Generate docs / templates | Company scope for templates |
| GET | `/api/ai-anomalies` | Anomaly detection | Company scope; no role |
| GET | `/api/ai-churn` | Churn risk | Company scope; no role |
| POST | `/api/ai-reports` | Monthly report | Company scope; no role |
| POST | `/api/ai-interview` | Interview questions | ⚠️ No auth |
| GET | `/api/hrm` | Legacy aggregate JSON | ⚠️ No auth — LEGACY |
| GET/POST | `/api/hrm/[resource]` | Legacy JSON CRUD | ⚠️ No auth — LEGACY |
| PATCH/DELETE | `/api/hrm/[resource]/[id]` | Legacy JSON mutate | ⚠️ No auth — LEGACY |

---

## 7. EMAIL SYSTEM

**Provider:** Nodemailer + Gmail SMTP  
**Config:** `GMAIL_USER` + `GMAIL_APP_PASSWORD` in `.env.local`

| Email Function | When Triggered | Subject |
|----------------|---------------|---------|
| `sendCredentialsEmail` | New employee created | Welcome to HRFlow — Your Login Credentials |
| `sendLeaveStatusEmail` | Leave approved or rejected | Leave Request Approved ✅ / Leave Request Update ❌ |
| `sendAttendanceReminderEmail` | Manual trigger from bulk page | Attendance Reminder |
| `sendPasswordResetOtpEmail` | Forgot password flow | HRFlow — Password Reset OTP |

**Missing emails:**
- Payslip PDF email
- Announcement email to all employees
- Probation ending reminder
- Interview schedule confirmation
- Offer letter to applicant

---

## 8. AI SYSTEM

### Provider
- **Google Gemini 2.5 Flash** only (`gemini-2.5-flash`)
- `lib/ai-gemini.ts` → `callGemini()` / `askGemini()`
- No streaming — full response (45s timeout)
- No rate limiting on AI endpoints
- `@anthropic-ai/sdk` installed but **never used** — safe to remove

### AI Features

| Feature | Status | Route | Uses DB? |
|---------|--------|-------|---------|
| AI Chat (HR queries) | ✅ | `POST /api/ai-chat` | Yes — SQL RAG |
| Intent detection (keyword) | ✅ | `detectIntent()` in ai-chat | — |
| Conversation history (last 10) | ✅ | ai-chat | Yes |
| Chat history persistence | ✅ | `api/ai-chat/history` | `ai_chat_history` |
| Document generator (12+ types) | ✅ | `POST /api/ai-documents` | Templates |
| Template reuse system | ✅ | `api/document-templates` | Yes |
| Variable substitution `{{}}` | ✅ | `lib/document-templates.ts` | — |
| Anomaly detection | ✅ | `GET /api/ai-anomalies` | Yes |
| Churn risk prediction | ✅ | `GET /api/ai-churn` | Yes |
| Monthly HR report | ✅ | `POST /api/ai-reports` | Yes |
| Interview questions kit | ✅ | `POST /api/ai-interview` | No |
| Policy document generation | ✅ | `POST /api/ai-documents` | No |
| Streaming | ❌ | — | — |
| Vector/semantic RAG | ❌ | — | — |
| Company-scoped chat | ❌ | — | Cross-tenant risk |

### RAG Pattern (How AI Chat Works)

```
User message
    ↓
detectIntent(message) — keyword matching EN + Roman Urdu
    ↓
findEmployeeMention(message) — extract name from message
    ↓
fetchRelevantData(intent) — SQL queries to Supabase
    ↓
JSON.stringify(dbData) → injected into system prompt
    ↓
callGemini(systemPrompt + conversationHistory + userMessage)
    ↓
Response to user
```

**Critical gap:** `fetchRelevantData` does NOT call `getCompanyScope()` — all companies' data mixed.

### Document Template System

```
User requests document type (e.g. "Offer Letter")
    ↓
Check document_templates table for this type + company
    ↓
[If template exists] → Load → render {{variables}} → Show preview → NO AI call
[If no template]     → Show form → Call Gemini → Show result → "Save as Template" button
    ↓
Template saved with {{employee_name}}, {{salary}}, {{date}} etc.
Next time: reuse template, only fill variables
```

---

## 9. CRITICAL BUGS TO FIX (P0)

### 1. APIs Trust Spoofable Headers
**File:** `lib/company-scope.ts`  
**Issue:** All APIs read `x-user-role` and `x-company-id` from request headers. These come from `localStorage` client-side — any user can set any value.  
**Fix needed:** Implement JWT or server-side session. Verify user from DB on each request using cookie `hrm_auth` (user ID).

### 2. `managerId` Always Null — Team Lead Broken
**File:** `lib/db-mappers.ts` `mapEmployee()`  
**Issue:** `managerId: null` hardcoded. Team lead's team view shows no employees.  
**Fix needed:** Add `manager_id uuid references employees(id)` column to `employees` table. Update employee create/edit to set this. Fix mapper.

### 3. AI Chat Cross-Tenant Data Leak
**File:** `app/api/ai-chat/route.ts` `fetchRelevantData()`  
**Issue:** No `company_id` filter — all companies' employee data mixed in AI responses.  
**Fix needed:** Pass `company_id` from authenticated user, filter all DB queries.

### 4. Unauthenticated Dangerous Endpoints
**Fix needed — add auth guard or disable:**
- `GET /api/scripts/hash-passwords` — can hash/rehash all passwords
- `POST /api/auth/send-credentials` — can email any user's credentials
- `GET /api/attendance/reminder` — emails all employees from all companies
- `GET /api/attendance/qr/generate` and `POST /api/attendance/qr/scan` — unauthenticated
- `POST /api/auth/change-password` — accepts arbitrary `userId` in body
- `GET/POST/DELETE /api/ai-chat/history` — no ownership check
- `GET/POST/PATCH/DELETE /api/hrm/*` — legacy unauthenticated CRUD

### 5. `/reports` Not in Middleware Protected Paths
**File:** `middleware.ts`  
**Fix:** Add `/reports` to `PROTECTED_PREFIXES` array.

---

## 10. REMAINING FEATURES TO BUILD

### P0 — Security (Before Any Production Use)

**Prompt for Claude Code:**
```
Implement server-side session verification for HRFlow.

Current problem:
- APIs read x-user-role and x-company-id from headers sent by client
- lib/company-scope.ts getCompanyScope() trusts these headers
- localStorage hrm_auth contains full user object (spoofable)
- Cookie hrm_auth contains only user.id (unsigned)

Solution needed:
1. On login: generate a signed JWT (use jose library) containing { id, role, company_id }
   Store JWT in HttpOnly cookie (not localStorage) named hrm_session
   Keep localStorage for UI state only (non-sensitive display data)

2. Create lib/server-auth.ts:
   - getServerSession(request): reads hrm_session cookie, verifies JWT
   - Returns AuthUser or null
   - If null: returns 401 response

3. Update ALL api routes to call getServerSession(request) at top
   Replace getCompanyScope() calls with server session data
   Remove trust in x-user-role / x-company-id headers

4. Update middleware.ts:
   - Verify JWT signature (not just cookie presence)
   - Add /reports to PROTECTED_PREFIXES
   - Block all /api/* if no valid session (except auth routes)

5. Disable or add one-time-use guard to:
   - GET /api/scripts/hash-passwords (add ?secret=env_var check)
   - POST /api/auth/send-credentials (require admin session)
   - GET /api/attendance/reminder (require hr_manager+ session)

6. Fix POST /api/auth/change-password:
   - Do not accept userId from body
   - Get userId from server session only
```

---

### P1 — Core Gaps

**FEATURE: Fix managerId (Team Lead broken)**
```
Add manager_id column to employees table in Supabase:
  alter table employees add column if not exists manager_id uuid references employees(id);

Update lib/db-mappers.ts mapEmployee():
  managerId: raw.manager_id ?? null  (already doing this but column missing)

Update POST /api/employees:
  Accept manager_id in body, save to DB

Update employee create/edit form:
  Add "Manager" dropdown (show only team_lead and above employees)

Update GET /api/employees:
  For team_lead role: filter where manager_id = current employee's id
```

**FEATURE: Notifications System**
```
Create notifications table in Supabase:
  create table notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references users(id) on delete cascade,
    title text not null,
    message text not null,
    type text default 'info',
    read boolean default false,
    link text,
    company_id uuid references companies(id),
    created_at timestamp default now()
  );

Create lib/notifications.ts:
  export async function createNotification(userId, title, message, type, link?, companyId?)

Create app/api/notifications/route.ts:
  GET: fetch for current user, unread first (server session auth)
  PATCH: mark as read

Wire notification bell in components/shared/app-header.tsx:
  - Fetch unread count on mount + every 30s
  - Show red badge with count
  - Click: dropdown with last 10 notifications
  - "Mark all read" button
  - "View all" → /notifications page

Add createNotification() calls in:
  - PUT /api/leaves/[id] → notify employee of approval/rejection
  - POST /api/employees → notify hr_manager of new employee
  - POST /api/announcements → notify all employees in company
  - POST /api/payroll → notify employee payslip ready

Create app/(dashboard)/notifications/page.tsx:
  Full list with All/Unread/Read tabs, pagination
```

**FEATURE: Activity / Audit Logs**
```
Create activity_logs table in Supabase:
  create table activity_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references users(id),
    user_name text,
    user_role text,
    action text not null,
    module text not null,
    description text,
    metadata jsonb,
    company_id uuid references companies(id),
    created_at timestamp default now()
  );

Create lib/activity-log.ts:
  export async function logActivity(userId, userName, userRole, action, module, description, metadata?, companyId?)

Add logActivity() calls in these API routes:
  POST /api/employees → "Added new employee [name]"
  PUT /api/employees/[id] → "Updated employee [name]"
  DELETE /api/employees/[id] → "Deleted employee [name]"
  PUT /api/leaves/[id] → "Approved/Rejected leave for [name]"
  POST /api/payroll → "Generated payroll for [month] [count] employees"
  POST /api/jobs → "Created job posting: [title]"
  PUT /api/applicants/[id] → "Moved [applicant] to [stage]"
  PUT /api/roles-permissions → "Updated role permissions"

Create app/(dashboard)/settings/activity-logs/page.tsx:
  Visible to: super_admin, company_admin only
  Filters: date range, module, action type, user
  Table: time | user+role | action badge | module | description | details modal
  Export CSV button
```

**FEATURE: Error Pages**
```
Create app/not-found.tsx:
  HRFlow branded 404 page
  "Page not found" with icon
  "Go to Dashboard" button

Create app/error.tsx:
  "Something went wrong" page
  Error details in dev only
  "Try again" (reset()) + "Go home" buttons
```

---

### P2 — Feature Completeness

**FEATURE: Pakistani Tax Calculation**
```
Create lib/tax-calculator.ts:
  Pakistan FY 2025-26 slabs:
  function calculateIncomeTax(annualSalary: number): number {
    if (annualSalary <= 600000) return 0
    if (annualSalary <= 1200000) return (annualSalary - 600000) * 0.05
    if (annualSalary <= 2200000) return 30000 + (annualSalary - 1200000) * 0.15
    if (annualSalary <= 3200000) return 180000 + (annualSalary - 2200000) * 0.25
    if (annualSalary <= 4100000) return 430000 + (annualSalary - 3200000) * 0.30
    return 700000 + (annualSalary - 4100000) * 0.35
  }
  export function getMonthlyTax(monthlySalary: number): number {
    return calculateIncomeTax(monthlySalary * 12) / 12
  }

Update POST /api/payroll:
  Auto-calculate:
  - HRA: salary * 0.45
  - Medical: salary * 0.10
  - Conveyance: 2000 (fixed)
  - Gross: salary + HRA + medical + conveyance
  - Income Tax: getMonthlyTax(salary)
  - EOBI: 370 (fixed employee contribution)
  - Late deductions: (salary/30) * late_count
  - Net: gross - tax - EOBI - late_deductions + bonuses - advance_repayment

Update payslip dialog in payroll page to show full breakdown
```

**FEATURE: Probation Tracking**
```
Supabase SQL:
  alter table employees add column if not exists probation_months int default 3;
  alter table employees add column if not exists probation_end_date date;

Update employee create form:
  Add "Probation Period" select: None / 1 month / 2 months / 3 months / 6 months
  Auto-calc probation_end_date = joining_date + probation_months

In employees list:
  Show "🟡 Probation" badge if probation_end_date > today
  Show "🟢 Confirmed" if past probation date

Dashboard widget (hr_manager+):
  "X employees completing probation this month"
  
Create GET /api/employees/probation-ending:
  Returns employees where probation_end_date between today and today+7
  Send email reminder to hr_manager
```

**FEATURE: Exit / Offboarding**
```
Supabase SQL:
  alter table employees add column if not exists exit_date date;
  alter table employees add column if not exists exit_type text check (exit_type in ('resignation','termination','contract_end'));
  alter table employees add column if not exists exit_reason text;
  alter table employees add column if not exists clearance_checklist jsonb default '{}';

Create app/(dashboard)/employees/[id]/exit/page.tsx:
  "Initiate Exit Process" button in employee profile (hr_manager+)
  Exit form:
    - Exit Type: Resignation / Termination / Contract End
    - Last Working Date
    - Exit Reason
    - Clearance Checklist checkboxes:
      [ ] Equipment returned
      [ ] System access revoked
      [ ] Final settlement calculated
      [ ] Experience letter issued
      [ ] NOC issued
  On submit: update employee status='inactive', save exit fields
  Auto-trigger: generate experience letter via AI documents
```

**FEATURE: Employee Documents Upload**
```
Supabase SQL:
  create table employee_documents (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid references employees(id),
    document_type text not null,
    file_name text,
    file_base64 text,
    uploaded_at timestamp default now()
  );

Add "Documents" tab in employee view modal/page:
  Document types: CNIC, Contract, Appointment Letter, NDA, Certificate, Other
  Upload button per type → convert to base64 → save
  View / Download / Delete per document

Create app/api/employees/[id]/documents/route.ts:
  GET: fetch documents
  POST: save document
  DELETE: remove document
```

**FEATURE: Holidays Calendar (DB-shared)**
```
Supabase SQL:
  create table holidays (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    date date not null,
    type text default 'public' check (type in ('public','company','optional')),
    company_id uuid references companies(id),
    created_at timestamp default now()
  );
  
  -- Seed Pakistani public holidays
  insert into holidays (name, date, type) values
  ('New Year Day','2026-01-01','public'),
  ('Kashmir Day','2026-02-05','public'),
  ('Pakistan Day','2026-03-23','public'),
  ('Labour Day','2026-05-01','public'),
  ('Independence Day','2026-08-14','public'),
  ('Iqbal Day','2026-11-09','public'),
  ('Quaid Day','2026-12-25','public');

Remove holidays from localStorage in settings/page.tsx
Create app/api/holidays/route.ts (GET, POST, DELETE)
Update attendance calendar to fetch holidays from DB
Show holiday names in calendar cells
Don't count holidays as absent/leave
```

**FEATURE: Overtime Tracking**
```
Supabase SQL:
  create table overtime (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid references employees(id),
    date date not null,
    hours numeric not null,
    reason text,
    approved boolean default false,
    approved_by uuid references employees(id),
    created_at timestamp default now()
  );

Create app/(dashboard)/attendance/overtime/page.tsx:
  Employee: "Log Overtime" form (date, hours, reason)
  Manager: List of pending overtime to approve/reject
  Monthly overtime summary per employee

Create app/api/overtime/route.ts (GET, POST)
Create app/api/overtime/[id]/route.ts (PUT: approve/reject)
Add approved overtime to payroll calculation
```

**FEATURE: Salary Advances**
```
Supabase SQL:
  create table salary_advances (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid references employees(id),
    amount numeric not null,
    reason text,
    status text default 'pending' check (status in ('pending','approved','rejected','repaid')),
    approved_by uuid references employees(id),
    repayment_month int,
    repayment_year int,
    created_at timestamp default now()
  );

Create app/(dashboard)/payroll/advances/page.tsx:
  Employee: Request advance (amount, reason, repayment month)
  HR: Approve/reject list
  Auto-deduct from payroll of repayment month
  Email on approval/rejection

Create app/api/salary-advances/route.ts (GET, POST)
Create app/api/salary-advances/[id]/route.ts (PUT: approve/reject)
```

**FEATURE: Bulk CSV Employee Import**
```
Install: npm install papaparse @types/papaparse

Add "Import CSV" button to employees page (hr_manager+):
  Download CSV template button (shows required columns)
  File upload input (accept .csv)
  Parse with papaparse
  Preview table: valid rows (green) | error rows (red with reason)
  "Import X employees" button
  Creates employees + user accounts + sends credentials emails
  Returns summary: "15 imported, 2 failed (reasons)"

CSV columns: full_name, email, cnic, phone, department, designation, joining_date, salary
```

**FEATURE: Interview Scheduling**
```
Supabase SQL:
  create table interview_schedules (
    id uuid default gen_random_uuid() primary key,
    applicant_id uuid references applicants(id),
    job_id uuid references jobs(id),
    interviewer_id uuid references employees(id),
    scheduled_at timestamp not null,
    duration_minutes int default 60,
    meeting_link text,
    notes text,
    status text default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
    created_at timestamp default now()
  );

Add "Schedule Interview" button on applicant card in recruitment Kanban
  (visible when stage = screening or interview)
  Modal: interviewer (employee select), date+time, duration, meeting link, notes
  Send email to both interviewer and applicant

Create app/api/interview-schedules/route.ts (GET, POST)
Create app/api/interview-schedules/[id]/route.ts (PUT: update status)

Add calendar tab in recruitment page showing scheduled interviews
```

**FEATURE: Global Search**
```
Add search icon in app-header.tsx
Click → modal overlay (CMD+K shortcut too)
Debounced search (300ms) across: employees, jobs, announcements, leaves

Create app/api/search/route.ts:
  GET ?q=term
  Query employees (full_name, email, designation) → ilike
  Query jobs (title) → ilike
  Query announcements (title) → ilike
  Query leaves (employee name join) → ilike
  Return { employees: [], jobs: [], announcements: [], leaves: [] }
  Limit 5 per category, filter by company_id

Results grouped by category, click navigates to page
Keyboard navigation (arrow keys, enter)
```

**FEATURE: QR Scanner (complete QR flow)**
```
Install: npm install html5-qrcode

Current state: QR generate page works; no scanner; APIs unauthenticated

Create app/(dashboard)/attendance/qr/scan/page.tsx:
  HR/Manager only
  Camera view with scanning overlay
  Uses html5-qrcode library
  On successful scan: POST /api/attendance/qr/scan with token
  Show employee name + check-in time on success

Add auth to /api/attendance/qr/generate:
  Require valid session, only generate for own employee ID or if manager

Add auth to /api/attendance/qr/scan:
  Require valid session (hr_manager+ to scan others)
```

---

### P3 — Polish

| Item | Fix |
|------|-----|
| Remove `@anthropic-ai/sdk` | `npm uninstall @anthropic-ai/sdk` |
| Disable legacy `/api/hrm/*` | Add auth guard or remove entirely |
| OTP should be hashed at rest | `bcrypt.hash(otp, 10)` before DB save |
| AI chat payroll gate | Add `company_admin` to allowed roles |
| `departments` table | Either use it (departments page) or remove |
| Leave quota | Unify: pick one (20/10/7) and update both `dashboard-data.ts` and AI prompts |
| Announcement priority | Add `priority` column to announcements table and mapper |
| `.env.example` | Create with all variable names (no values) |
| `error.tsx` / `not-found.tsx` | Create branded error pages |
| Anomaly action buttons | Wire "Schedule Meeting" → create calendar event; "Send Warning" → AI warning letter |
| Real PDF | Replace `window.print()` with `puppeteer` or `@react-pdf/renderer` |
| AI streaming | Implement streaming responses for chat (better UX) |
| Timezone | Standardize to Asia/Karachi across all attendance timestamps |
| TypeScript DB types | Generate from Supabase schema using `supabase gen types typescript` |

---

## 11. KEY FILES QUICK REFERENCE

| If you need to... | Look at... |
|-------------------|------------|
| Understand auth flow | `lib/auth.ts`, `components/shared/auth-provider.tsx`, `middleware.ts` |
| Add API-level role check | `lib/company-scope.ts` → replace with `lib/server-auth.ts` (to be built) |
| Update permissions | `lib/permissions.ts`, `settings/roles/page.tsx`, `api/roles-permissions` |
| Add a new email | `lib/mailer.ts` |
| Call Gemini AI | `lib/ai-gemini.ts` `callGemini()` |
| Add to DB | `supabase/schema.sql` + new migration file |
| Map DB row to TypeScript | `lib/db-mappers.ts` |
| Add a new page | Follow pattern in any `app/(dashboard)/*/page.tsx` |
| Add a new API route | Follow pattern in any `app/api/*/route.ts` |
| Send notification | Create `lib/notifications.ts` (to be built) |
| Log activity | Create `lib/activity-log.ts` (to be built) |

---

## 12. DEVELOPMENT SETUP

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

**Supabase:** Project at `https://idahwvrlgroixlhunnjf.supabase.co`  
**Schema:** `supabase/schema.sql` + migrations `002`–`009`  
**No RLS** — all queries use `supabaseAdmin` (service role)

---

## 13. SUGGESTED IMPLEMENTATION ORDER FOR NEW DEVELOPER

### Week 1 — Security Foundation
1. Implement JWT + HttpOnly cookie session (`lib/server-auth.ts`)
2. Update all API routes to use server session
3. Fix unauthenticated dangerous endpoints
4. Add `/reports` to middleware
5. Fix managerId + add `manager_id` column

### Week 2 — Core Missing Features  
6. Notifications system (table + bell + dropdown)
7. Activity/Audit logs (table + logging + UI)
8. Error pages (404, 500)
9. Pakistani tax calculation in payroll
10. Payslip email with breakdown

### Week 3 — Feature Completeness
11. Probation tracking
12. Exit/offboarding workflow
13. Holidays calendar (DB-based)
14. Employee document upload
15. QR scanner page

### Week 4 — Advanced Features
16. Overtime tracking
17. Salary advances
18. Bulk CSV import
19. Interview scheduling
20. Global search

### Week 5 — Polish
21. AI chat company scoping fix
22. Per-company role permissions
23. Real PDF generation
24. AI streaming
25. PWA support

---

*End of HRFlow Complete Handover Document*  
*Prepared from: codebase findings report (July 11, 2026) + full conversation history*
