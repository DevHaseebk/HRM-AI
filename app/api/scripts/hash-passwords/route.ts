import { NextRequest, NextResponse } from "next/server";
import { hashExistingPasswords } from "@/scripts/hash-passwords";
import { getServerSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const secretValid = Boolean(secret) && secret === process.env.MIGRATION_SECRET;

    const session = await getServerSession(request);
    const sessionValid = session?.role === "super_admin";

    if (!secretValid || !sessionValid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await hashExistingPasswords();
    return NextResponse.json({
      success: true,
      count: result.updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to hash passwords" },
      { status: 500 }
    );
  }
}
