"use client";

import { useMemo, useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useHrmData, useHrmActions } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import { canManageAnnouncements } from "@/lib/auth";
import { getEmployeeName } from "@/lib/helpers";
import { createRecord, deleteRecordApi } from "@/lib/hrm-api";
import { useToast } from "@/components/shared/toast-provider";
import type { Announcement } from "@/lib/types";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const priorityStyles = {
  high: "border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/20",
  medium: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  low: "border-l-slate-400 bg-slate-50/50 dark:bg-slate-950/20",
};

export default function AnnouncementsPage() {
  const user = useAuthUser();
  const { employees, announcements, settings } = useHrmData();
  const { refetch } = useHrmActions();
  const toast = useToast();
  const canManage = canManageAnnouncements(user.role);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "medium" as Announcement["priority"],
    department: "All",
  });

  const sorted = useMemo(() => {
    let list = [...announcements].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
    if (priorityFilter !== "all") {
      list = list.filter((a) => a.priority === priorityFilter);
    }
    return list;
  }, [announcements, priorityFilter]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createRecord("announcements", {
        title: form.title,
        content: form.content,
        authorId: user.employeeId,
        department: form.department,
      });
      await refetch();
      setCreateOpen(false);
      setForm({ title: "", content: "", priority: "medium", department: "All" });
      toast.success("Announcement published");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRecordApi("announcements", deleteId);
      await refetch();
      setDeleteId(null);
      toast.success("Announcement deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Announcements</h2>
          <p className="text-sm text-muted-foreground">
            Company-wide updates &amp; Pakistani public holidays
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={priorityFilter} onValueChange={(v) => v && setPriorityFilter(v)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          {canManage && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Create
            </Button>
          )}
        </div>
      </div>

      {/* Upcoming holidays */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Upcoming Pakistani Public Holidays
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {settings.holidays.slice(0, 5).map((h) => (
              <Badge key={h.id} variant="outline" className="text-xs">
                {h.name} · {h.date}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="No announcements match your filter."
          action={canManage ? { label: "Create announcement", onClick: () => setCreateOpen(true) } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((ann) => (
            <Card
              key={ann.id}
              className={cn(
                "border-l-4 transition-shadow hover:shadow-md",
                priorityStyles[ann.priority]
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Megaphone className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base leading-snug">{ann.title}</CardTitle>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {getEmployeeName(employees, ann.authorId)} · {ann.createdAt}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(ann.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{ann.content}</p>
                <div className="mt-3 flex gap-2">
                  <StatusBadge status={ann.priority} />
                  <Badge variant="outline">{ann.department}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Content</Label><Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => v && setForm({ ...form, priority: v as Announcement["priority"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={(v) => v && setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {settings.departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title}>{saving ? "Publishing..." : "Publish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
