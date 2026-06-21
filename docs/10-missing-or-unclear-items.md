# Missing, Unclear, or Inconsistent Items

This file records items that could not be confirmed from the repository or that behave inconsistently across the frontend, API, and database. It is intentionally evidence-based rather than a list of assumed future features.

## 1. Critical Security and Access-Control Gaps

1. **No verified server session:** authentication is stored in browser local storage and a client-readable cookie. Middleware checks only that the cookie exists.
2. **API routes are not protected by middleware:** route handlers must authenticate independently, but most do not verify a user session.
3. **Browser-controlled role and company headers:** many routes trust `x-user-role` and `x-company-id`; a caller can modify these headers.
4. **Missing company filter can become unscoped:** several non-Super Admin queries apply company filtering only when a company ID header is present.
5. **No Row Level Security policies found:** repository SQL contains tables and constraints but no confirmed Supabase RLS policies.
6. **Public sensitive endpoints:** the password hashing migration route, credential-email route, QR scan route, reminder route, and several AI routes have no confirmed server-side role guard.
7. **AI chat/history ownership:** user and role values are supplied by the request; history endpoints do not confirm that the caller owns the supplied user ID.
8. **HTML email escaping:** user-controlled values are interpolated into HTML templates without a confirmed escaping layer.

## 2. Company Isolation Gaps

1. Company isolation is applied inconsistently across APIs.
2. Attendance reminder selection is global rather than clearly company-scoped.
3. QR attendance routes do not clearly verify company access.
4. AI chat data queries are not consistently company-scoped.
5. AI document and interview-kit generation are not company-specific.
6. A Super Admin can list all companies, but no separate Super Admin company-management page was found.
7. The database does not clearly enforce exactly one office profile per company.

## 3. Role and Permission Inconsistencies

1. The role hierarchy helper defines Company Admin above HR Manager, but some UI helpers explicitly list Super Admin, HR Manager, and Team Lead while omitting Company Admin.
2. Company Admin may not see bulk attendance/reminder submenu items or AI Anomalies despite broad module access in the main role map.
3. The leave page approval permission includes Company Admin, but Team/All tab conditions omit it.
4. AI salary visibility allows Super Admin and HR Manager but unexpectedly omits Company Admin.
5. A database-backed, actively enforced permission-management system was not found. `role_permissions` may exist in a manually modified database, but it is not defined or consumed by the checked repository.
6. Most permissions are UI visibility checks, not authoritative backend guards.

## 4. Employee and Team Model Gaps

1. The Supabase employee mapper sets `managerId` to `null`, so Team Lead dashboards and direct-report filters can be empty.
2. Employee location is hardcoded to Karachi in mapping rather than loaded from a profile column.
3. Employee gender is displayed as a placeholder because no mapped database field was found.
4. Employee code is derived from CNIC or ID rather than a dedicated employee-code column.
5. No complete onboarding workflow was found beyond account creation, credential email, and required password change.
6. No confirmed offboarding, clearance, asset return, document collection, probation, or promotion workflow was found.
7. Employee deletion and its effect on related records is not clearly documented or guarded by an application-level workflow.

## 5. Attendance Gaps

1. The first employee check-in automatically sets the office location when none exists. There is no confirmed requirement that the first employee be an administrator or be physically verified.
2. A unique database constraint for one attendance row per employee per date was not confirmed.
3. Check-in uses `Asia/Karachi`, while checkout and QR paths use UTC or server-local date/time methods. Records may cross dates unexpectedly near midnight.
4. QR generation has a frontend page, but no QR scanner page was found.
5. QR scan does not use location restriction and has no confirmed authentication/role guard.
6. QR late calculation uses a hardcoded time rather than the office profile threshold.
7. Manual override records can be created without location, but the exact allowed-role enforcement is mainly in the UI.
8. Attendance reminders are manually triggered; no schedule, cron job, or queue was found.

## 6. Leave Management Gaps

1. Fixed UI quotas are 20 annual, 10 sick, and 7 casual days. They are not loaded from company settings or a leave-policy table.
2. Pending leave is counted as used because only rejected requests are excluded from the calculation.
3. The database supports a `wfh` leave type, while frontend models and forms primarily expose annual, sick, and casual.
4. AI-generated leave policy defaults reference different leave values, creating policy inconsistency.
5. No half-day leave, leave balance ledger, carry-forward, holiday exclusion, weekend exclusion, attachment, or multi-step approval workflow was confirmed.
6. The API does not clearly validate overlapping requests, end date before start date, available balance, or employee company ownership.

## 7. Payroll Gaps

1. No tax, social contribution, overtime, loan, benefit, or configurable salary-component engine was found.
2. No payslip PDF generation, bank transfer, payment gateway, or accounting export was found.
3. No confirmed uniqueness rule prevents duplicate payroll records for one employee/month/year.
4. Database status `pending` is mapped to the UI term `processing`, which may confuse operators.
5. A personal payroll branch exists in the page logic, but Payroll is not included in the Employee sidebar.
6. Payroll emails and persistent payment notifications were not found.

## 8. Recruitment Gaps

1. No public careers page or applicant self-service application form was found.
2. The main recruitment UI can manage applicants but no clear applicant-creation UI was confirmed.
3. No interview scheduling, interviewer assignment, offer approval, or candidate email workflow was found.
4. No automatic conversion from a hired applicant to an employee was found.
5. Applicant resume score is synthesized from the record ID rather than stored or calculated from the CV.
6. CV upload/storage behavior was not confirmed beyond a `cv_url` field.

## 9. Performance Gaps

1. Goals-completed percentage and completion status are derived by the mapper rather than stored.
2. No review-cycle setup, employee self-review, calibration, approval, competency framework, or goal tracking workflow was confirmed.
3. Team visibility is affected by the missing manager mapping.
4. The API relies mainly on database rating constraints; consistent role/company authorization was not confirmed.

## 10. Announcements and Notifications

1. Announcement priority is captured by the UI but not persisted by the database mapping/schema.
2. No persistent in-app notifications system was found in repository code.
3. No `notifications` table is defined in the checked schema, even if one was manually created in a Supabase project.
4. Announcements do not trigger email in the checked implementation.
5. Read/unread state, delivery tracking, expiry, scheduling, and targeting by individual user were not found.

## 11. Dashboard and Reporting Accuracy

1. Missing attendance dates may be filled with synthetic values for dashboard charts.
2. Attrition and some team chart values use generated fallback data.
3. Applicant resume scores and some performance metrics are derived rather than database facts.
4. Reports send collected metrics to Gemini, so narrative results are nondeterministic and require review.
5. No downloadable report file or scheduled report delivery was confirmed.

## 12. Settings Gaps

1. Company, department, designation, and holiday settings are stored in browser local storage rather than shared database tables through the settings page.
2. A `departments` table exists, but the relationship between that table and local settings is unclear.
3. Office policies are stored as an untyped JSON array; schema-level validation was not found.
4. Logo data may be stored as a URL or base64 value, but no dedicated file-storage integration was confirmed.
5. Work days are stored, but attendance/leave calculations do not consistently use them.
6. No audit history exists for office profile or policy changes.

## 13. Authentication and Password Gaps

1. Login supports plaintext-password fallback during migration; the intended removal date is not defined.
2. The one-time password hashing GET endpoint remains callable and has no authentication.
3. The password-change API enforces minimum length but not all complexity rules enforced by the UI.
4. Wrong OTP attempts update a resend/backoff time, but the verification route does not clearly block verification during that interval.
5. OTP values are stored directly rather than hashed.
6. No account lockout, login-attempt audit, session expiry, token revocation, logout-all-devices, or MFA was found.
7. Forgot-password responses avoid confirming whether an email exists, but delivery and rate limiting are stored by email only.

## 14. Email Delivery Gaps

1. Email is synchronous and has no queue, automatic retry, delivery log, or bounce handling.
2. Credential email failure happens after employee/user creation and can return an error even though the account exists.
3. Leave email failure does not roll back the decision and is returned as a warning.
4. Reminder email sends sequentially and may be slow for a large company.
5. Email templates contain signs of text-encoding issues in some strings.
6. Sender-domain configuration beyond Gmail SMTP was not found.

## 15. Database and Schema Uncertainty

1. The live Supabase database may contain manually executed SQL not represented in repository migrations.
2. `role_permissions`, `activity_logs`, and `notifications` were discussed outside the repository but are not defined or used by the scanned code.
3. Referential delete behavior and cascading rules should be verified against the live database.
4. Unique constraints expected by upsert flows should be verified for attendance, payroll, office profiles, and role permissions.
5. No schema-generated TypeScript database types were found, so row shapes can drift from code models.
6. Seed accounts use a shared plaintext sample password and should be considered development-only.

## 16. Operations, Testing, and Documentation

1. No automated unit, integration, end-to-end, permission, or migration tests were found.
2. No CI workflow, deployment checklist, health endpoint, structured audit logging, or monitoring integration was confirmed.
3. No cron or queue configuration was found.
4. The README is largely default Next.js starter documentation and does not explain HRFlow setup.
5. No backup, restore, retention, privacy, or data-export process was documented in code.
6. No formal Pakistan labor-law validation or legal-review record was found; AI references must not be treated as legal policy.

## 17. Potentially Dead or Partial Paths

1. `/api/hrm` and its JSON files appear to be a legacy/fallback data system; the primary provider uses Supabase module APIs.
2. The Anthropic SDK dependency appears unused.
3. QR scan backend support has no matching scanner page.
4. Personal payroll rendering exists in page logic, but employees have no Payroll navigation item.
5. Company/department/designation/holiday settings appear functional only in the current browser because they are local-storage based.

## 18. Verification Pass Results

The documentation was cross-checked against:

- App Router pages and dashboard navigation.
- All discovered route handlers under `app/api`.
- Authentication, role, context, Supabase, mapping, email, OTP, and AI helpers under `lib` and `contexts`.
- SQL schema, migrations, and seed data under `supabase`.
- Email call sites and in-app toast/alert behavior.
- Package scripts and third-party dependencies.

No controller or service layer, cron configuration, queue worker, persistent notification service, active permission-table integration, or automated test suite was found. Any features existing only in a live database or an uncommitted deployment configuration cannot be confirmed from this repository.
