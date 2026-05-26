import { NextResponse } from "next/server";
import { updateRecord, deleteRecord } from "@/lib/fake-db";
import { getDataFile } from "@/lib/resource-map";

export async function PATCH(
  request: Request,
  { params }: { params: { resource: string; id: string } }
) {
  try {
    const file = getDataFile(params.resource);
    if (!file || file === "settings.json") {
      return NextResponse.json({ error: "Invalid resource" }, { status: 404 });
    }

    const body = await request.json();
    const updated = await updateRecord(file, params.id, body);
    if (!updated) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { resource: string; id: string } }
) {
  try {
    const file = getDataFile(params.resource);
    if (!file || file === "settings.json") {
      return NextResponse.json({ error: "Invalid resource" }, { status: 404 });
    }

    const deleted = await deleteRecord(file, params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
