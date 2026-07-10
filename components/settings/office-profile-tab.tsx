"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin, Plus, Trash2, Upload } from "lucide-react";
import { getClientAuthHeaders } from "@/lib/company-scope";
import type { OfficePolicy, OfficeProfile } from "@/lib/types";
import { useToast } from "@/components/shared/toast-provider";
import { usePermissions } from "@/components/shared/permissions-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DEFAULT_PROFILE: OfficeProfile = {
  companyId: null,
  name: "My Software House",
  logoUrl: "",
  email: "",
  phone: "",
  address: "",
  checkInTime: "09:00",
  checkOutTime: "18:00",
  lateThresholdMinutes: 15,
  gracePeriodMinutes: 0,
  workDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  latitude: null,
  longitude: null,
  locationRadiusMeters: 1000,
  locationSet: false,
  policies: [],
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function OfficeProfileTab() {
  const toast = useToast();
  const { can } = usePermissions();
  const canCreate = can("settings", "create");
  const canEdit = can("settings", "edit");
  const canDelete = can("settings", "delete");
  const [profile, setProfile] = useState<OfficeProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [deletePolicyId, setDeletePolicyId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState({ title: "", description: "", effectiveDate: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    let mounted = true;
    fetch("/api/office-profile", { headers: getClientAuthHeaders() })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load office profile");
        if (mounted && data.profile) setProfile({ ...DEFAULT_PROFILE, ...data.profile });
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load office profile"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [toast]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/office-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save office profile");
      setProfile({ ...DEFAULT_PROFILE, ...data.profile });
      toast.success("Office profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((p) => ({ ...p, logoUrl: String(reader.result ?? "") }));
    reader.readAsDataURL(file);
  };

  const updateLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation is not available");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setProfile((p) => ({ ...p, latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)), locationSet: true }));
        toast.success("Location captured");
      },
      () => toast.error("Unable to capture location")
    );
  };

  const addPolicy = () => {
    if (!policyForm.title.trim()) return;
    const policy: OfficePolicy = { id: `pol-${Date.now().toString(36)}`, title: policyForm.title.trim(), description: policyForm.description.trim(), effectiveDate: policyForm.effectiveDate };
    setProfile((p) => ({ ...p, policies: [...p.policies, policy] }));
    setPolicyForm({ title: "", description: "", effectiveDate: new Date().toISOString().slice(0, 10) });
    setPolicyOpen(false);
  };

  if (loading) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading office profile...</CardContent></Card>;

  return (
    <div className="space-y-4">
      <Section title="Company Info" description="Logo and official contact details">
        <div className="flex items-center gap-4 sm:col-span-2">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logoUrl} alt="Company logo" className="h-full w-full object-cover" />
            ) : <Building2 className="h-7 w-7 text-muted-foreground" />}
          </div>
          <Label htmlFor="logo-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"><Upload className="h-4 w-4" /> Upload Logo</Label>
          <Input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
        </div>
        <Field label="Company Name" value={profile.name} onChange={(name) => setProfile({ ...profile, name })} />
        <Field label="Email" value={profile.email} onChange={(email) => setProfile({ ...profile, email })} />
        <Field label="Phone" value={profile.phone} onChange={(phone) => setProfile({ ...profile, phone })} />
        <div className="space-y-1.5 sm:col-span-2"><Label>Address</Label><Textarea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></div>
        {canEdit && <SaveButton saving={saving} onClick={save} label="Save Company Info" />}
      </Section>

      <Section title="Work Hours & Policies" description="Attendance timing and working days">
        <Field label="Check-in Time" type="time" value={profile.checkInTime} onChange={(checkInTime) => setProfile({ ...profile, checkInTime })} />
        <Field label="Check-out Time" type="time" value={profile.checkOutTime} onChange={(checkOutTime) => setProfile({ ...profile, checkOutTime })} />
        <Field label="Late Arrival Threshold (minutes)" type="number" value={String(profile.lateThresholdMinutes)} onChange={(v) => setProfile({ ...profile, lateThresholdMinutes: Number(v) })} />
        <Field label="Grace Period (minutes)" type="number" value={String(profile.gracePeriodMinutes)} onChange={(v) => setProfile({ ...profile, gracePeriodMinutes: Number(v) })} />
        <div className="space-y-2 sm:col-span-2"><Label>Work Days</Label><div className="flex flex-wrap gap-2">{DAYS.map((day) => <label key={day} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><Checkbox checked={profile.workDays.includes(day)} onCheckedChange={(checked) => setProfile((p) => ({ ...p, workDays: checked ? [...p.workDays, day] : p.workDays.filter((d) => d !== day) }))} />{day.slice(0, 3)}</label>)}</div></div>
        {canEdit && <SaveButton saving={saving} onClick={save} label="Save Work Policy" />}
      </Section>

      <Section title="Office Location" description="Used for attendance location checks">
        <div className="flex min-h-32 items-center justify-center rounded-lg border bg-muted/40 text-center sm:col-span-2"><div><MapPin className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />{profile.locationSet ? <p className="text-sm font-medium">Location: {profile.latitude}, {profile.longitude}</p> : <p className="text-sm text-muted-foreground">Office location is not set</p>}</div></div>
        <Field label="Radius (meters)" type="number" value={String(profile.locationRadiusMeters)} onChange={(v) => setProfile({ ...profile, locationRadiusMeters: Number(v) })} />
        {canEdit && <div className="flex flex-wrap items-end gap-2 sm:col-span-2"><Button variant="outline" onClick={updateLocation}>Update Location</Button><Button variant="outline" onClick={() => setProfile({ ...profile, latitude: null, longitude: null, locationSet: false })}>Clear Location</Button><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Location"}</Button></div>}
        <p className="text-xs text-muted-foreground sm:col-span-2">Office location is auto-detected on first employee check-in if not set.</p>
      </Section>

      <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle className="text-base">Custom Policies</CardTitle><CardDescription>Company-specific workplace policies</CardDescription></div>{canCreate && <Button size="sm" onClick={() => setPolicyOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Policy</Button>}</CardHeader><CardContent className="space-y-3">{profile.policies.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No policies added yet.</p> : profile.policies.map((policy) => <div key={policy.id} className="rounded-lg border p-4"><div className="flex items-start justify-between"><div><p className="font-medium">{policy.title}</p><p className="text-xs text-muted-foreground">Effective {policy.effectiveDate}</p></div>{canDelete && <Button variant="ghost" size="icon-sm" onClick={() => setDeletePolicyId(policy.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div><p className="mt-2 text-sm text-muted-foreground">{policy.description}</p></div>)}{canEdit && <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Policies"}</Button>}</CardContent></Card>

      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}><DialogContent><DialogHeader><DialogTitle>Add Policy</DialogTitle></DialogHeader><div className="space-y-3"><Field label="Title" value={policyForm.title} onChange={(title) => setPolicyForm({ ...policyForm, title })} /><div className="space-y-1.5"><Label>Description</Label><Textarea value={policyForm.description} onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })} /></div><Field label="Effective Date" type="date" value={policyForm.effectiveDate} onChange={(effectiveDate) => setPolicyForm({ ...policyForm, effectiveDate })} /></div><DialogFooter><Button variant="outline" onClick={() => setPolicyOpen(false)}>Cancel</Button><Button onClick={addPolicy} disabled={!policyForm.title.trim()}>Add Policy</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={!!deletePolicyId} onOpenChange={() => setDeletePolicyId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete policy?</AlertDialogTitle><AlertDialogDescription>This policy will be removed after you save.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { setProfile((p) => ({ ...p, policies: p.policies.filter((x) => x.id !== deletePolicyId) })); setDeletePolicyId(null); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent></Card>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function SaveButton({ saving, onClick, label }: { saving: boolean; onClick: () => void; label: string }) {
  return <div className="sm:col-span-2"><Button onClick={onClick} disabled={saving}>{saving ? "Saving..." : label}</Button></div>;
}
