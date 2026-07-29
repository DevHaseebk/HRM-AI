-- Migration 012: complete migration 006, which was only partially applied
-- to the live database.
--
-- `office_profiles.grace_period_minutes` and `office_profiles.work_days`
-- are declared in 006 but were missing live. Both are referenced by
-- backend code, so their absence broke two features outright:
--   * attendance.controller.ts checkIn() selects grace_period_minutes
--     -> POST /api/attendance/checkin returned HTTP 500 for every user
--   * officeProfile.controller.ts saveOfficeProfile() writes both
--     -> POST /api/office-profile always failed, so no office profile
--        (check-in time, late threshold, office location/radius, work
--        days) could ever be saved
--
-- The three indexes below are also from 006 and were likewise missing.
-- They are performance-only, no behavioral impact.
--
-- Safe/idempotent: additive columns with defaults, `if not exists`
-- throughout. office_profiles had 0 rows when this was applied.

alter table office_profiles add column if not exists grace_period_minutes int default 0;
alter table office_profiles add column if not exists work_days text[]
  default array['Monday','Tuesday','Wednesday','Thursday','Friday'];

create index if not exists office_profiles_company_id_idx on office_profiles(company_id);
create index if not exists employees_company_id_idx on employees(company_id);
create index if not exists users_company_id_idx on users(company_id);

NOTIFY pgrst, 'reload schema';
