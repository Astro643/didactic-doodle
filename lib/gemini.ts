const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const KEYS = [
  ...(process.env.GEMINI_API_KEYS ?? process.env.GEMINI_API_KEY ?? "").split(","),
  ...[1, 2, 3, 4].map((n) => process.env[`GEMINI_API_KEY_${n}`] ?? ""),
]
  .map((k) => k.trim())
  .filter(Boolean);

let cursor = 0;
const cooldowns = new Map<number, number>();
const failures = new Map<number, number[]>();

export const MODELS = {
  strong: process.env.MODEL_STRONG ?? "gemini-3.8-flash",
  lite: process.env.MODEL_LITE ?? "gemini-3.5-flash-lite",
  support: process.env.MODEL_SUPPORT ?? "gemma-4",
};

export function keyCount() {
  return KEYS.length;
}

type GeminiError = Error & { status?: number };

const isQuota = (e: unknown) =>
  (e as GeminiError)?.status === 429 ||
  /RESOURCE_EXHAUSTED|quota|rate/i.test(String((e as Error)?.message ?? ""));

async function generateContent(model: string, body: Record<string, unknown>) {
  let last: unknown;
  for (let n = 0; n < KEYS.length; n++) {
    const i = (cursor + n) % KEYS.length;
    if ((cooldowns.get(i) ?? 0) > Date.now()) continue;
    cursor = (i + 1) % KEYS.length;
    try {
      const res = await fetch(`${BASE}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEYS[i] },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const e: GeminiError = new Error(`gemini ${res.status}: ${text.slice(0, 500)}`);
        e.status = res.status;
        throw e;
      }
      const data = await res.json();
      cooldowns.delete(i);
      failures.delete(i);
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      return parts.map((p: { text?: string }) => p.text ?? "").join("").trim();
    } catch (e) {
      if (!isQuota(e)) throw e;
      last = e;
      const msg = String((e as Error)?.message ?? "");
      const day = new Date();
      const reset = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1);
      const recent = (failures.get(i) ?? []).filter((t) => Date.now() - t < 900_000);
      recent.push(Date.now());
      failures.set(i, recent);
      const retry = Number(/retryDelay["': ]*(\d+)s/.exec(msg)?.[1] ?? 60);
      const daily = /per ?day|RPD/i.test(msg) || recent.length >= 3;
      cooldowns.set(
        i,
        Date.now() + (daily ? Math.max(60, Math.floor((reset - Date.now()) / 1000)) : Math.min(300, Math.max(60, retry))) * 1000,
      );
    }
  }
  throw last ?? new Error("no GEMINI_API_KEYS configured");
}

export async function generate(model: string, prompt: string, system?: string) {
  const body: Record<string, unknown> = { contents: [{ parts: [{ text: prompt }] }] };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  return generateContent(model, body);
}

export async function generateJson<T>(model: string, prompt: string, system: string): Promise<T> {
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { responseMimeType: "application/json" },
  };
  const text = await generateContent(model, body);
  return JSON.parse(text || "{}") as T;
}
