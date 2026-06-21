import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyScope } from "@/lib/company-scope";

const DEFAULT_WORK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function mapProfile(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id ?? null,
    name: row.name ?? "",
    logoUrl: row.logo_url ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    checkInTime: String(row.check_in_time ?? "09:00").slice(0, 5),
    checkOutTime: String(row.check_out_time ?? "18:00").slice(0, 5),
    lateThresholdMinutes: Number(row.late_threshold_minutes ?? 15),
    gracePeriodMinutes: Number(row.grace_period_minutes ?? 0),
    workDays: Array.isArray(row.work_days) ? row.work_days : DEFAULT_WORK_DAYS,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    locationRadiusMeters: Number(row.location_radius_meters ?? 1000),
    locationSet: Boolean(row.location_set),
    policies: Array.isArray(row.policies) ? row.policies : [],
  };
}

export async function GET(request: Request) {
  try {
    const scope = getCompanyScope(request);
    let query = supabaseAdmin
      .from("office_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (scope.shouldScope) {
      query = query.eq("company_id", scope.companyId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: mapProfile(data) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch office profile" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = getCompanyScope(request);
    const body = await request.json();
    const companyId = scope.shouldScope ? scope.companyId : body.companyId ?? body.company_id ?? null;

    const payload = {
      company_id: companyId,
      name: body.name ?? "My Software House",
      logo_url: body.logoUrl ?? body.logo_url ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      address: body.address ?? "",
      check_in_time: body.checkInTime ?? body.check_in_time ?? "09:00",
      check_out_time: body.checkOutTime ?? body.check_out_time ?? "18:00",
      late_threshold_minutes: Number(body.lateThresholdMinutes ?? body.late_threshold_minutes ?? 15),
      grace_period_minutes: Number(body.gracePeriodMinutes ?? body.grace_period_minutes ?? 0),
      work_days: body.workDays ?? body.work_days ?? DEFAULT_WORK_DAYS,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      location_radius_meters: Number(body.locationRadiusMeters ?? body.location_radius_meters ?? 1000),
      location_set: Boolean(body.locationSet ?? body.location_set ?? false),
      policies: body.policies ?? [],
    };

    const existingQuery = supabaseAdmin
      .from("office_profiles")
      .select("id")
      .limit(1);
    const { data: existing } = companyId
      ? await existingQuery.eq("company_id", companyId).maybeSingle()
      : await existingQuery.is("company_id", null).maybeSingle();

    const result = existing
      ? await supabaseAdmin
          .from("office_profiles")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single()
      : await supabaseAdmin
          .from("office_profiles")
          .insert(payload)
          .select()
          .single();

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: mapProfile(result.data) });
  } catch {
    return NextResponse.json({ error: "Failed to save office profile" }, { status: 500 });
  }
}
