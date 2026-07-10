"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Bot, Copy, Edit3, Eye, FileText, Loader2, Trash2 } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { AiAssistantTabs } from "@/components/shared/ai-assistant-tabs";
import { usePermissions } from "@/components/shared/permissions-provider";
import { useToast } from "@/components/shared/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getClientAuthHeaders } from "@/lib/company-scope";
import {
  DOCUMENT_TYPE_LABELS,
  extractVariablesFromContent,
  renderTemplate,
  variableLabel,
  type DocumentTemplate,
} from "@/lib/document-templates";
import { cn } from "@/lib/utils";

export default function DocumentTemplatesPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const { can } = usePermissions();
  const canGenerate = can("ai_assistant", "create");
  const canEdit = can("ai_assistant", "edit");
  const canDelete = can("ai_assistant", "delete");
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [editTemplate, setEditTemplate] = useState<DocumentTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<DocumentTemplate | null>(null);
  const [form, setForm] = useState({ name: "", content: "" });
  const [warning, setWarning] = useState<string | null>(null);
  const handledEditId = useRef<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/document-templates", { headers: getClientAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load templates");
      setTemplates(data.templates ?? []);
      setWarning(data.warning ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || handledEditId.current === editId) return;
    const template = templates.find((item) => item.id === editId);
    if (template) {
      handledEditId.current = editId;
      openEdit(template);
    }
  }, [searchParams, templates]);

  const openEdit = (template: DocumentTemplate) => {
    setEditTemplate(template);
    setForm({ name: template.name, content: template.content });
  };

  const saveEdit = async () => {
    if (!editTemplate || !form.name.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/document-templates/${editTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({
          name: form.name.trim(),
          content: form.content,
          variables: extractVariablesFromContent(form.content),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to update template");
      setTemplates((current) => current.map((item) => item.id === data.template.id ? data.template : item));
      setEditTemplate(null);
      toast.success("Template updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  const removeTemplate = async () => {
    if (!deleteTemplate) return;
    try {
      const response = await fetch(`/api/document-templates/${deleteTemplate.id}`, {
        method: "DELETE",
        headers: getClientAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to delete template");
      setTemplates((current) => current.filter((item) => item.id !== deleteTemplate.id));
      setDeleteTemplate(null);
      toast.success("Template deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete template");
    }
  };

  const regenerate = async (template: DocumentTemplate) => {
    setRegeneratingId(template.id);
    try {
      const aiResponse = await fetch("/api/ai-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({
          documentType: template.type,
          forceRegenerate: true,
          templateContent: template.content,
          variables: template.variables,
        }),
      });
      const aiData = await aiResponse.json();
      if (!aiResponse.ok) throw new Error(aiData.error ?? "AI regeneration failed");
      const updateResponse = await fetch(`/api/document-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({ content: aiData.document, variables: template.variables }),
      });
      const updateData = await updateResponse.json();
      if (!updateResponse.ok) throw new Error(updateData.error ?? "Failed to overwrite template");
      setTemplates((current) => current.map((item) => item.id === template.id ? updateData.template : item));
      toast.success("Template regenerated and updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template regeneration failed");
    } finally {
      setRegeneratingId(null);
    }
  };

  const renderedPreview = useMemo(() => {
    if (!previewTemplate) return "";
    const samples = Object.fromEntries(
      previewTemplate.variables.map((variable) => [variable, `[${variableLabel(variable)}]`])
    );
    return renderTemplate(previewTemplate.content, samples);
  }, [previewTemplate]);

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/ai-assistant/documents" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Back to documents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold">Document Templates</h2>
            <p className="text-sm text-muted-foreground">Reuse approved documents without making another AI request.</p>
          </div>
        </div>
        <AiAssistantTabs />
      </div>

      {warning && <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{warning}</div>}

      {loading ? (
        <Card><CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading templates...</CardContent></Card>
      ) : templates.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><FileText className="mx-auto h-9 w-9 text-muted-foreground" /><p className="mt-3 font-medium">No saved templates</p><p className="mt-1 text-sm text-muted-foreground">Generate a document and choose Save as Template.</p><Link href="/ai-assistant/documents" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>Create a document</Link></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex min-h-56 flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="secondary">{DOCUMENT_TYPE_LABELS[template.type] ?? template.type.replaceAll("_", " ")}</Badge>
                  <span className="text-[11px] text-muted-foreground">{new Date(template.createdAt).toLocaleDateString("en-PK")}</span>
                </div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription>{template.variables.length} reusable variables</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex min-h-8 flex-wrap gap-1.5">
                  {template.variables.slice(0, 5).map((variable) => <Badge key={variable} variant="outline" className="text-[10px]">{`{{${variable}}}`}</Badge>)}
                  {template.variables.length > 5 && <Badge variant="outline" className="text-[10px]">+{template.variables.length - 5}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Link href={`/ai-assistant/documents?type=${encodeURIComponent(template.type)}&template=${template.id}`} className={buttonVariants({ size: "sm" })}>Use</Link>
                  <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(template)}><Eye className="mr-1 h-3.5 w-3.5" /> Preview</Button>
                  {canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(template)}><Edit3 className="mr-1 h-3.5 w-3.5" /> Edit</Button>}
                  {canGenerate && <Button size="sm" variant="outline" onClick={() => regenerate(template)} disabled={regeneratingId === template.id}><Bot className="mr-1 h-3.5 w-3.5" /> {regeneratingId === template.id ? "Regenerating..." : "Regenerate"}</Button>}
                  {canDelete && <Button size="icon-sm" variant="ghost" onClick={() => setDeleteTemplate(template)} aria-label={`Delete ${template.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editTemplate} onOpenChange={(open) => !open && setEditTemplate(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="space-y-1.5"><Label>Template Content</Label><Textarea rows={24} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="font-mono text-sm leading-relaxed" /></div>
            <p className="text-xs text-muted-foreground">Variables use double braces, for example {`{{employee_name}}`}.</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditTemplate(null)}>Cancel</Button><Button onClick={saveEdit} disabled={saving || !form.name.trim() || !form.content.trim()}>{saving ? "Saving..." : "Save Changes"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{previewTemplate?.name}</DialogTitle></DialogHeader>
          <div className="print-area document-preview rounded-md border bg-background p-6"><pre className="whitespace-pre-wrap break-words font-serif text-sm leading-relaxed">{renderedPreview}</pre></div>
          <DialogFooter><Button variant="outline" onClick={() => navigator.clipboard.writeText(renderedPreview).then(() => toast.success("Preview copied"))}><Copy className="mr-1.5 h-4 w-4" /> Copy</Button><Button onClick={() => window.print()}>Download PDF</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete template?</AlertDialogTitle><AlertDialogDescription>{deleteTemplate?.name} will be permanently removed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={removeTemplate}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
