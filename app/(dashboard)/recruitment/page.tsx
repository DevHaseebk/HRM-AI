"use client";

import { useMemo, useState } from "react";
import { Briefcase, GripVertical, Plus, Users } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useHrmData, useHrmActions } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import { canManageRecruitment } from "@/lib/auth";
import { createRecord, updateRecordApi } from "@/lib/hrm-api";
import { useToast } from "@/components/shared/toast-provider";
import type { Applicant } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const PIPELINE: { key: Applicant["status"]; label: string; color: string }[] = [
  { key: "applied", label: "Applied", color: "border-t-blue-500" },
  { key: "screening", label: "Screening", color: "border-t-purple-500" },
  { key: "interview", label: "Interview", color: "border-t-orange-500" },
  { key: "offer", label: "Offer", color: "border-t-emerald-500" },
  { key: "hired", label: "Hired", color: "border-t-green-600" },
  { key: "rejected", label: "Rejected", color: "border-t-rose-500" },
];

export default function RecruitmentPage() {
  const user = useAuthUser();
  const { jobs, applicants, settings } = useHrmData();
  const { refetch } = useHrmActions();
  const toast = useToast();
  const canManage = canManageRecruitment(user.role);

  const [jobOpen, setJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "",
    department: "Engineering",
    location: "Karachi",
    type: "Full-time",
    salaryRange: "150,000 - 250,000 PKR",
    deadline: "",
    description: "",
  });

  const filteredApplicants = useMemo(() => {
    if (selectedJob === "all") return applicants;
    return applicants.filter((a) => a.jobId === selectedJob);
  }, [applicants, selectedJob]);

  const handleAddJob = async () => {
    setSaving(true);
    try {
      await createRecord("jobs", { ...jobForm, status: "open" });
      await refetch();
      setJobOpen(false);
      toast.success("Job posting created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSaving(false);
    }
  };

  const moveApplicant = async (applicant: Applicant, status: Applicant["status"]) => {
    try {
      await updateRecordApi<Applicant>("applicants", applicant.id, { status });
      await refetch();
      toast.success(`Moved to ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update applicant");
    }
  };

  const getJobTitle = (jobId: string) =>
    jobs.find((j) => j.id === jobId)?.title ?? "Unknown";

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Recruitment</h2>
          <p className="text-sm text-muted-foreground">
            {jobs.filter((j) => j.status === "open").length} open positions · {applicants.length} applicants
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setJobOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Job Posting
          </Button>
        )}
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="jobs">Job Postings ({jobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4 space-y-4">
          <Select value={selectedJob} onValueChange={(v) => v && setSelectedJob(v)}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Filter by job" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-3 overflow-x-auto pb-4">
            {PIPELINE.map((col) => {
              const cards = filteredApplicants.filter((a) => a.status === col.key);
              return (
                <div key={col.key} className="min-w-[220px] flex-1">
                  <div className={cn("mb-2 rounded-t-lg border-t-4 bg-muted/50 px-3 py-2", col.color)}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                      <Badge variant="secondary" className="text-[10px]">{cards.length}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2 min-h-[200px] rounded-b-lg border border-t-0 bg-muted/20 p-2">
                    {cards.length === 0 ? (
                      <p className="py-8 text-center text-[11px] text-muted-foreground">Empty</p>
                    ) : (
                      cards.map((applicant) => (
                        <div key={applicant.id} className="rounded-lg border bg-card p-3 shadow-sm">
                          <div className="flex items-start gap-2">
                            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{applicant.name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {getJobTitle(applicant.jobId)}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <Progress value={applicant.resumeScore} className="h-1 flex-1" />
                                <span className="text-[10px] text-muted-foreground">{applicant.resumeScore}%</span>
                              </div>
                            </div>
                          </div>
                          {canManage && col.key !== "hired" && col.key !== "rejected" && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {PIPELINE.filter((p) => p.key !== col.key).slice(0, 3).map((next) => (
                                <button
                                  key={next.key}
                                  type="button"
                                  onClick={() => moveApplicant(applicant, next.key)}
                                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] hover:bg-primary/10"
                                >
                                  → {next.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          {jobs.length === 0 ? (
            <EmptyState icon={Briefcase} title="No job postings" description="Create your first job posting." action={canManage ? { label: "Add Job", onClick: () => setJobOpen(true) } : undefined} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{job.title}</CardTitle>
                      <StatusBadge status={job.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground line-clamp-2">{job.description}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span>Dept: {job.department}</span>
                      <span>Location: {job.location}</span>
                      <span>Salary: {job.salaryRange}</span>
                      <span>Deadline: {job.deadline}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Users className="mr-1 h-3 w-3" />
                      {applicants.filter((a) => a.jobId === job.id).length} applicants
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={jobOpen} onOpenChange={setJobOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Job Posting</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Job Title</Label><Input value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={jobForm.department} onValueChange={(v) => v && setJobForm({ ...jobForm, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{settings.departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={jobForm.location} onValueChange={(v) => v && setJobForm({ ...jobForm, location: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{settings.locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Salary Range (PKR)</Label><Input value={jobForm.salaryRange} onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Deadline</Label><Input type="date" value={jobForm.deadline} onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobOpen(false)}>Cancel</Button>
            <Button onClick={handleAddJob} disabled={saving || !jobForm.title}>{saving ? "Saving..." : "Post Job"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
