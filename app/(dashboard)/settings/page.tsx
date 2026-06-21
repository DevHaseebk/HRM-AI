"use client";

import { useState } from "react";
import { Building2, Calendar, Plus, X } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { OfficeProfileTab } from "@/components/settings/office-profile-tab";
import { useHrmData, useHrmActions } from "@/components/shared/hrm-data-provider";
import { useAuthUser } from "@/components/shared/auth-provider";
import { canEditGlobalSettings, canManageSettings } from "@/lib/auth";
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
  const canEditGlobal = canEditGlobalSettings(user.role);
  const [company, setCompany] = useState(settings.company);
  const [departments, setDepartments] = useState([...settings.departments]);
  const [designations, setDesignations] = useState([...settings.designations]);
  const [newDept, setNewDept] = useState("");
  const [newDesig, setNewDesig] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canManage) {
    return <PageWrapper><Card><CardContent className="py-12 text-center"><Building2 className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-medium">Access Restricted</p><p className="text-sm text-muted-foreground">Settings are available to HR administrators only.</p></CardContent></Card></PageWrapper>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: CompanySettings = { ...settings, company, departments, designations };
      await updateSettings(payload);
      await refetch();
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addDepartment = () => {
    const value = newDept.trim();
    if (value && !departments.includes(value)) setDepartments([...departments, value]);
    setNewDept("");
  };

  const addDesignation = () => {
    const value = newDesig.trim();
    if (value && !designations.includes(value)) setDesignations([...designations, value]);
    setNewDesig("");
  };

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Settings</h2><p className="text-sm text-muted-foreground">Company configuration, departments, and office profile</p></div>{canEditGlobal && <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>}</div>

      <Tabs defaultValue={canEditGlobal ? "company" : "office-profile"}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          {canEditGlobal && <TabsTrigger value="company">Company</TabsTrigger>}
          {canEditGlobal && <TabsTrigger value="departments">Departments ({departments.length})</TabsTrigger>}
          {canEditGlobal && <TabsTrigger value="designations">Designations ({designations.length})</TabsTrigger>}
          {canEditGlobal && <TabsTrigger value="holidays">Holidays</TabsTrigger>}
          <TabsTrigger value="office-profile">Office Profile</TabsTrigger>
        </TabsList>

        {canEditGlobal && <TabsContent value="company" className="mt-4"><Card><CardHeader><CardTitle className="text-base">Company Information</CardTitle><CardDescription>Organization details for HRFlow</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Company Name" value={company.name} onChange={(name) => setCompany({ ...company, name })} /><Field label="Tagline" value={company.tagline} onChange={(tagline) => setCompany({ ...company, tagline })} /><Field label="Address" value={company.address} onChange={(address) => setCompany({ ...company, address })} className="sm:col-span-2" /><Field label="Phone" value={company.phone} onChange={(phone) => setCompany({ ...company, phone })} /><Field label="Email" value={company.email} onChange={(email) => setCompany({ ...company, email })} /><Field label="Website" value={company.website} onChange={(website) => setCompany({ ...company, website })} /><Field label="Currency" value={company.currency} onChange={(currency) => setCompany({ ...company, currency })} /><Field label="Timezone" value={company.timezone} onChange={(timezone) => setCompany({ ...company, timezone })} /><Field label="Office Hours" value={company.officeHours} onChange={(officeHours) => setCompany({ ...company, officeHours })} /></CardContent></Card></TabsContent>}

        {canEditGlobal && <TabsContent value="departments" className="mt-4"><ListEditor title="Departments" description="Manage organizational departments" value={newDept} onValueChange={setNewDept} onAdd={addDepartment}>{departments.map((item) => <Badge key={item} variant="secondary" className="gap-1 pr-1">{item}<button type="button" onClick={() => setDepartments(departments.filter((x) => x !== item))} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button></Badge>)}</ListEditor></TabsContent>}

        {canEditGlobal && <TabsContent value="designations" className="mt-4"><ListEditor title="Designations" description="Manage job titles" value={newDesig} onValueChange={setNewDesig} onAdd={addDesignation}>{designations.map((item) => <Badge key={item} variant="outline" className="gap-1 pr-1">{item}<button type="button" onClick={() => setDesignations(designations.filter((x) => x !== item))} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button></Badge>)}</ListEditor></TabsContent>}

        {canEditGlobal && <TabsContent value="holidays" className="mt-4"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4" /> Public Holidays</CardTitle></CardHeader><CardContent className="space-y-2">{settings.holidays.map((holiday) => <div key={holiday.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">{holiday.name}</p><p className="text-xs text-muted-foreground">{holiday.date}</p></div><Badge variant="outline">{holiday.type}</Badge></div>)}</CardContent></Card></TabsContent>}

        <TabsContent value="office-profile" className="mt-4"><OfficeProfileTab /></TabsContent>
      </Tabs>

      <Separator />
      <Card><CardHeader><CardTitle className="text-base">Account</CardTitle><CardDescription>Signed in as {user.name}</CardDescription></CardHeader><CardContent className="grid gap-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user.email}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Role</span><Badge variant="secondary">{user.role.replace("_", " ")}</Badge></div></CardContent></Card>
    </PageWrapper>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function ListEditor({ title, description, value, onValueChange, onAdd, children }: { title: string; description: string; value: string; onValueChange: (value: string) => void; onAdd: () => void; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><div className="mb-4 flex gap-2"><Input value={value} onChange={(e) => onValueChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAdd()} /><Button onClick={onAdd}><Plus className="h-4 w-4" /></Button></div><div className="flex flex-wrap gap-2">{children}</div></CardContent></Card>;
}
