import { NextResponse } from "next/server";
import { sendCredentialsEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const { email, name, password } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "email, name, and password are required" },
        { status: 400 }
      );
    }

    await sendCredentialsEmail(email, name, password);

    return NextResponse.json({ success: true, message: "Credentials email sent" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
