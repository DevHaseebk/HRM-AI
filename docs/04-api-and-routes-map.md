# API and Routes Map

## Reading the Access Column

- **Public/no API guard**: the API route itself does not validate a login session or role.
- **UI: ...**: those roles can normally reach the feature through navigation/page controls.
- **Company-scoped header**: route filters when the caller supplies `x-company-id` and is not `super_admin`.
- Next middleware excludes `/api`, so page protection does not protect API endpoints.

All controller files are Next.js route handlers; there is no separate controller/service framework.

## Authentication and Passwords

| Method | Endpoint | Purpose | Access observed | Request summary | Response summary | File |
|---|---|---|---|---|---|---|
| POST | `/api/auth/login` | Authenticate by email/password | Public/no API guard | `{email,password}` | `{user}` with role, employee/company IDs, password flags | `app/api/auth/login/route.ts` |
| POST | `/api/auth/change-password` | Change known user's password | Public/no API guard; caller supplies user ID | `{userId,currentPassword,newPassword}` | Success message | `app/api/auth/change-password/route.ts` |
| POST | `/api/auth/forgot-password` | Create/rate-limit OTP and email it | Public | `{email}` | Generic success or 429 with remaining seconds | `app/api/auth/forgot-password/route.ts` |
| POST | `/api/auth/verify-otp` | Verify OTP and issue reset token | Public | `{email,otp}` | `{reset_token}` or invalid/expired error | `app/api/auth/verify-otp/route.ts` |
| POST | `/api/auth/reset-password` | Reset password with token | Public | `{email,reset_token,newPassword}` | Success message | `app/api/auth/reset-password/route.ts` |
| POST | `/api/auth/send-credentials` | Send a supplied password by email | Public/no API guard | `{email,name,password}` | Email-send success | `app/api/auth/send-credentials/route.ts` |
| GET | `/api/scripts/hash-passwords` | One-time hash migration for users lacking `password_hash` | Public/no API guard | None | Updated user count | `app/api/scripts/hash-passwords/route.ts`, `scripts/hash-passwords.ts` |

## Companies, Office Profile, and Employees

| Method | Endpoint | Purpose | Access observed | Request summary | Response summary | File |
|---|---|---|---|---|---|---|
| GET | `/api/companies` | List companies | UI: Super Admin creation flow; company-scoped header supported | Headers only | Array of `{id,name}` | `app/api/companies/route.ts` |
| POST | `/api/companies` | Create company | Explicit `x-user-role: super_admin` check | `{name}` | Created company | `app/api/companies/route.ts` |
| GET | `/api/office-profile` | Load latest/scoped office profile | UI: Super Admin, Company Admin, HR Manager; no role guard | Headers | `{profile}` or null | `app/api/office-profile/route.ts` |
| POST | `/api/office-profile` | Upsert office profile | Same UI; company-scoped header | Full profile object | `{profile}` | `app/api/office-profile/route.ts` |
| GET | `/api/employees` | List employees | UI: Super Admin, Company Admin, HR Manager; company-scoped header | Headers | Employee rows | `app/api/employees/route.ts` |
| POST | `/api/employees` | Create employee/user or Company Admin | UI management roles; Company Admin role honored only for Super Admin header | Employee fields plus optional `role`, `company_id`, `new_company_name` | Created employee and message | `app/api/employees/route.ts` |
| GET | `/api/employees/:id` | Get one employee | No role guard; company-scoped header | Path ID | Employee row | `app/api/employees/[id]/route.ts` |
| PUT | `/api/employees/:id` | Update employee | UI management roles; no role guard; company-scoped header | Partial DB employee fields | Updated employee | `app/api/employees/[id]/route.ts` |
| DELETE | `/api/employees/:id` | Delete employee | UI management roles; no role guard; company-scoped header | Path ID | Message and deleted row | `app/api/employees/[id]/route.ts` |
| GET | `/api/roles-permissions` | Load merged module permissions and role user counts | Used by all dashboard roles; management UI is Super/Company Admin | Auth/company headers | Permissions and user counts | `app/api/roles-permissions/route.ts` |
| POST | `/api/roles-permissions` | Bulk upsert configurable role permissions | Explicit Super Admin/Company Admin header check | `{permissions:[...]}` | Merged permissions and message | `app/api/roles-permissions/route.ts` |

## Attendance

| Method | Endpoint | Purpose | Access observed | Request summary | Response summary | File |
|---|---|---|---|---|---|---|
| GET | `/api/attendance` | List/filter attendance | UI: all; company-scoped header | Optional `employee_id`, `date` query | Attendance rows | `app/api/attendance/route.ts` |
| POST | `/api/attendance` | Create attendance row | No role guard; company membership checked only when scoped header exists | Attendance fields; requires employee/date | Created row | `app/api/attendance/route.ts` |
| PUT | `/api/attendance/:id` | Update attendance row | No role guard; company preflight when scoped | Partial attendance fields | Updated row | `app/api/attendance/[id]/route.ts` |
| POST | `/api/attendance/checkin` | Location-restricted self check-in | UI: Employee; no session/role check | `{employee_id,latitude,longitude}` | Status, time, distance, radius, message | `app/api/attendance/checkin/route.ts` |
| POST | `/api/attendance/checkout` | Check out and calculate hours | UI: Employee; no session/role check | `{employee_id}` | Checkout time, hours, message | `app/api/attendance/checkout/route.ts` |
| POST | `/api/attendance/bulk` | HR/manual attendance upsert | UI: Team Lead/admin roles; no role guard; optional company filter | `{date,records,override_note}` | Saved count | `app/api/attendance/bulk/route.ts` |
| POST | `/api/attendance/reminder` | Email all unmarked active employees | UI sidebar: Super Admin/HR Manager; bulk page: HR roles; no API guard or company scope | None | Sent count, candidates, failures | `app/api/attendance/reminder/route.ts` |
| GET | `/api/attendance/qr/generate` | Generate/store daily QR token | UI: linked Employee; no API guard | `employee_id` query | Token, QR data URL, date/status | `app/api/attendance/qr/generate/route.ts` |
| POST | `/api/attendance/qr/scan` | Consume QR token and mark attendance | Public/no API guard | `{token}` | Employee name, status, time | `app/api/attendance/qr/scan/route.ts` |

## Leave

| Method | Endpoint | Purpose | Access observed | Request summary | Response summary | File |
|---|---|---|---|---|---|---|
| GET | `/api/leaves` | List/filter leaves | UI: all; company-scoped header | Optional `employee_id`, `status` | Leave rows | `app/api/leaves/route.ts` |
| POST | `/api/leaves` | Apply for leave | UI: all linked users; company membership check when scoped | Employee/type/dates/reason | Created row | `app/api/leaves/route.ts` |
| PUT | `/api/leaves/:id` | Approve/reject leave and email employee | UI: Super Admin, Company Admin, HR Manager, Team Lead; no role guard | `{status,approved_by?}` | Updated row, optionally `emailWarning` | `app/api/leaves/[id]/route.ts` |

## Payroll

| Method | Endpoint | Purpose | Access observed | Request summary | Response summary | File |
|---|---|---|---|---|---|---|
| GET | `/api/payroll` | List payroll with employee details | UI: Super Admin, Company Admin, HR Manager; company-scoped header | Headers | Payroll rows | `app/api/payroll/route.ts` |
| POST | `/api/payroll` | Create monthly payroll | Same UI; company membership check when scoped | Employee, month/year, salary fields | Created row with net salary | `app/api/payroll/route.ts` |
| PUT | `/api/payroll/:id` | Update payroll/status | Same UI; company preflight when scoped | Partial payroll fields | Updated row | `app/api/payroll/[id]/route.ts` |

## Recruitment

| Method | Endpoint | Purpose | Access observed | Request summary | Response summary | File |
|---|---|---|---|---|---|---|
| GET | `/api/jobs` | List jobs | UI: Super Admin, Company Admin, HR Manager; company-scoped header | Headers | Job rows | `app/api/jobs/route.ts` |
| POST | `/api/jobs` | Create job | Same UI; no role guard | Job fields; title required | Created job | `app/api/jobs/route.ts` |
| GET | `/api/applicants` | List/filter applicants | Same UI; scoped through job company | Optional `job_id`, `stage` | Applicant rows | `app/api/applicants/route.ts` |
| POST | `/api/applicants` | Create applicant | No matching frontend create flow found; no role guard | Applicant fields; name/job required | Created applicant | `app/api/applicants/route.ts` |
| PUT | `/api/applicants/:id` | Change pipeline stage/notes | UI recruitment managers; no role guard | `{stage,notes?}` | Updated applicant | `app/api/applicants/[id]/route.ts` |

## Performance

| Method | Endpoint | Purpose | Access observed | Request summary | Response summary | File |
|---|---|---|---|---|---|---|
| GET | `/api/performance` | List reviews | UI: all; company-scoped header | Headers | Performance rows | `app/api/performance/route.ts` |
| POST | `/api/performance` | Create review | UI: Super Admin, Company Admin, HR Manager, Team Lead; no role guard | Employee, reviewer, period, rating, goals, feedback | Created row | `app/api/performance/route.ts` |
| PUT | `/api/performance/:id` | Update review | Same UI; company preflight when scoped | Partial review fields | Updated row | `app/api/performance/[id]/route.ts` |

## Announcements

| Method | Endpoint | Purpose | Access observed | Request summary | Response summary | File |
|---|---|---|---|---|---|---|
| GET | `/api/announcements` | List announcements | UI: all; company-scoped header | Headers | Announcement rows | `app/api/announcements/route.ts` |
| POST | `/api/announcements` | Publish announcement | UI: Super Admin, Company Admin, HR Manager; no role guard | Title/content/author/department | Created row | `app/api/announcements/route.ts` |
| DELETE | `/api/announcements/:id` | Delete announcement | Same UI; company-scoped header | Path ID | Message and deleted row | `app/api/announcements/[id]/route.ts` |

## AI and Reports

| Method | Endpoint | Purpose | Access observed | Request summary | Response summary | File |
|---|---|---|---|---|---|---|
| POST | `/api/ai-chat` | HR data-aware Gemini chat | UI: all; no auth verification; role supplied in body | Message, recent history, role/name | Reply, suggestions, intent metadata | `app/api/ai-chat/route.ts` |
| GET | `/api/ai-chat/history` | Load user chat history | UI chat; no ownership check | `userId` query | Up to 50 messages | `app/api/ai-chat/history/route.ts` |
| POST | `/api/ai-chat/history` | Store chat message | UI chat; no ownership check | `{userId,role,message}` | Stored message | `app/api/ai-chat/history/route.ts` |
| DELETE | `/api/ai-chat/history` | Clear user history | UI chat; no ownership check | `userId` query | `{ok:true}` | `app/api/ai-chat/history/route.ts` |
| GET | `/api/ai-anomalies` | Detect/enrich attendance anomalies | UI: Team Lead/admin helper roles; company-scoped header | Headers | Anomalies and severity summary | `app/api/ai-anomalies/route.ts` |
| GET | `/api/ai-churn` | Score/enrich employee churn risk | UI: report roles; company-scoped header | Headers | Employees and risk summary | `app/api/ai-churn/route.ts` |
| POST | `/api/ai-reports` | Generate monthly HR report | UI: Super Admin, Company Admin, HR Manager; company-scoped header | `{month,year}` | Report text and metrics | `app/api/ai-reports/route.ts` |
| POST | `/api/ai-documents` | Generate HR document | UI: all AI users; no role guard | `{documentType,formData}` | Plain-text document | `app/api/ai-documents/route.ts` |
| POST | `/api/ai-interview` | Generate interview kit | UI Documents; no role guard | `{jobTitle,experienceLevel?,skills?}` | Parsed JSON kit | `app/api/ai-interview/route.ts` |
| GET | `/api/document-templates` | List templates by company and optional type | AI Documents users; company-scoped header | Optional `type` query | `{templates}` | `app/api/document-templates/route.ts` |
| POST | `/api/document-templates` | Save a reusable document template | Permission-aware UI; no verified server session | Type, name, content, variables | Created template | `app/api/document-templates/route.ts` |
| GET | `/api/document-templates/:id` | Load one scoped template | AI Documents users | Path ID | Template | `app/api/document-templates/[id]/route.ts` |
| PUT | `/api/document-templates/:id` | Edit or overwrite template | Permission-aware UI | Name/content/variables | Updated template | `app/api/document-templates/[id]/route.ts` |
| DELETE | `/api/document-templates/:id` | Delete template | Permission-aware UI | Path ID | `{success:true}` | `app/api/document-templates/[id]/route.ts` |

## Legacy JSON APIs

These routes operate on `/data/*.json`, not Supabase. No current primary UI client calls them.

| Method | Endpoint | Purpose | Access observed | Request summary | Response summary | File |
|---|---|---|---|---|---|---|
| GET | `/api/hrm` | Load all JSON HR data | Public/no guard | None | Combined data/settings object | `app/api/hrm/route.ts` |
| GET | `/api/hrm/:resource` | Read mapped JSON resource | Public/no guard | Resource path | Array/object | `app/api/hrm/[resource]/route.ts` |
| POST | `/api/hrm/:resource` | Add record or overwrite settings | Public/no guard | Record with ID, or settings object | Created/saved object | `app/api/hrm/[resource]/route.ts` |
| PATCH | `/api/hrm/:resource/:id` | Update JSON record | Public/no guard | Partial record | Updated object | `app/api/hrm/[resource]/[id]/route.ts` |
| DELETE | `/api/hrm/:resource/:id` | Delete JSON record | Public/no guard | Path ID | `{success:true}` | `app/api/hrm/[resource]/[id]/route.ts` |

Valid legacy resources: employees, attendance, leaves, payroll, jobs, applicants, announcements, performance, settings.
