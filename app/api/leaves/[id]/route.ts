import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendLeaveStatusEmail } from "@/lib/mailer";
import { getCompanyScope } from "@/lib/company-scope";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const scope = getCompanyScope(request);

    if (!body.status || !["approved", "rejected"].includes(body.status)) {
      return NextResponse.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      status: body.status,
    };

    if (body.approved_by) {
      updates.approved_by = body.approved_by;
    }

    if (scope.shouldScope) {
      const { data: existing } = await supabaseAdmin
        .from("leaves")
        .select("id, employees!inner(company_id)")
        .eq("id", params.id)
        .eq("employees.company_id", scope.companyId)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: "Leave request not found in your company" }, { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("leaves")
      .update(updates)
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 400 });
    }

    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("full_name, email")
      .eq("id", data.employee_id)
      .maybeSingle();

    if (employee?.email) {
      try {
        await sendLeaveStatusEmail(body.status, {
          name: employee.full_name,
          email: employee.email,
          leaveType: data.leave_type,
          startDate: data.start_date,
          endDate: data.end_date,
        });
      } catch (emailErr) {
        const message =
          emailErr instanceof Error ? emailErr.message : "Failed to send notification email";
        return NextResponse.json(
          { ...data, emailWarning: message },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }
}
