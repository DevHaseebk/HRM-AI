# HRFlow User Manual

This guide explains how to use HRFlow in simple steps. The options visible to you depend on your assigned role.

## 1. Sign In

1. Open the HRFlow login page.
2. Enter your email address and password.
3. Select **Sign In**.
4. If you received a temporary password, HRFlow will ask you to create a new password before continuing.

Your new password must contain at least eight characters, including an uppercase letter, a lowercase letter, and a number.

### Forgotten Password

1. Select **Forgot Password?** on the login page.
2. Enter your registered email address and select **Send OTP**.
3. Check your email for a six-digit code. It expires after 10 minutes.
4. Enter the code on the verification screen.
5. Create and confirm your new password.
6. After a successful reset, return to the login page.

Repeated OTP requests may be temporarily delayed. The screen displays a countdown until another code can be requested.

## 2. Dashboard

The dashboard is different for each role:

- **Super Admin, Company Admin, and HR Manager:** company-wide employee, attendance, leave, payroll, hiring, and performance summaries.
- **Team Lead:** team attendance, pending leave requests, and team performance summaries.
- **Employee:** personal attendance, leave balance, recent payroll information, and announcements.

Some charts use generated fallback values when the database does not contain enough historical data. See `10-missing-or-unclear-items.md` for details.

## 3. Employee Tasks

### Check In

1. Open **Attendance**.
2. Select **Check In**.
3. Allow the browser to use your location.
4. Wait while HRFlow checks your distance from the office.
5. A successful check-in displays the recorded time.

If the office location has already been set, you must be within its allowed radius. If no office location exists, the first employee check-in sets it automatically.

If location permission is blocked, enable location access in the browser settings and try again.

### Check Out

1. Open **Attendance** after checking in.
2. Select **Check Out**.
3. Confirm that the check-out time appears in the attendance record.

### Request Leave

1. Open **Leaves**.
2. Select the option to apply for leave.
3. Choose the leave type and start and end dates.
4. Enter the reason.
5. Submit the request.
6. Track its status as pending, approved, or rejected.

### View Performance

Open **Performance** to view available reviews and ratings. Employees can see their own records; managers may see additional records based on their role.

### Read Announcements

Open **Announcements** to read company or department messages.

### Use the AI Assistant

Open **AI Assistant** and ask an HR-related question in English or Roman Urdu. The assistant can help summarize system data and prepare HR documents, interview questions, anomaly analysis, churn analysis, and reports through the available AI screens.

AI output should be reviewed by an authorized person before it is used for employment, payroll, legal, or policy decisions.

## 4. Team Lead Tasks

### Review Team Information

1. Open **Dashboard** to view team summaries.
2. Open **Attendance** for attendance records.
3. Open **Leaves** to review team requests.
4. Open **Performance** to review or add available performance information.

Team results depend on employees being linked to their manager. That relationship is not fully loaded by the current Supabase employee mapping, so a Team Lead may see an empty team list.

### Approve or Reject Leave

1. Open **Leaves**.
2. Locate a pending team request.
3. Select **Approve** or **Reject**.
4. The employee is emailed about the result when email delivery succeeds.

### Mark Attendance Manually

1. Open **Attendance** and choose the bulk attendance view when it is available.
2. Select a date and status for each employee.
3. Save the attendance.

Manual records bypass the office-location rule and are labelled as an HR override.

## 5. HR Manager Tasks

HR Managers can use the employee, attendance, leave, payroll, recruitment, performance, announcement, report, AI, and settings areas shown in the sidebar.

### Add an Employee

1. Open **Employees**.
2. Select **Add Employee**.
3. Enter the employee's personal and job details.
4. Submit the form.
5. HRFlow creates the employee and login account, then attempts to email temporary credentials.

The employee must change the temporary password at first login.

### Manage Payroll

1. Open **Payroll**.
2. Create or review a payroll record for a month and year.
3. Check basic salary, bonuses, deductions, and net salary.
4. Mark the record as paid when payment has been completed outside HRFlow.

HRFlow records payroll status but the code does not include bank transfer processing or payslip PDF generation.

### Manage Recruitment

1. Open **Recruitment**.
2. Create a job posting with its title, department, description, and requirements.
3. Review applicants in the recruitment board.
4. Move applicants through the available stages.

The available stages are applied, screening, interview, offer, hired, and rejected.

### Publish an Announcement

1. Open **Announcements**.
2. Create a message and choose its audience where available.
3. Publish it.

Announcements appear inside HRFlow. They are not emailed by the current implementation.

## 6. Company Admin Tasks

A Company Admin can work with the same main company modules as HR, including Employees, Attendance, Leaves, Payroll, Recruitment, Performance, Announcements, Reports, AI Assistant, and Settings.

Their data should be limited to their assigned company. This depends on the company ID being present in the signed-in user information and sent with each relevant request.

### Update Office Profile

1. Open **Settings** and select **Office Profile**.
2. Update company contact information and logo.
3. Set check-in time, check-out time, late threshold, grace period, and work days.
4. Set or clear the office location and allowed radius.
5. Add or remove company policies.
6. Save each section.

## 7. Super Admin Tasks

A Super Admin can view data across companies and can create Company Admin accounts.

### Create a Company Admin

1. Open **Employees** and start creating a user.
2. Choose the **Company Admin** role.
3. Select an existing company or enter a new company name.
4. Complete the user details and submit.
5. HRFlow links the account to the selected company and attempts to email temporary credentials.

The repository does not contain a separate Super Admin control panel. Company creation is handled through available company and employee flows.

## 8. QR Attendance

The employee attendance area can generate a QR code. A backend endpoint also exists for scanning and recording attendance. However, no matching QR scanner page was found in the frontend, so the complete scanner workflow cannot be followed from the current user interface.

## 9. Common Problems

### Login Fails

- Confirm the email and password are correct.
- Confirm the deployed application uses the same Supabase project as the local application.
- Ask an administrator whether the account exists and is active.
- Use **Forgot Password?** if needed.

### Location Check-In Fails

- Enable browser location permission.
- Turn on the device's location service.
- Move within the configured office radius.
- Ask HR to verify the office coordinates and radius in **Settings**.

### Email Does Not Arrive

- Check spam or junk mail.
- Confirm the account email address is correct.
- Ask an administrator to verify Gmail SMTP environment settings.

### A Menu Is Missing

Menus depend on your role. A few Company Admin submenu conditions are inconsistent in the current code and are recorded in `10-missing-or-unclear-items.md`.
