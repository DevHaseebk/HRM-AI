import { NextResponse } from "next/server";
import { askGemini, GeminiError } from "@/lib/ai-gemini";

export async function POST(request: Request) {
  let body: {
    jobTitle?: string;
    experienceLevel?: string;
    skills?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const jobTitle = body.jobTitle?.trim();
  if (!jobTitle) {
    return NextResponse.json({ error: "jobTitle is required" }, { status: 400 });
  }
  const experienceLevel = body.experienceLevel?.trim() || "Mid-level (3–5 years)";
  const skills = body.skills?.trim() || "(not specified)";

  const systemPrompt = `You are a senior technical interviewer at a Pakistani software company.
You design rigorous interview kits with evaluation criteria.

Return ONLY valid JSON in this EXACT structure (no markdown, no commentary):
{
  "jobTitle": "...",
  "experienceLevel": "...",
  "technical": [
    {"question": "...", "evaluation": "..."},
    {"question": "...", "evaluation": "..."},
    {"question": "...", "evaluation": "..."},
    {"question": "...", "evaluation": "..."},
    {"question": "...", "evaluation": "..."}
  ],
  "behavioral": [
    {"question": "...", "evaluation": "..."},
    {"question": "...", "evaluation": "..."},
    {"question": "...", "evaluation": "..."}
  ],
  "cultureFit": [
    {"question": "...", "evaluation": "..."},
    {"question": "...", "evaluation": "..."}
  ]
}

Each "evaluation" describes what a STRONG answer looks like (1–2 sentences).
Be specific to ${jobTitle}, ${experienceLevel}, and Pakistani workplace context.`;

  const userPayload = `Generate interview kit:
Job Title: ${jobTitle}
Experience Level: ${experienceLevel}
Required Skills: ${skills}`;

  try {
    const raw = await askGemini(systemPrompt, userPayload, {
      temperature: 0.55,
      maxOutputTokens: 2048,
    });
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned malformed JSON", raw },
        { status: 502 }
      );
    }
    return NextResponse.json({ kit: parsed });
  } catch (err) {
    const status = err instanceof GeminiError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Interview kit generation failed";
    return NextResponse.json({ error: message }, { status });
  }
}
