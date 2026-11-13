import { generate, isQuota, MODELS } from "../../../lib/gemini";
import { knowledgeSystem } from "../../../lib/knowledge";

export default async ({ req }: { req: Request }) => {
  const { message, history } = await req.json().catch(() => ({} as Record<string, unknown>));
  if (typeof message !== "string" || !message.trim()) {
    return Response.json({ detail: "message is required" }, { status: 400 });
  }
  try {
    const turns = (Array.isArray(history) ? history : [])
      .filter((h): h is { role: unknown, text: unknown } => !!h && typeof h === "object")
      .filter((h) => typeof h.text === "string" && h.text.trim())
      .slice(-8)
      .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${(h.text as string).slice(0, 800)}`)
    turns.push(`User: ${message.trim().slice(0, 600)}`)
    const reply = await generate(MODELS.support, turns.join("\n"), knowledgeSystem());
    return Response.json({ reply });
  } catch (e) {
    console.error("support chat failed:", e);
    const detail = isQuota(e)
      ? "The AI is rate limited right now — please try again in a few minutes."
      : "Support is temporarily unavailable.";
    return Response.json({ detail }, { status: 503 });
  }
};
