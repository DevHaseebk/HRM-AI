"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Briefcase,
  ClipboardCheck,
  ClipboardCopy,
  Edit3,
  FileCheck2,
  FileText,
  Gavel,
  Handshake,
  Loader2,
  MessageCircleQuestion,
  Printer,
  RefreshCw,
  Save,
  ScrollText,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { AiAssistantTabs } from "@/components/shared/ai-assistant-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-provider";
import { useApiCall } from "@/hooks/useApiCall";
import { useHrmData } from "@/components/shared/hrm-data-provider";
import { usePermissions } from "@/components/shared/permissions-provider";
import { getClientAuthHeaders } from "@/lib/company-scope";
import type { Employee } from "@/lib/types";
import {
  extractTemplate,
  renderTemplate,
  variableLabel,
  variableToField,
  type DocumentTemplate,
} from "@/lib/document-templates";

/* eslint-disable @typescript-eslint/no-explicit-any */

type DocCategory = "letter" | "policy" | "other";

interface DocType {
  id: string;
  label: string;
  emoji: string;
  icon: typeof FileText;
  category: DocCategory;
  description: string;
  fields: Field[];
  /** Pre-fill from selected employee */
  prefillFromEmployee?: (e: Employee) => Record<string, any>;
}

type FieldType = "text" | "number" | "date" | "textarea" | "select" | "employee";

interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
}

const DOC_TYPES: DocType[] = [
  {
    id: "offer_letter",
    label: "Offer Letter",
    emoji: "📄",
    icon: FileText,
    category: "letter",
    description: "Formal offer to a candidate before joining",
    fields: [
      { name: "employeeName", label: "Candidate Name", type: "text", required: true },
      { name: "designation", label: "Designation", type: "text", required: true },
      { name: "department", label: "Department", type: "text" },
      { name: "salary", label: "Monthly Salary (PKR)", type: "number", required: true },
      { name: "joiningDate", label: "Joining Date", type: "date", required: true },
      { name: "probation", label: "Probation Period", type: "text", defaultValue: "3 months" },
      { name: "reportingTo", label: "Reporting To", type: "text" },
      { name: "location", label: "Location", type: "text", defaultValue: "Karachi, Pakistan" },
    ],
  },
  {
    id: "appointment_letter",
    label: "Appointment Letter",
    emoji: "🤝",
    icon: Handshake,
    category: "letter",
    description: "Confirms position after candidate accepts offer",
    fields: [
      { name: "employeePicker", label: "Select Existing Employee", type: "employee" },
      { name: "employeeName", label: "Employee Name", type: "text", required: true },
      { name: "designation", label: "Designation", type: "text", required: true },
      { name: "department", label: "Department", type: "text" },
      { name: "salary", label: "Monthly Salary (PKR)", type: "number", required: true },
      { name: "joiningDate", label: "Joining Date", type: "date", required: true },
      { name: "probation", label: "Probation", type: "text", defaultValue: "3 months" },
      { name: "employeeCode", label: "Employee ID", type: "text" },
    ],
    prefillFromEmployee: (e) => ({
      employeeName: e.name,
      designation: e.designation,
      department: e.department,
      salary: e.salary,
      joiningDate: e.joinDate,
      employeeCode: e.employeeCode,
    }),
  },
  {
    id: "warning_letter",
    label: "Warning Letter",
    emoji: "⚠️",
    icon: ShieldAlert,
    category: "letter",
    description: "First formal warning for policy violation",
    fields: [
      { name: "employeePicker", label: "Select Employee", type: "employee" },
      { name: "employeeName", label: "Employee Name", type: "text", required: true },
      { name: "designation", label: "Designation", type: "text" },
      { name: "department", label: "Department", type: "text" },
      {
        name: "violationType",
        label: "Violation Type",
        type: "select",
        required: true,
        options: [
          "Repeated Tardiness",
          "Unauthorized Absence",
          "Performance Issue",
          "Misconduct",
          "Insubordination",
          "Policy Breach",
        ],
      },
      { name: "incidentDate", label: "Date of Incident", type: "date", required: true },
      { name: "description", label: "Description / Details", type: "textarea" },
      { name: "issuedBy", label: "Issued By", type: "text", defaultValue: "HR Manager" },
    ],
    prefillFromEmployee: (e) => ({
      employeeName: e.name,
      designation: e.designation,
      department: e.department,
    }),
  },
  {
    id: "termination_letter",
    label: "Termination Letter",
    emoji: "🚪",
    icon: Gavel,
    category: "letter",
    description: "Formal end of employment with settlement details",
    fields: [
      { name: "employeePicker", label: "Select Employee", type: "employee" },
      { name: "employeeName", label: "Employee Name", type: "text", required: true },
      { name: "designation", label: "Designation", type: "text" },
      { name: "department", label: "Department", type: "text" },
      { name: "joiningDate", label: "Date of Joining", type: "date" },
      { name: "lastWorkingDate", label: "Last Working Date", type: "date", required: true },
      { name: "reason", label: "Reason", type: "textarea", required: true },
      { name: "noticePeriod", label: "Notice Period", type: "text", defaultValue: "30 days" },
    ],
    prefillFromEmployee: (e) => ({
      employeeName: e.name,
      designation: e.designation,
      department: e.department,
      joiningDate: e.joinDate,
    }),
  },
  {
    id: "experience_letter",
    label: "Experience Letter",
    emoji: "🏆",
    icon: Award,
    category: "letter",
    description: "Service / experience certificate on exit",
    fields: [
      { name: "employeePicker", label: "Select Employee", type: "employee" },
      { name: "employeeName", label: "Employee Name", type: "text", required: true },
      { name: "designation", label: "Designation Held", type: "text", required: true },
      { name: "department", label: "Department", type: "text" },
      { name: "joiningDate", label: "Joining Date", type: "date", required: true },
      { name: "lastWorkingDate", label: "Last Working Date", type: "date", required: true },
      { name: "performanceNote", label: "Performance Note", type: "text", defaultValue: "satisfactory" },
    ],
    prefillFromEmployee: (e) => ({
      employeeName: e.name,
      designation: e.designation,
      department: e.department,
      joiningDate: e.joinDate,
    }),
  },
  {
    id: "job_description",
    label: "Job Description",
    emoji: "💼",
    icon: Briefcase,
    category: "other",
    description: "Detailed JD for posting on job boards",
    fields: [
      { name: "jobTitle", label: "Job Title", type: "text", required: true },
      { name: "department", label: "Department", type: "text", defaultValue: "Engineering" },
      {
        name: "experienceLevel",
        label: "Experience Level",
        type: "select",
        defaultValue: "Mid (3–5 years)",
        options: ["Junior (0–2 years)", "Mid (3–5 years)", "Senior (5+ years)", "Lead (8+ years)"],
      },
      { name: "location", label: "Location", type: "text", defaultValue: "Karachi / Hybrid" },
      { name: "salaryRange", label: "Salary Range (PKR)", type: "text", defaultValue: "PKR 150,000 – 250,000" },
    ],
  },
  {
    id: "performance_review_template",
    label: "Performance Review",
    emoji: "📊",
    icon: TrendingUp,
    category: "other",
    description: "Semi-annual review template",
    fields: [
      { name: "employeePicker", label: "Select Employee", type: "employee" },
      { name: "employeeName", label: "Employee Name", type: "text", required: true },
      { name: "designation", label: "Designation", type: "text" },
      { name: "department", label: "Department", type: "text" },
      { name: "reviewPeriod", label: "Review Period", type: "text", defaultValue: "Jan – Jun 2026" },
      { name: "reviewer", label: "Reviewer", type: "text", defaultValue: "Direct Manager" },
    ],
    prefillFromEmployee: (e) => ({
      employeeName: e.name,
      designation: e.designation,
      department: e.department,
    }),
  },
  {
    id: "hr_policy",
    label: "Custom HR Policy",
    emoji: "📋",
    icon: ScrollText,
    category: "policy",
    description: "Generic HR policy with your specifications",
    fields: [
      { name: "policyTitle", label: "Policy Title", type: "text", required: true, placeholder: "e.g., Internet Usage Policy" },
      { name: "companyName", label: "Company Name", type: "text", defaultValue: "HRFlow" },
      { name: "industry", label: "Industry", type: "text", defaultValue: "Software" },
      { name: "companySize", label: "Company Size", type: "text", defaultValue: "50–200 employees" },
      { name: "requirements", label: "Specific Requirements", type: "textarea", placeholder: "What should this policy cover?" },
    ],
  },
  {
    id: "leave_policy",
    label: "Leave Policy",
    emoji: "🌴",
    icon: ClipboardCheck,
    category: "policy",
    description: "Comprehensive leave entitlements policy",
    fields: [
      { name: "companyName", label: "Company Name", type: "text", defaultValue: "HRFlow" },
      { name: "industry", label: "Industry", type: "text", defaultValue: "Software" },
      { name: "companySize", label: "Company Size", type: "text", defaultValue: "50–200 employees" },
      { name: "requirements", label: "Specific Requirements", type: "textarea" },
    ],
  },
  {
    id: "remote_work_policy",
    label: "Remote Work Policy",
    emoji: "🏠",
    icon: UsersRound,
    category: "policy",
    description: "WFH / hybrid policy & expectations",
    fields: [
      { name: "companyName", label: "Company Name", type: "text", defaultValue: "HRFlow" },
      { name: "industry", label: "Industry", type: "text", defaultValue: "Software" },
      { name: "requirements", label: "Specific Requirements", type: "textarea" },
    ],
  },
  {
    id: "code_of_conduct",
    label: "Code of Conduct",
    emoji: "🛡️",
    icon: Shield,
    category: "policy",
    description: "Workplace ethics and behaviour policy",
    fields: [
      { name: "companyName", label: "Company Name", type: "text", defaultValue: "HRFlow" },
      { name: "requirements", label: "Specific Requirements", type: "textarea" },
    ],
  },
  {
    id: "performance_review_policy",
    label: "Performance Review Policy",
    emoji: "📈",
    icon: FileCheck2,
    category: "policy",
    description: "Review cycles, ratings & PIP process",
    fields: [
      { name: "companyName", label: "Company Name", type: "text", defaultValue: "HRFlow" },
      { name: "requirements", label: "Specific Requirements", type: "textarea" },
    ],
  },
  {
    id: "salary_increment_policy",
    label: "Salary Increment Policy",
    emoji: "💰",
    icon: Wallet,
    category: "policy",
    description: "Annual increment matrix & eligibility",
    fields: [
      { name: "companyName", label: "Company Name", type: "text", defaultValue: "HRFlow" },
      { name: "requirements", label: "Specific Requirements", type: "textarea" },
    ],
  },
  {
    id: "interview_kit",
    label: "Interview Kit",
    emoji: "🎯",
    icon: MessageCircleQuestion,
    category: "other",
    description: "Tech + behavioural questions with rubric",
    fields: [
      { name: "jobTitle", label: "Job Title", type: "text", required: true, placeholder: "e.g., Senior React Developer" },
      {
        name: "experienceLevel",
        label: "Experience Level",
        type: "select",
        defaultValue: "Mid-level (3–5 years)",
        options: ["Junior (0–2 years)", "Mid-level (3–5 years)", "Senior (5+ years)", "Lead (8+ years)"],
      },
      { name: "skills", label: "Required Skills", type: "textarea", placeholder: "e.g., React, TypeScript, Next.js, REST APIs" },
    ],
  },
];

const CATEGORIES: { key: DocCategory; label: string }[] = [
  { key: "letter", label: "Letters" },
  { key: "policy", label: "Policies" },
  { key: "other", label: "Other Documents" },
];

interface InterviewKit {
  jobTitle: string;
  experienceLevel: string;
  technical: { question: string; evaluation: string }[];
  behavioral: { question: string; evaluation: string }[];
  cultureFit: { question: string; evaluation: string }[];
}

export default function DocumentsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canGenerate = can("ai_assistant", "create");
  const canEdit = can("ai_assistant", "edit");
  const hrm = useHrmData();
  const employees = hrm.employees ?? [];

  const [selected, setSelected] = useState<DocType | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [document, setDocument] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedDoc, setEditedDoc] = useState("");
  const [interviewKit, setInterviewKit] = useState<InterviewKit | null>(null);
  const [showKit, setShowKit] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<DocumentTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [generatedByAI, setGeneratedByAI] = useState(false);
  const [suggestedVariables, setSuggestedVariables] = useState<string[]>([]);

  const generate = useApiCall(async (forceRegenerate = false) => {
    if (!selected) return;

    // Interview kit uses a different endpoint
    if (selected.id === "interview_kit") {
      const res = await fetch("/api/ai-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setInterviewKit(json.kit as InterviewKit);
      setShowKit(true);
      toast.success("Interview kit generated");
      return;
    }

    const res = await fetch("/api/ai-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
      body: JSON.stringify({
        documentType: selected.id,
        formData,
        forceRegenerate,
        ...(forceRegenerate && activeTemplate
          ? { templateContent: activeTemplate.content, variables: activeTemplate.variables }
          : {}),
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Generation failed");
    if (json.source === "template" && json.template) {
      const template = json.template as DocumentTemplate;
      setActiveTemplate(template);
      setDocument(renderTemplate(template.content, formData));
      setGeneratedByAI(false);
    } else {
      setDocument(forceRegenerate && activeTemplate
        ? renderTemplate(json.document, formData)
        : json.document);
      setGeneratedByAI(true);
    }
    setSuggestedVariables(Array.isArray(json.suggestedVariables) ? json.suggestedVariables : []);
    setEditedDoc(json.document);
    setEditing(false);
    toast.success(forceRegenerate ? "Document regenerated with AI" : "Document generated");
  });

  const pickDoc = useCallback(async (doc: DocType, templateId?: string | null) => {
    setSelected(doc);
    const defaults: Record<string, any> = {};
    for (const f of doc.fields) {
      if (f.defaultValue) defaults[f.name] = f.defaultValue;
    }
    setFormData(defaults);
    setDocument(null);
    setEditing(false);
    setActiveTemplate(null);
    setGeneratedByAI(false);
    setSuggestedVariables([]);

    if (doc.id === "interview_kit") return;
    setTemplateLoading(true);
    try {
      const url = templateId
        ? `/api/document-templates/${encodeURIComponent(templateId)}`
        : `/api/document-templates?type=${encodeURIComponent(doc.id)}`;
      const response = await fetch(url, { headers: getClientAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load template");
      const template = templateId
        ? data.template as DocumentTemplate | undefined
        : data.templates?.[0] as DocumentTemplate | undefined;
      if (template) {
        const variableValues: Record<string, any> = {};
        template.variables.forEach((variable) => {
          const fieldName = variableToField(variable);
          const field = doc.fields.find((item) => item.name === fieldName);
          variableValues[fieldName] = field?.defaultValue ?? "";
        });
        setFormData(variableValues);
        setActiveTemplate(template);
        setDocument(renderTemplate(template.content, variableValues));
        setEditedDoc(template.content);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load template");
    } finally {
      setTemplateLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const type = searchParams.get("type");
    if (!type) return;
    const doc = DOC_TYPES.find((item) => item.id === type);
    if (doc) void pickDoc(doc, searchParams.get("template"));
  }, [pickDoc, searchParams]);

  const pickEmployee = (emp: Employee) => {
    if (!selected?.prefillFromEmployee) return;
    setFormData((prev) => ({
      ...prev,
      ...selected.prefillFromEmployee!(emp),
    }));
    toast.success(`Filled details for ${emp.name}`);
  };

  const updateField = (name: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (activeTemplate && !generatedByAI) {
        setDocument(renderTemplate(activeTemplate.content, next));
      }
      return next;
    });
  };

  const visibleFields = useMemo(() => {
    if (!selected) return [];
    if (!activeTemplate) return selected.fields;
    return activeTemplate.variables.map((variable): Field => {
      const fieldName = variableToField(variable);
      return selected.fields.find((field) => field.name === fieldName) ?? {
        name: fieldName,
        label: variableLabel(variable),
        type: variable.includes("date") ? "date" : variable.includes("salary") ? "number" : "text",
        required: true,
      };
    });
  }, [activeTemplate, selected]);

  const saveAsTemplate = async () => {
    if (!selected || !document) return;
    setSavingTemplate(true);
    try {
      const extracted = extractTemplate(editing ? editedDoc : document, formData);
      const variables = extracted.variables.length ? extracted.variables : suggestedVariables;
      const url = activeTemplate
        ? `/api/document-templates/${activeTemplate.id}`
        : "/api/document-templates";
      const response = await fetch(url, {
        method: activeTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({
          type: selected.id,
          name: activeTemplate?.name ?? `${selected.label} Template`,
          content: extracted.content,
          variables,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save template");
      setActiveTemplate(data.template);
      setGeneratedByAI(false);
      setDocument(renderTemplate(data.template.content, formData));
      toast.success(activeTemplate ? "Template updated" : "Saved as reusable template");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const copyToClipboard = () => {
    if (!document) return;
    navigator.clipboard.writeText(editing ? editedDoc : document).catch(() => {});
    toast.success("Copied to clipboard");
  };

  const byCategory = useMemo(() => {
    const map = new Map<DocCategory, DocType[]>();
    for (const d of DOC_TYPES) {
      const list = map.get(d.category) ?? [];
      list.push(d);
      map.set(d.category, list);
    }
    return map;
  }, []);

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <AiAssistantTabs />
          <Link href="/ai-assistant/documents/templates" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <FileCheck2 className="mr-1.5 h-3.5 w-3.5" /> Manage Templates
          </Link>
        </div>

        {!selected ? (
          /* ───── Type selection grid ───── */
          <div className="no-print space-y-6">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat.label}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(byCategory.get(cat.key) ?? []).map((doc) => {
                    const Icon = doc.icon;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => pickDoc(doc)}
                        className="group flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:scale-[1.02] hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                            {doc.emoji}
                          </div>
                          <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                        </div>
                        <p className="text-sm font-semibold">{doc.label}</p>
                        <p className="text-xs text-muted-foreground">{doc.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ───── Form + preview ───── */
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelected(null);
                setDocument(null);
              }}
              className="gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to document types
            </Button>

            <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
              {/* Form */}
              <Card className="no-print">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-xl">{selected.emoji}</span>
                    {selected.label}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{selected.description}</p>
                  {activeTemplate && (
                    <Badge variant="secondary" className="mt-2 w-fit">
                      Reusing {activeTemplate.name}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {templateLoading && (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking saved templates...
                    </div>
                  )}
                  {!templateLoading && visibleFields.map((field) => (
                    <FieldInput
                      key={field.name}
                      field={field}
                      value={formData[field.name] ?? ""}
                      onChange={(v) => updateField(field.name, v)}
                      employees={employees}
                      onEmployeePick={pickEmployee}
                    />
                  ))}
                  {!templateLoading && !activeTemplate && <div className="pt-2">
                    <Button
                      className="w-full gap-1.5"
                      onClick={() => generate.execute()}
                      loading={generate.loading}
                      disabled={!canGenerate}
                    >
                      {!generate.loading && <Sparkles className="h-3.5 w-3.5" />}
                      {generate.loading ? "Generating…" : "Generate with AI"}
                    </Button>
                  </div>}
                  {!templateLoading && activeTemplate && (
                    <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Preview updates instantly from this saved template. No AI call is used.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="document-preview overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between no-print">
                  <CardTitle className="text-base">Preview</CardTitle>
                  {document && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button size="sm" onClick={() => window.print()} className="gap-1.5">
                        <Printer className="h-3.5 w-3.5" /> Download PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={copyToClipboard} className="gap-1.5">
                        <ClipboardCopy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                      {activeTemplate && canEdit && (
                        <Link
                          href={`/ai-assistant/documents/templates?edit=${activeTemplate.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit Template
                        </Link>
                      )}
                      {canGenerate && <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generate.execute(true)}
                        disabled={generate.loading}
                        className="gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Regenerate with AI
                      </Button>}
                      {!activeTemplate && canEdit && <Button
                        size="sm"
                        variant={editing ? "default" : "outline"}
                        onClick={() => {
                          if (editing) setDocument(editedDoc);
                          setEditing((v) => !v);
                        }}
                        className="gap-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        {editing ? "Save edits" : "Edit"}
                      </Button>}
                      {generatedByAI && canGenerate && (
                        <Button size="sm" variant="outline" onClick={saveAsTemplate} disabled={savingTemplate} className="gap-1.5">
                          <Save className="h-3.5 w-3.5" />
                          {savingTemplate ? "Saving..." : activeTemplate ? "Update Template" : "Save as Template"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardHeader>

                <CardContent>
                  {generate.loading && !document && (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Drafting your document…</p>
                    </div>
                  )}
                  {!document && !generate.loading && (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium">No preview yet</p>
                      <p className="text-xs text-muted-foreground">
                        Fill the form and click <strong>Generate with AI</strong>.
                      </p>
                    </div>
                  )}
                  {document && (
                    <div className="print-area document-preview rounded-lg border bg-card p-6">
                      <div className="mb-6 border-b pb-4 text-center">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-600">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">HRFlow</p>
                        <p className="text-[11px] text-muted-foreground">Karachi, Pakistan</p>
                      </div>
                      {editing ? (
                        <Textarea
                          value={editedDoc}
                          onChange={(e) => setEditedDoc(e.target.value)}
                          rows={28}
                          className="font-sans text-sm leading-relaxed"
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
                          {document}
                        </pre>
                      )}
                      <div className="mt-8 border-t pt-4 text-[11px] text-muted-foreground no-print">
                        {activeTemplate && !generatedByAI ? "Rendered from saved template" : "Generated by HRFlow AI"} · {new Date().toLocaleString("en-PK")}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Interview kit modal */}
        <Dialog open={showKit} onOpenChange={setShowKit}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Interview Kit{" "}
                {interviewKit && (
                  <span className="text-sm font-normal text-muted-foreground">
                    · {interviewKit.jobTitle} ({interviewKit.experienceLevel})
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            {interviewKit && (
              <div className="space-y-6">
                <KitSection title="Technical Questions" items={interviewKit.technical} />
                <KitSection title="Behavioural Questions" items={interviewKit.behavioral} />
                <KitSection title="Culture Fit" items={interviewKit.cultureFit} />
                <div className="flex justify-end gap-2 border-t pt-3 no-print">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const text = formatKitAsText(interviewKit);
                      navigator.clipboard.writeText(text).catch(() => {});
                      toast.success("Copied full kit to clipboard");
                    }}
                    className="gap-1.5"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    Copy all
                  </Button>
                  <Button onClick={() => window.print()} className="gap-1.5">
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  employees,
  onEmployeePick,
}: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
  employees: Employee[];
  onEmployeePick: (e: Employee) => void;
}) {
  if (field.type === "employee") {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{field.label}</Label>
        <Select
          value=""
          onValueChange={(v) => {
            const emp = employees.find((e) => e.id === v);
            if (emp) onEmployeePick(emp);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pick to auto-fill from database…" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name} · {e.designation}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">
          {field.label}
          {field.required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        <Select value={value || ""} onValueChange={(v) => v && onChange(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">
          {field.label}
          {field.required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        <Textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {field.label}
        {field.required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={value}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        placeholder={field.placeholder}
      />
    </div>
  );
}

function KitSection({
  title,
  items,
}: {
  title: string;
  items: { question: string; evaluation: string }[];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">
                Q{i + 1}. {item.question}
              </p>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => navigator.clipboard.writeText(item.question).catch(() => {})}
                className="shrink-0"
              >
                <ClipboardCopy className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <strong>Strong answer:</strong> {item.evaluation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatKitAsText(kit: InterviewKit): string {
  let out = `INTERVIEW KIT — ${kit.jobTitle} (${kit.experienceLevel})\n\n`;
  const sections: [string, typeof kit.technical][] = [
    ["TECHNICAL QUESTIONS", kit.technical],
    ["BEHAVIOURAL QUESTIONS", kit.behavioral],
    ["CULTURE FIT", kit.cultureFit],
  ];
  for (const [title, items] of sections) {
    out += `\n${title}\n${"=".repeat(title.length)}\n`;
    items.forEach((q, i) => {
      out += `\nQ${i + 1}. ${q.question}\n   Strong answer: ${q.evaluation}\n`;
    });
  }
  return out;
}
