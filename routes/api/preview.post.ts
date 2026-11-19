import { generateAgentResponse } from "../../lib/agent";
import { isQuota } from "../../lib/gemini";

export default async ({ req }: { req: Request }) => {
  const { prompt } = await req.json().catch(() => ({} as { prompt?: unknown }));
  if (typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ detail: "prompt is required" }, { status: 400 });
  }
  const message = prompt.trim();
  try {
    const response = await generateAgentResponse(message);
    if (response.type === "answer") {
      return Response.json({ incomplete: true, question: response.answer, complete: false });
    }
    const plan = response.plan;
    return Response.json({ summary: plan.summary, steps: plan.steps, complete: true });
  } catch (e) {
    console.error("preview failed:", e);
    const detail = isQuota(e)
      ? "The AI is rate limited right now \u2014 please try again in a few minutes."
      : "Could not generate a plan right now.";
    return Response.json({ detail }, { status: 503 });
  }
};
