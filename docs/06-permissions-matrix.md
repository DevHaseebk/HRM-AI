# Permissions Matrix

## Legend

- **Manage**: UI exposes create/update/delete or approval actions.
- **View**: UI exposes read-only or self-service access.
- **Own**: intended to show the user's linked employee records.
- **Team**: intended to show direct reports.
- **Company**: APIs attempt to filter by the stored company header.
- **None**: no navigation/page action in the normal UI.

This matrix describes frontend behavior first. API routes often lack independent role checks; see the Notes column.

| Feature | Super Admin | Company Admin | HR Manager | Team Lead | Employee | Notes |
|---|---|---|---|---|---|---|
| Dashboard | Admin dashboard, all available data | Admin dashboard, company data | Admin dashboard | Team dashboard | Employee dashboard | Admin charts include synthetic fallback data |
| Companies | List/create/manage through employee onboarding | Own company list only when scoped | No normal company creation UI | None | None | Only Companies POST has an explicit Super Admin header check |
| Employee directory | Manage/export | Manage/export company | Manage/export company | None in main menu | None | APIs trust client role/company headers |
| Create Company Admin | Manage | None | None | None | None | Super Admin-only UI and API role branch |
| Attendance overview | View all | View company all | View company all | Team + own | Own | Company Admin included by `canManageEmployees` |
| Self location check-in/out | If linked | If linked | If linked | If linked | Own | Attendance UI renders My tab for everyone; normal employee use is primary |
| QR attendance code | Only if role is Employee and linked | None | None | None | Own | QR scan API itself is public/no role guard |
| Bulk attendance override | Sidebar helper excludes Company Admin; page reachable by role logic | Main page link allows via `isAdmin` | Manage | Manage team | None | API always writes `hr_override`; no explicit role check |
| Send attendance reminders | Sidebar button | Sidebar helper currently omits Company Admin | Sidebar and bulk page | Bulk page may show depending on UI branch, reminder button only `isHr` in page | None | Reminder API is unscoped and unguarded |
| Leaves: apply/view own | Own | Own | Own | Own | Own | Requires linked employee for meaningful own data |
| Leaves: team/all | All | Intended company all, but page tab conditions omit Company Admin | All | Team | None | `canApproveLeaves` includes Company Admin despite tabs mismatch |
| Leave approve/reject | Manage | Helper says Manage | Manage | Manage team | None | API has no role/direct-report check |
| Payroll | Manage all | Manage company | Manage company | None | No menu; page contains own-filter branch | No payroll email/export/PDF |
| Recruitment | Manage | Manage company | Manage company | None | None | Job/applicant APIs have no role guard |
| Performance | Manage all | Manage company | Manage company | Manage team | View own | Team membership may fail because mapped manager ID is null |
| Announcements | Publish/delete/read | Publish/delete/read company | Publish/delete/read company | Read | Read | Priority is not persisted by current mapper/schema |
| AI Chat | Use | Use | Use | Use | Use | Role/name supplied by client; chat data scoping is incomplete |
| AI Documents | Use | Use | Use | Use | Use | No role guard on document/interview APIs |
| AI Anomalies | Sidebar visible | Sidebar helper currently omits Company Admin | Visible | Visible | Hidden | Endpoint has company filter header but no role guard |
| Monthly reports/churn | Use | Use company | Use company | None | None | Report/churn pages follow main navigation roles |
| Settings: Company/Departments/Designations/Holidays | Edit/view | Edit/view | Hidden | None | None | Saved only to browser localStorage |
| Settings: Office Profile | Manage | Manage company | Manage company | None | None | Supabase-backed; no API role guard |
| Change password | Own | Own | Own | Own | Own | API accepts caller-supplied user ID |
| Forgot password | Public | Public | Public | Public | Public | OTP flow is role-independent |
| Legacy JSON API | API callable | API callable | API callable | API callable | API callable | No auth/role checks; not used by primary UI |

## Navigation Source of Truth

The primary navigation role list in `lib/auth.ts` is:

| Menu | Roles |
|---|---|
| Dashboard | All five roles |
| Employees | Super Admin, Company Admin, HR Manager |
| Attendance | All five roles |
| Leaves | All five roles |
| Payroll | Super Admin, Company Admin, HR Manager |
| Recruitment | Super Admin, Company Admin, HR Manager |
| Performance | All five roles |
| Announcements | All five roles |
| AI Assistant | All five roles |
| Reports | Super Admin, Company Admin, HR Manager |
| Settings | Super Admin, Company Admin, HR Manager |

## Company Scope Rules in Code

1. Login returns `companyId` from user or linked employee.
2. Browser stores it in localStorage.
3. Client API helpers send it as `x-company-id` with `x-user-role`.
4. `getCompanyScope` considers requests scoped only when a company header exists and role is not Super Admin.
5. Missing company ID means no company filter, even for non-Super-Admin roles.

## Server Authorization Gaps

- Middleware protects pages but excludes all `/api` routes.
- Most APIs do not verify the auth cookie.
- Most APIs do not compare requested role/action against a server-side permission table.
- `ROLE_RANK` is defined but not used to authorize API actions.
- No Supabase RLS policies are present in repository SQL.
