import { generate, isQuota, MODELS } from "../../lib/axforge";

export default async ({ req }: { req: Request }) => {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ detail: "request body must be an object" }, { status: 400 });
  }
  const { prompt, system } = body as { prompt?: unknown; system?: unknown };
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 8000) {
    return Response.json({ detail: "prompt must be between 1 and 8000 characters" }, { status: 400 });
  }
  if (system !== undefined && (typeof system !== "string" || system.length > 4000)) {
    return Response.json({ detail: "system instructions must be at most 4000 characters" }, { status: 400 });
  }

  try {
    const response = await generate(MODELS.agent, prompt.trim(), typeof system === "string" ? system.trim() : undefined);
    return Response.json({ response });
  } catch (error) {
    console.error("playground request failed:", error);
    const detail = isQuota(error)
      ? "The AI is rate limited right now — please try again in a few minutes."
      : "Could not generate a response right now.";
    return Response.json({ detail }, { status: 503 });
  }
};
