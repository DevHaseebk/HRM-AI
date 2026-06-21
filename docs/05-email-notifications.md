# Email and Notifications

## Delivery Configuration

All email is sent synchronously with Nodemailer through Gmail SMTP:

- Host: `smtp.gmail.com`
- Port: `587`
- Secure flag: `false` (STARTTLS-capable transport)
- Credentials: `GMAIL_USER` and `GMAIL_APP_PASSWORD`
- From label: `HRFlow`

Primary implementation: `lib/mailer.ts`. The credentials email HTML builder is in `lib/password-utils.ts`.

## Email Catalog

| Email | Trigger | Recipient | Subject | Data included | API/service |
|---|---|---|---|---|---|
| Welcome credentials | Employee or Company Admin created through `POST /api/employees`; also callable directly | New user's email | `Welcome to HRFlow - Your Login Credentials` | Name, email, generated temporary password, login URL, instruction to change password | `sendCredentialsEmail`, `buildCredentialsEmailHtml`, `/api/employees`, `/api/auth/send-credentials` |
| Leave approved | Leave updated to approved | Employee linked to leave | Source contains `Leave Request Approved` plus a check-mark character | Name, leave type, start/end date, inclusive day count, approval message | `sendLeaveStatusEmail`, `PUT /api/leaves/:id` |
| Leave rejected | Leave updated to rejected | Employee linked to leave | Source contains `Leave Request Update` plus a cross character | Name, leave type, start/end date, inclusive day count, contact-HR message | `sendLeaveStatusEmail`, `PUT /api/leaves/:id` |
| Attendance reminder | HR/sidebar or bulk screen manually calls reminder endpoint | Every active employee with email and no marked attendance that date | `Attendance Reminder - Please Mark Your Attendance` | Name, formatted date, link to `/attendance` | `sendAttendanceReminderEmail`, `POST /api/attendance/reminder` |
| Password reset OTP | Known email submits forgot-password and cooldown allows | Account email | `HRFlow - Password Reset OTP` | Six-digit OTP, 10-minute expiry, ignore-if-not-requested warning | `sendPasswordResetOtpEmail`, `POST /api/auth/forgot-password` |

## Credentials Email Flow

1. Employee API generates an eight-character temporary password.
2. It hashes that password with bcrypt before database storage.
3. It creates `employees` and `users` rows and links them.
4. It sends the plaintext temporary password only in the email.
5. The user record has `must_change_password = true`.
6. First login redirects to forced password change.

### Failure behavior

If Gmail sending fails, employee and user rows remain created. The endpoint responds with HTTP 500 and an error saying the employee was created but credentials email failed.

## Leave Status Email Flow

1. Approver updates a leave request to approved/rejected.
2. API loads the employee name/email.
3. HTML includes a branded header and leave detail table.
4. Email send is attempted.
5. On email failure, the leave update remains committed and API returns HTTP 200 with `emailWarning`.

## Attendance Reminder Flow

1. Endpoint selects all active employees, without company filtering.
2. It selects today's attendance rows.
3. Present, late, WFH, half-day, or any record with a check-in timestamp counts as marked.
4. It sends emails one by one to unmarked employees.
5. Response includes sent count, candidate count, and per-employee failure strings.

This is not a cron job. It runs only when a user presses Send Reminders or another caller invokes the endpoint.

## Password Reset Email Flow

1. Unknown email returns generic success without sending.
2. Known email is checked against `next_allowed_at`.
3. A six-digit OTP is stored with a 10-minute expiry.
4. The OTP email is sent.
5. Resend cooldown grows from 1 to 30 minutes based on attempt count.

## In-App Notifications

The repository contains toast messages for immediate UI feedback (success/error/loading) through `components/shared/toast-provider.tsx`. These are transient browser messages, not persistent notifications.

No notification database table, notification API, push notification provider, SMS integration, or notification center is present in the checked repository schema/code.

## Other User-Facing Messages

- Employee creation, updates, deletes, report generation, record moves, and saves use toast feedback.
- Attendance location errors use a red card and location-permission dialog.
- The Admin dashboard's Recent Activity is computed from leave and announcement records; it is not a notification/event log.

## Security and Operational Notes

- `POST /api/auth/send-credentials` accepts arbitrary email/name/password and has no server auth check.
- Email HTML interpolates application values directly; no explicit HTML escaping helper was found.
- Email delivery happens inside the web request. There is no retry queue.
- `NEXT_PUBLIC_APP_URL` controls links in credentials and attendance reminder emails; localhost is the fallback.
- Several source strings show encoding artifacts around symbols; email subjects/footers may display incorrectly depending on source encoding.
