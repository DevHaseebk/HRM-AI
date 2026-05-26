import { NextResponse } from "next/server";
import { askGemini, GeminiError } from "@/lib/ai-gemini";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type DocumentType =
  | "offer_letter"
  | "appointment_letter"
  | "warning_letter"
  | "termination_letter"
  | "experience_letter"
  | "hr_policy"
  | "job_description"
  | "performance_review_template"
  // Policy sub-types
  | "leave_policy"
  | "remote_work_policy"
  | "code_of_conduct"
  | "performance_review_policy"
  | "salary_increment_policy";

const SYSTEM_BASE = `You are a senior HR professional at a Pakistani software company called HRFlow.
You write formal HR documents in Pakistani business letter format.

GUIDELINES:
- Use formal, professional English
- Reference relevant Pakistani labour law where appropriate (Shops & Establishments Ordinance 1969, Pakistan Labour Act, EOBI, PESSI / SESSI)
- Use PKR symbol for amounts; format numbers with commas
- Use proper date format: 27 May 2026
- Never invent facts. Use ONLY the data provided
- Output PLAIN TEXT (no markdown asterisks for bold) — use UPPERCASE for section headings
- Always include: company letterhead area, date, recipient, body, closing, signature block
- Be concise but complete (typically 250–500 words)`;

interface PromptBuilder {
  (data: Record<string, any>): { prompt: string; required: string[] };
}

const PROMPTS: Record<DocumentType, PromptBuilder> = {
  offer_letter: (d) => ({
    required: ["employeeName", "designation", "salary", "joiningDate"],
    prompt: `Draft a formal JOB OFFER LETTER with these details:

Candidate Name: ${d.employeeName}
Designation: ${d.designation}
Department: ${d.department ?? "—"}
Monthly Salary: PKR ${Number(d.salary).toLocaleString()}
Joining Date: ${d.joiningDate}
Probation Period: ${d.probation ?? "3 months"}
Location: ${d.location ?? "Karachi, Pakistan"}
Reporting To: ${d.reportingTo ?? "Department Head"}

Include: subject line, congratulations paragraph, role summary, full compensation breakdown (basic, benefits, EOBI), probation terms, working hours (9 AM – 6 PM, Mon–Fri), confidentiality clause, acceptance instructions, signature block.`,
  }),

  appointment_letter: (d) => ({
    required: ["employeeName", "designation", "salary", "joiningDate"],
    prompt: `Draft a formal APPOINTMENT LETTER (post-acceptance) for:

Employee Name: ${d.employeeName}
Designation: ${d.designation}
Department: ${d.department ?? "—"}
Monthly Salary: PKR ${Number(d.salary).toLocaleString()}
Date of Joining: ${d.joiningDate}
Probation: ${d.probation ?? "3 months"}
Employee ID: ${d.employeeCode ?? "To be assigned"}

Include: welcome, confirmation of position & terms, working hours, leave entitlements (annual 14 days, sick 8 days, casual 10 days per Pakistani standards), notice period (1 month after probation), code of conduct reference, signature block for acceptance.`,
  }),

  warning_letter: (d) => ({
    required: ["employeeName", "violationType", "incidentDate"],
    prompt: `Draft a FIRST FORMAL WARNING LETTER for:

Employee Name: ${d.employeeName}
Designation: ${d.designation ?? "Employee"}
Department: ${d.department ?? "—"}
Violation Type: ${d.violationType}
Date of Incident: ${d.incidentDate}
Description: ${d.description ?? "(none provided)"}
Issued By: ${d.issuedBy ?? "HR Manager"}

The letter must:
- Be firm but professional and compliant with Pakistani labour law
- Reference specific incident clearly
- State expected behaviour going forward
- Mention consequences of repeat offence (further warning / termination)
- Request employee acknowledgement signature
- Be filed in employee's personnel record`,
  }),

  termination_letter: (d) => ({
    required: ["employeeName", "lastWorkingDate", "reason"],
    prompt: `Draft a TERMINATION LETTER for:

Employee Name: ${d.employeeName}
Designation: ${d.designation ?? "Employee"}
Department: ${d.department ?? "—"}
Date of Joining: ${d.joiningDate ?? "—"}
Last Working Date: ${d.lastWorkingDate}
Reason for Termination: ${d.reason}
Notice Period: ${d.noticePeriod ?? "30 days"}

The letter must:
- Be respectful and legally compliant (Shops & Establishments Ordinance)
- State termination reason factually (do not be inflammatory)
- Detail final settlement: pending salary, leave encashment, EOBI clearance, gratuity if applicable
- Mention return of company property
- Confirm experience letter will be provided on clearance
- Reference any notice / severance per Pakistani labour standards`,
  }),

  experience_letter: (d) => ({
    required: ["employeeName", "joiningDate", "lastWorkingDate", "designation"],
    prompt: `Draft an EXPERIENCE / SERVICE LETTER for:

Employee Name: ${d.employeeName}
Designation Held: ${d.designation}
Department: ${d.department ?? "—"}
Date of Joining: ${d.joiningDate}
Last Working Date: ${d.lastWorkingDate}
Performance Note: ${d.performanceNote ?? "satisfactory"}

The letter must:
- Confirm employment period with HRFlow
- State designation, department, key responsibilities
- Comment positively on conduct & performance
- Wish the employee well for future endeavours
- Be issued on company letterhead, signed by HR Manager
- Be suitable as a verification document for future employers`,
  }),

  job_description: (d) => ({
    required: ["jobTitle"],
    prompt: `Write a detailed JOB DESCRIPTION for a Pakistani software company:

Job Title: ${d.jobTitle}
Department: ${d.department ?? "Engineering"}
Experience Level: ${d.experienceLevel ?? "Mid (3–5 years)"}
Location: ${d.location ?? "Karachi / Hybrid"}
Salary Range: ${d.salaryRange ?? "PKR 150,000 – 250,000"}

Include sections: Job Summary, Key Responsibilities (8–10 bullets), Required Qualifications, Preferred Skills, Experience Requirements, Salary & Benefits (PKR, EOBI, medical, leaves), How to Apply.`,
  }),

  performance_review_template: (d) => ({
    required: ["employeeName"],
    prompt: `Write a SEMI-ANNUAL PERFORMANCE REVIEW TEMPLATE for:

Employee Name: ${d.employeeName}
Designation: ${d.designation ?? "—"}
Department: ${d.department ?? "—"}
Review Period: ${d.reviewPeriod ?? "Jan – Jun"}
Reviewer: ${d.reviewer ?? "Direct Manager"}

Sections to include:
- Overall Rating (1–5 scale with descriptors)
- Key Achievements (placeholder bullets)
- Areas of Strength
- Areas for Improvement
- Goals for Next Period (3–5 SMART goals)
- Career Development Plan
- Manager Comments
- Employee Comments
- Signatures`,
  }),

  hr_policy: (d) => ({
    required: ["policyTitle"],
    prompt: `Draft an HR POLICY DOCUMENT titled "${d.policyTitle}":

Company: ${d.companyName ?? "HRFlow"}
Industry: ${d.industry ?? "Software"}
Company Size: ${d.companySize ?? "50–200 employees"}
Specific Requirements: ${d.requirements ?? "(none provided)"}

Structure (full sections):
1. PURPOSE
2. SCOPE
3. DEFINITIONS
4. POLICY DETAILS
5. EMPLOYEE RESPONSIBILITIES
6. MANAGEMENT RESPONSIBILITIES
7. VIOLATIONS & CONSEQUENCES
8. EFFECTIVE DATE & REVIEW PERIOD
9. APPROVAL

Reference Pakistani labour law where relevant.`,
  }),

  leave_policy: (d) => ({
    required: [],
    prompt: `Draft a comprehensive LEAVE POLICY document for ${d.companyName ?? "HRFlow"} (${d.industry ?? "Software"}, ${d.companySize ?? "50–200 employees"}).

Specific requirements: ${d.requirements ?? "Cover annual, sick, casual, maternity, paternity, hajj, marriage and bereavement leave"}

Include full sections: PURPOSE, SCOPE, DEFINITIONS, LEAVE TYPES & ENTITLEMENTS (annual 14, sick 8, casual 10, maternity 90, paternity 7 per Pakistani norms), APPLICATION PROCESS, APPROVAL WORKFLOW, LEAVE WITHOUT PAY, CARRY-FORWARD & ENCASHMENT, HOLIDAY CALENDAR REFERENCE (Pakistan), VIOLATIONS, EFFECTIVE DATE.`,
  }),

  remote_work_policy: (d) => ({
    required: [],
    prompt: `Draft a REMOTE WORK / WORK-FROM-HOME POLICY for ${d.companyName ?? "HRFlow"} (${d.industry ?? "Software"}).

Specific requirements: ${d.requirements ?? "(standard hybrid policy)"}

Include: PURPOSE, SCOPE, ELIGIBILITY (probation, role-based), WORK HOURS (9 AM – 6 PM PKT), EQUIPMENT & INTERNET ALLOWANCE (PKR), SECURITY & DATA PROTECTION, COMMUNICATION EXPECTATIONS, PERFORMANCE STANDARDS, MEETING ATTENDANCE, IN-OFFICE DAYS REQUIRED, VIOLATIONS, EFFECTIVE DATE.`,
  }),

  code_of_conduct: (d) => ({
    required: [],
    prompt: `Draft a CODE OF CONDUCT for ${d.companyName ?? "HRFlow"}.

Specific requirements: ${d.requirements ?? "(comprehensive)"}

Include: PURPOSE, CORE VALUES, PROFESSIONAL BEHAVIOUR, DRESS CODE, PUNCTUALITY & ATTENDANCE, ANTI-HARASSMENT POLICY (compliant with Pakistan's Protection Against Harassment of Women at Workplace Act 2010), CONFIDENTIALITY & IP, CONFLICT OF INTEREST, SOCIAL MEDIA, GIFTS & GRATUITIES, REPORTING VIOLATIONS, DISCIPLINARY ACTIONS, EFFECTIVE DATE.`,
  }),

  performance_review_policy: (d) => ({
    required: [],
    prompt: `Draft a PERFORMANCE REVIEW POLICY for ${d.companyName ?? "HRFlow"}.

Specific requirements: ${d.requirements ?? "(standard)"}

Include: PURPOSE, REVIEW FREQUENCY (quarterly / annual), RATING SCALE (1–5), KEY COMPETENCIES, GOAL-SETTING (SMART), 360° FEEDBACK, REVIEWER RESPONSIBILITIES, EMPLOYEE RESPONSIBILITIES, IMPROVEMENT PLANS (PIP), CONNECTION TO INCREMENTS & PROMOTIONS, APPEALS PROCESS, EFFECTIVE DATE.`,
  }),

  salary_increment_policy: (d) => ({
    required: [],
    prompt: `Draft a SALARY INCREMENT POLICY for ${d.companyName ?? "HRFlow"}.

Specific requirements: ${d.requirements ?? "(merit-based annual increments)"}

Include: PURPOSE, ELIGIBILITY (1+ year tenure), INCREMENT CYCLES (annual, July–June fiscal), MERIT MATRIX (rating × % increment), MID-YEAR ADJUSTMENTS, PROMOTION-BASED INCREMENTS, MARKET BENCHMARKING, INFLATION ADJUSTMENT (PKR context), COMMUNICATION, EFFECTIVE DATE.`,
  }),
};

export async function POST(request: Request) {
  let body: { documentType?: DocumentType; formData?: Record<string, any> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { documentType, formData = {} } = body;
  if (!documentType || !PROMPTS[documentType]) {
    return NextResponse.json(
      { error: "Unknown or missing documentType" },
      { status: 400 }
    );
  }

  const { prompt, required } = PROMPTS[documentType](formData);

  const missing = required.filter((field) => !formData[field]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required field(s): ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const text = await askGemini(SYSTEM_BASE, prompt, {
      temperature: 0.55,
      maxOutputTokens: 2048,
    });
    return NextResponse.json({ document: text, documentType });
  } catch (err) {
    const status = err instanceof GeminiError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Document generation failed";
    return NextResponse.json({ error: message }, { status });
  }
}
