/**
 * Shared Gemini wrapper — used by all AI endpoints.
 * Centralizes API-key handling, error normalization, and timeout.
 */

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type GeminiContent = {
  role: "user" | "model";
  parts: { text: string }[];
};

export interface CallGeminiOptions {
  systemPrompt?: string;
  contents: GeminiContent[];
  temperature?: number;
  maxOutputTokens?: number;
  /** Abort after this many ms — default 45s */
  timeoutMs?: number;
}

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

export async function callGemini({
  systemPrompt,
  contents,
  temperature = 0.5,
  maxOutputTokens = 2048,
  timeoutMs = 45_000,
}: CallGeminiOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new GeminiError(
      "GEMINI_API_KEY is not configured in .env.local",
      500
    );
  }

  // Gemini contents must start with a 'user' role
  const safeContents = [...contents];
  while (safeContents.length > 0 && safeContents[0].role !== "user") {
    safeContents.shift();
  }
  if (safeContents.length === 0) {
    throw new GeminiError("No user message provided", 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        ...(systemPrompt
          ? { systemInstruction: { parts: [{ text: systemPrompt }] } }
          : {}),
        contents: safeContents,
        generationConfig: { temperature, maxOutputTokens },
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg =
        (errBody as { error?: { message?: string } })?.error?.message ??
        `Gemini API error ${res.status}`;
      throw new GeminiError(msg, res.status);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";

    if (!text.trim()) {
      throw new GeminiError("Empty response from AI", 502);
    }
    return text;
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new GeminiError("AI request timed out", 504);
    }
    throw new GeminiError(
      err instanceof Error ? err.message : "Failed to reach AI service",
      502
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Convenience: single-turn prompt → reply */
export async function askGemini(
  systemPrompt: string,
  userMessage: string,
  options: Partial<CallGeminiOptions> = {}
): Promise<string> {
  return callGemini({
    systemPrompt,
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    ...options,
  });
}
