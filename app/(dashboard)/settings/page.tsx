"use client";

import { useState } from "react";
import { Building2, Calendar, Plus, X } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { useHrmData, useHrmActions } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import { canManageSettings } from "@/lib/auth";
import { updateSettings } from "@/lib/hrm-api";
import { useToast } from "@/components/shared/toast-provider";
import type { CompanySettings } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const user = useAuthUser();
  const { settings } = useHrmData();
  const { refetch } = useHrmActions();
  const toast = useToast();
  const canManage = canManageSettings(user.role);

  const [company, setCompany] = useState(settings.company);
  const [departments, setDepartments] = useState([...settings.departments]);
  const [designations, setDesignations] = useState([...settings.designations]);
  const [newDept, setNewDept] = useState("");
  const [newDesig, setNewDesig] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload: CompanySettings = {
        ...settings,
        company,
        departments,
        designations,
      };
      await updateSettings(payload);
      await refetch();
      setMessage("Settings saved successfully.");
      toast.success("Settings saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const addDepartment = () => {
    if (newDept.trim() && !departments.includes(newDept.trim())) {
      setDepartments([...departments, newDept.trim()]);
      setNewDept("");
    }
  };

  const addDesignation = () => {
    if (newDesig.trim() && !designations.includes(newDesig.trim())) {
      setDesignations([...designations, newDesig.trim()]);
      setNewDesig("");
    }
  };

  if (!canManage) {
    return (
      <PageWrapper>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">Access Restricted</p>
            <p className="text-sm text-muted-foreground">
              Company settings are only available to Super Admin.
            </p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Company configuration · Departments · Designations
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="departments">Departments ({departments.length})</TabsTrigger>
          <TabsTrigger value="designations">Designations ({designations.length})</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Information</CardTitle>
              <CardDescription>Organization details for HRFlow Pakistan</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Company Name" value={company.name} onChange={(v) => setCompany({ ...company, name: v })} />
              <Field label="Tagline" value={company.tagline} onChange={(v) => setCompany({ ...company, tagline: v })} />
              <Field label="Address" value={company.address} onChange={(v) => setCompany({ ...company, address: v })} className="sm:col-span-2" />
              <Field label="Phone" value={company.phone} onChange={(v) => setCompany({ ...company, phone: v })} />
              <Field label="Email" value={company.email} onChange={(v) => setCompany({ ...company, email: v })} />
              <Field label="Website" value={company.website} onChange={(v) => setCompany({ ...company, website: v })} />
              <Field label="Currency" value={company.currency} onChange={(v) => setCompany({ ...company, currency: v })} />
              <Field label="Timezone" value={company.timezone} onChange={(v) => setCompany({ ...company, timezone: v })} />
              <Field label="Office Hours" value={company.officeHours} onChange={(v) => setCompany({ ...company, officeHours: v })} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Departments</CardTitle>
              <CardDescription>Manage organizational departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <Input placeholder="New department..." value={newDept} onChange={(e) => setNewDept(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDepartment()} />
                <Button onClick={addDepartment}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {departments.map((d) => (
                  <Badge key={d} variant="secondary" className="gap-1 pr-1">
                    {d}
                    <button type="button" onClick={() => setDepartments(departments.filter((x) => x !== d))} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Designations</CardTitle>
              <CardDescription>Job titles used across the organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <Input placeholder="New designation..." value={newDesig} onChange={(e) => setNewDesig(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDesignation()} />
                <Button onClick={addDesignation}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {designations.map((d) => (
                  <Badge key={d} variant="outline" className="gap-1 pr-1">
                    {d}
                    <button type="button" onClick={() => setDesignations(designations.filter((x) => x !== d))} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Pakistani Public Holidays
              </CardTitle>
              <CardDescription>Official holidays observed by the company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {settings.holidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{h.date}</p>
                    </div>
                    <Badge variant="outline">{h.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Signed in as {user.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Role</span><Badge variant="secondary">{user.role.replace("_", " ")}</Badge></div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
