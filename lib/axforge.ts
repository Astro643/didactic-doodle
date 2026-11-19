const BASE = "https://api.axforge.ai/v1/chat/completions";
const API_KEY = process.env.AXFORGE_API_KEY;
const MODEL = "qwen3.8-flash-next";

export const MODELS = { agent: MODEL, support: MODEL };

export function keyCount() {
  return API_KEY ? 1 : 0;
}

type AxForgeError = Error & { status?: number; quota?: boolean };

export const isQuota = (e: unknown) =>
  (e as AxForgeError)?.quota === true ||
  (e as AxForgeError)?.status === 429 ||
  /RESOURCE_EXHAUSTED|quota|rate/i.test(String((e as Error)?.message ?? ""));

async function generateContent(model: string, prompt: string, system?: string, json = false) {
  if (!API_KEY) throw new Error("AXFORGE_API_KEY is not configured");

  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const error: AxForgeError = new Error(`AxForge ${res.status}: ${text.slice(0, 500)}`);
    error.status = res.status;
    error.quota = res.status === 429;
    throw error;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | { text?: string }[] | null } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part) => part.text ?? "").join("")
      : "";
  if (!text.trim()) throw new Error("AxForge returned an empty response");
  return text.trim();
}

export async function generate(model: string, prompt: string, system?: string) {
  return generateContent(model, prompt, system);
}

export async function generateJson<T>(model: string, prompt: string, system: string): Promise<T> {
  const text = await generateContent(model, prompt, system, true);
  return JSON.parse(text) as T;
}
