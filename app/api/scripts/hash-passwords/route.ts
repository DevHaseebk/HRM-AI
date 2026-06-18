import { NextResponse } from "next/server";
import { hashExistingPasswords } from "@/scripts/hash-passwords";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
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
