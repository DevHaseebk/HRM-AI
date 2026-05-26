import { NextResponse } from "next/server";
import { addRecord, readData, writeData } from "@/lib/fake-db";
import { getDataFile } from "@/lib/resource-map";

export async function POST(
  request: Request,
  { params }: { params: { resource: string } }
) {
  try {
    const file = getDataFile(params.resource);
    if (!file) {
      return NextResponse.json({ error: "Invalid resource" }, { status: 404 });
    }

    const body = await request.json();

    if (file === "settings.json") {
      await writeData(file, body);
      return NextResponse.json(body);
    }

    if (!body.id) {
      return NextResponse.json({ error: "Record id is required" }, { status: 400 });
    }

    const record = await addRecord(file, body);
    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { resource: string } }
) {
  try {
    const file = getDataFile(params.resource);
    if (!file) {
      return NextResponse.json({ error: "Invalid resource" }, { status: 404 });
    }

    if (file === "settings.json") {
      const data = await readData(file);
      return NextResponse.json(data);
    }

    const data = await readData<unknown[]>(file);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 });
  }
}
