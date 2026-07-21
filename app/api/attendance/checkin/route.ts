import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { haversineDistance } from "@/lib/location";
import { getServerSession } from "@/lib/server-auth";

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function pakistanMinutesNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function timeToMinutes(value: string | null | undefined) {
  const [hour, minute] = String(value ?? "09:00").slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function validCoordinate(value: unknown, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const employeeId = String(body.employee_id ?? "");
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!employeeId) {
      return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
    }
    if (!session.employee_id) {
      return NextResponse.json(
        { error: "Your account is not linked to an employee record" },
        { status: 400 }
      );
    }
    if (session.employee_id !== employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!validCoordinate(body.latitude, -90, 90) || !validCoordinate(body.longitude, -180, 180)) {
      return NextResponse.json(
        { error: "A valid latitude and longitude are required for check-in" },
        { status: 400 }
      );
    }

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("id, company_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    let profileQuery = supabaseAdmin
      .from("office_profiles")
      .select("id, company_id, name, latitude, longitude, location_set, location_radius_meters, check_in_time, late_threshold_minutes, grace_period_minutes")
      .limit(1);
    profileQuery = employee.company_id
      ? profileQuery.eq("company_id", employee.company_id)
      : profileQuery.is("company_id", null);

    const { data: officeProfile, error: profileError } = await profileQuery.maybeSingle();
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    const radius = Number(officeProfile?.location_radius_meters ?? 1000);
    let distance = 0;
    let officeLocationWasSet = false;

    if (
      officeProfile?.location_set &&
      officeProfile.latitude != null &&
      officeProfile.longitude != null
    ) {
      distance = haversineDistance(
        latitude,
        longitude,
        Number(officeProfile.latitude),
        Number(officeProfile.longitude)
      );

      if (distance > radius) {
        const roundedDistance = Math.round(distance);
        return NextResponse.json(
          {
            error: `You are too far from office. Distance: ${roundedDistance}m, Required: within ${radius}m`,
            code: "OUTSIDE_OFFICE_RANGE",
            distance: roundedDistance,
            radius,
          },
          { status: 403 }
        );
      }
    } else if (officeProfile) {
      const { error: locationError } = await supabaseAdmin
        .from("office_profiles")
        .update({ latitude, longitude, location_set: true })
        .eq("id", officeProfile.id);
      if (locationError) return NextResponse.json({ error: locationError.message }, { status: 500 });
      officeLocationWasSet = true;
    } else {
      let companyName = "My Software House";
      if (employee.company_id) {
        const { data: company } = await supabaseAdmin
          .from("companies")
          .select("name")
          .eq("id", employee.company_id)
          .maybeSingle();
        companyName = company?.name ?? companyName;
      }

      const { error: createProfileError } = await supabaseAdmin
        .from("office_profiles")
        .insert({
          company_id: employee.company_id,
          name: companyName,
          latitude,
          longitude,
          location_set: true,
          location_radius_meters: radius,
        });
      if (createProfileError) return NextResponse.json({ error: createProfileError.message }, { status: 500 });
      officeLocationWasSet = true;
    }

    const date = todayISO();
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("attendance")
      .select("id, status, check_in_time")
      .eq("employee_id", employeeId)
      .eq("date", date)
      .maybeSingle();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (existing?.check_in_time && ["present", "late"].includes(existing.status)) {
      return NextResponse.json({ error: "Already checked in today" }, { status: 400 });
    }

    const now = new Date();
    const lateAfterMinutes =
      timeToMinutes(officeProfile?.check_in_time) +
      Number(officeProfile?.late_threshold_minutes ?? 15) +
      Number(officeProfile?.grace_period_minutes ?? 0);
    const status = pakistanMinutesNow() > lateAfterMinutes ? "late" : "present";
    const payload = {
      status,
      check_in_time: now.toISOString(),
      check_in: now.toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour12: false }),
      marked_by: "self",
      latitude,
      longitude,
      distance_from_office: Number(distance.toFixed(2)),
      override_note: null,
    };

    const saveResult = existing
      ? await supabaseAdmin.from("attendance").update(payload).eq("id", existing.id)
      : await supabaseAdmin.from("attendance").insert({ employee_id: employeeId, date, ...payload });

    if (saveResult.error) return NextResponse.json({ error: saveResult.error.message }, { status: 500 });

    const message = officeLocationWasSet
      ? "Office location has been set based on your check-in location"
      : status === "late"
        ? "Checked in (marked as late)"
        : "Checked in successfully";

    return NextResponse.json({
      success: true,
      status,
      checkInTime: now.toISOString(),
      distance: Math.round(distance),
      radius,
      officeLocationWasSet,
      message,
    });
  } catch {
    return NextResponse.json({ error: "Failed to check in" }, { status: 500 });
  }
}
