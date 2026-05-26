import nodemailer from "nodemailer";
import { buildCredentialsEmailHtml } from "@/lib/password-utils";
import { daysBetween } from "@/lib/db-mappers";

function getTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendCredentialsEmail(
  email: string,
  name: string,
  password: string
) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail SMTP credentials are not configured");
  }

  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"HRFlow" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Welcome to HRFlow - Your Login Credentials",
    html: buildCredentialsEmailHtml(name, email, password),
  });
}

interface LeaveEmailDetails {
  name: string;
  email: string;
  leaveType: string;
  startDate: string;
  endDate: string;
}

function formatLeaveType(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ");
}

function buildLeaveDetailsTable(details: LeaveEmailDetails) {
  const days = daysBetween(details.startDate, details.endDate);
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:20px 0;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
        <span style="color:#64748b;font-size:13px;">Type</span><br/>
        <span style="color:#0f172a;font-size:15px;font-weight:600;">${formatLeaveType(details.leaveType)}</span>
      </td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
        <span style="color:#64748b;font-size:13px;">From</span><br/>
        <span style="color:#0f172a;font-size:15px;">${details.startDate}</span>
      </td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
        <span style="color:#64748b;font-size:13px;">To</span><br/>
        <span style="color:#0f172a;font-size:15px;">${details.endDate}</span>
      </td></tr>
      <tr><td style="padding:12px 16px;">
        <span style="color:#64748b;font-size:13px;">Duration</span><br/>
        <span style="color:#0f172a;font-size:15px;font-weight:600;">${days} day${days === 1 ? "" : "s"}</span>
      </td></tr>
    </table>`;
}

function buildLeaveEmailShell(headerBg: string, headerText: string, bodyHtml: string, footerText: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${headerBg};padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">${headerText}</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">HRFlow Leave Management</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#64748b;font-size:13px;text-align:center;">${footerText}</p>
            <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;text-align:center;">© HRFlow · Karachi, Pakistan</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendLeaveStatusEmail(
  status: "approved" | "rejected",
  details: LeaveEmailDetails
) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail SMTP credentials are not configured");
  }

  const table = buildLeaveDetailsTable(details);
  let subject: string;
  let html: string;

  if (status === "approved") {
    subject = "Leave Request Approved ✅";
    html = buildLeaveEmailShell(
      "linear-gradient(135deg,#16a34a,#15803d)",
      "Leave Request Approved ✅",
      `
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;">Dear ${details.name},</h2>
        <p style="margin:0 0 8px;color:#475569;font-size:15px;line-height:1.6;">
          Your leave request has been <strong style="color:#16a34a;">approved</strong>!
        </p>
        ${table}
        <p style="margin:0;color:#475569;font-size:15px;">Enjoy your time off!</p>
      `,
      "This is an automated notification from HRFlow."
    );
  } else {
    subject = "Leave Request Update ❌";
    html = buildLeaveEmailShell(
      "linear-gradient(135deg,#dc2626,#b91c1c)",
      "Leave Request Update ❌",
      `
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;">Dear ${details.name},</h2>
        <p style="margin:0 0 8px;color:#475569;font-size:15px;line-height:1.6;">
          Unfortunately your leave request was <strong style="color:#dc2626;">not approved</strong>.
        </p>
        ${table}
        <p style="margin:0;color:#475569;font-size:15px;">Please contact HR for more information.</p>
      `,
      "This is an automated notification from HRFlow."
    );
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"HRFlow" <${process.env.GMAIL_USER}>`,
    to: details.email,
    subject,
    html,
  });
}

export async function sendAttendanceReminderEmail(
  name: string,
  email: string,
  dateLabel: string
) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail SMTP credentials are not configured");
  }

  const loginUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/attendance`
    : "http://localhost:3000/attendance";

  const html = buildLeaveEmailShell(
    "linear-gradient(135deg,#f59e0b,#d97706)",
    "Attendance Reminder ⏰",
    `
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;">Dear ${name},</h2>
      <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
        Please mark your attendance for today <strong>${dateLabel}</strong>. Login to HRFlow and check in.
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr><td align="center">
          <a href="${loginUrl}" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:bold;">
            Mark Attendance
          </a>
        </td></tr>
      </table>
    `,
    "This is an automated reminder from HRFlow."
  );

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"HRFlow" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Attendance Reminder - Please Mark Your Attendance",
    html,
  });
}
