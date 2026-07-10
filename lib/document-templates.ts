export interface DocumentTemplate {
  id: string;
  type: string;
  name: string;
  content: string;
  variables: string[];
  companyId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const FIELD_VARIABLE_OVERRIDES: Record<string, string> = {
  employeeName: "employee_name",
  salary: "salary",
  incidentDate: "date",
  date: "date",
  joiningDate: "joining_date",
  designation: "designation",
  department: "department",
  companyName: "company_name",
};

const VARIABLE_FIELD_OVERRIDES: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_VARIABLE_OVERRIDES).map(([field, variable]) => [variable, field])
);

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  offer_letter: "Offer Letter",
  appointment_letter: "Appointment Letter",
  warning_letter: "Warning Letter",
  termination_letter: "Termination Letter",
  experience_letter: "Experience Letter",
  job_description: "Job Description",
  performance_review_template: "Performance Review Template",
  hr_policy: "HR Policy",
  leave_policy: "Leave Policy",
  remote_work_policy: "Remote Work Policy",
  code_of_conduct: "Code of Conduct",
  performance_review_policy: "Performance Review Policy",
  salary_increment_policy: "Salary Increment Policy",
};

export function fieldToVariable(field: string): string {
  return FIELD_VARIABLE_OVERRIDES[field] ?? field.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

export function variableToField(variable: string): string {
  return VARIABLE_FIELD_OVERRIDES[variable] ?? variable.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function variableLabel(variable: string): string {
  return variable
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function extractVariablesFromContent(content: string): string[] {
  const variables = new Set<string>();
  const pattern = /{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g;
  let match = pattern.exec(content);
  while (match) {
    variables.add(match[1]);
    match = pattern.exec(content);
  }
  return Array.from(variables);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dateVariants(value: string): string[] {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return [];
  return [
    date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  ];
}

function replacementCandidates(field: string, value: unknown): string[] {
  if (value === null || value === undefined || value === "") return [];
  const raw = String(value).trim();
  const candidates = [raw];
  if (/date/i.test(field) && /^\d{4}-\d{2}-\d{2}$/.test(raw)) candidates.push(...dateVariants(raw));
  if (/salary|amount/i.test(field)) {
    const amount = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(amount)) candidates.push(amount.toLocaleString("en-US"), amount.toLocaleString("en-PK"));
  }
  return Array.from(new Set(candidates.filter(Boolean))).sort((a, b) => b.length - a.length);
}

export function extractTemplate(
  document: string,
  formData: Record<string, unknown>
): { content: string; variables: string[] } {
  let content = document;
  const variables = new Set<string>();
  const entries = Object.entries(formData)
    .filter(([field]) => field !== "employeePicker")
    .sort(([, a], [, b]) => String(b ?? "").length - String(a ?? "").length);

  entries.forEach(([field, value]) => {
    const variable = fieldToVariable(field);
    let replaced = false;
    replacementCandidates(field, value).forEach((candidate) => {
      const pattern = new RegExp(escapeRegExp(candidate), "gi");
      if (pattern.test(content)) {
        content = content.replace(pattern, `{{${variable}}}`);
        replaced = true;
      }
    });
    if (replaced) variables.add(variable);
  });

  extractVariablesFromContent(content).forEach((variable) => variables.add(variable));
  return { content, variables: Array.from(variables) };
}

export function renderTemplate(
  content: string,
  values: Record<string, unknown>
): string {
  return content.replace(/{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g, (placeholder, variable: string) => {
    const field = variableToField(variable);
    const value = values[variable] ?? values[field];
    return value === null || value === undefined || value === "" ? placeholder : String(value);
  });
}

export function mapTemplateRow(row: Record<string, unknown>): DocumentTemplate {
  return {
    id: String(row.id),
    type: String(row.type),
    name: String(row.name),
    content: String(row.content),
    variables: Array.isArray(row.variables) ? row.variables.map(String) : [],
    companyId: row.company_id ? String(row.company_id) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
  };
}
