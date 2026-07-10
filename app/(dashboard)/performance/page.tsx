"use client";

import { useMemo, useState } from "react";
import { Award, Plus, Star } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useHrmData, useHrmActions } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import { getTeamMemberIds } from "@/lib/auth";
import { usePermissions } from "@/components/shared/permissions-provider";
import { getEmployeeName } from "@/lib/helpers";
import { createRecord, updateRecordApi } from "@/lib/hrm-api";
import { useToast } from "@/components/shared/toast-provider";
import { cn } from "@/lib/utils";
import type { PerformanceReview } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PerformancePage() {
  const user = useAuthUser();
  const { employees, performanceReviews } = useHrmData();
  const { refetch } = useHrmActions();
  const toast = useToast();
  const { can } = usePermissions();
  const canCreate = can("performance", "create");
  const canEdit = can("performance", "edit");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [editReview, setEditReview] = useState<PerformanceReview | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    period: "Q2 2026",
    rating: 4,
    goals: 4,
    goalsCompleted: 0,
    comments: "",
    status: "in_progress" as PerformanceReview["status"],
  });

  const filtered = useMemo(() => {
    if (user.role === "employee" && user.employeeId) {
      return performanceReviews.filter((r) => r.employeeId === user.employeeId);
    }
    if (user.role === "team_lead" && user.employeeId) {
      const teamIds = getTeamMemberIds(employees, user.employeeId);
      teamIds.push(user.employeeId);
      return performanceReviews.filter((r) => teamIds.includes(r.employeeId));
    }
    return performanceReviews;
  }, [performanceReviews, employees, user]);

  const reviewableEmployees = useMemo(() => {
    if (user.role === "team_lead" && user.employeeId) {
      return employees.filter((e) => e.managerId === user.employeeId);
    }
    if ((canCreate || canEdit) && user.role !== "employee") {
      return employees.filter((e) => e.status === "active");
    }
    return [];
  }, [employees, user, canCreate, canEdit]);

  const handleSave = async () => {
    if (!form.employeeId) return;
    setSaving(true);
    try {
      if (editReview) {
        await updateRecordApi<PerformanceReview>("performance", editReview.id, {
          ...form,
          reviewerId: user.employeeId ?? editReview.reviewerId,
        });
        toast.success("Review updated");
      } else {
        await createRecord("performance", {
          ...form,
          reviewerId: user.employeeId ?? null,
        });
        toast.success("Review created");
      }
      await refetch();
      setReviewOpen(false);
      setEditReview(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  const openNewReview = () => {
    setEditReview(null);
    setForm({ employeeId: "", period: "Q2 2026", rating: 4, goals: 4, goalsCompleted: 0, comments: "", status: "in_progress" });
    setReviewOpen(true);
  };

  const openEditReview = (review: PerformanceReview) => {
    setEditReview(review);
    setForm({
      employeeId: review.employeeId,
      period: review.period,
      rating: review.rating,
      goals: review.goals,
      goalsCompleted: review.goalsCompleted,
      comments: review.comments,
      status: review.status,
    });
    setReviewOpen(true);
  };

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Performance Reviews</h2>
          <p className="text-sm text-muted-foreground">Ratings, goals &amp; quarterly reviews</p>
        </div>
        {canCreate && reviewableEmployees.length > 0 && (
          <Button size="sm" onClick={openNewReview}>
            <Plus className="mr-1.5 h-4 w-4" /> New Review
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {filtered.slice(0, 3).map((review) => {
          const goalPct = review.goals ? Math.round((review.goalsCompleted / review.goals) * 100) : 0;
          return (
            <Card key={review.id} className={cn("transition-shadow hover:shadow-md", canEdit && "cursor-pointer")} onClick={() => canEdit && openEditReview(review)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{getEmployeeName(employees, review.employeeId)}</p>
                    <p className="text-xs text-muted-foreground">{review.period}</p>
                  </div>
                  {review.rating > 0 && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-bold">{review.rating}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Goals</span>
                    <span>{review.goalsCompleted}/{review.goals}</span>
                  </div>
                  <Progress value={goalPct} className="mt-1 h-1.5" />
                </div>
                <StatusBadge status={review.status} className="mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Reviews</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState icon={Award} title="No performance reviews" description="Create a review to get started." action={canCreate ? { label: "New Review", onClick: openNewReview } : undefined} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Goals</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((review) => {
                  const goalPct = review.goals ? Math.round((review.goalsCompleted / review.goals) * 100) : 0;
                  return (
                    <TableRow key={review.id} className={canEdit ? "cursor-pointer" : ""} onClick={() => canEdit && openEditReview(review)}>
                      <TableCell className="font-medium">{getEmployeeName(employees, review.employeeId)}</TableCell>
                      <TableCell>{review.period}</TableCell>
                      <TableCell>{review.rating > 0 ? `${review.rating}/5` : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={goalPct} className="h-1.5 w-16" />
                          <span className="text-xs">{review.goalsCompleted}/{review.goals}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getEmployeeName(employees, review.reviewerId)}</TableCell>
                      <TableCell><StatusBadge status={review.status} /></TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">{review.comments}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editReview ? "Edit Review" : "New Performance Review"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => v && setForm({ ...form, employeeId: v })} disabled={!!editReview}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {reviewableEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Period</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Rating (/5)</Label><Input type="number" min={0} max={5} step={0.1} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Goals</Label><Input type="number" min={1} value={form.goals} onChange={(e) => setForm({ ...form, goals: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Completed</Label><Input type="number" min={0} value={form.goalsCompleted} onChange={(e) => setForm({ ...form, goalsCompleted: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => v && setForm({ ...form, status: v as PerformanceReview["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Comments</Label>
              <Textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} placeholder="Performance feedback..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.employeeId}>
              {saving ? "Saving..." : "Save Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
