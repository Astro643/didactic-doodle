import { generate, generateJson, isQuota, MODELS } from "../../lib/gemini";
import { knowledgeSystem } from "../../lib/knowledge";
import type { Plan } from "../../lib/plan";

const ROUTER_SYSTEM =
  "You are Controller, an agent that manages Discord servers. " +
  "Decide whether the user's message is a question about how things work, or an actionable goal for their server. " +
  "Reply with JSON only: {\"intent\": \"question\"} or {\"intent\": \"goal\"}."

const PLAN_SYSTEM =
  "You are Controller's planner. Given a goal for a Discord server, produce a short summary and an ordered list of concrete steps. " +
  "Each step has a short label and a machine-readable action. Reply with JSON only: " +
  "{\"summary\": string, \"steps\": [{\"label\": string, \"action\": string}]}."

export default async ({ req }: { req: Request }) => {
  const { prompt } = await req.json().catch(() => ({} as { prompt?: unknown }));
  if (typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ detail: "prompt is required" }, { status: 400 });
  }
  const message = prompt.trim();
  try {
    const route = await generateJson<{ intent: "question" | "goal" }>(MODELS.lite, message, ROUTER_SYSTEM);
    if (route.intent !== "goal") {
      const answer = await generate(MODELS.support, message, knowledgeSystem());
      return Response.json({ incomplete: true, question: answer, complete: false });
    }
    const plan = await generateJson<Plan>([MODELS.strong, ...MODELS.strongBackups], `Goal: ${message}`, PLAN_SYSTEM);
    return Response.json({ summary: plan.summary, steps: plan.steps, complete: true });
  } catch (e) {
    console.error("preview failed:", e);
    const detail = isQuota(e)
      ? "The AI is rate limited right now — please try again in a few minutes."
      : "Could not generate a plan right now.";
    return Response.json({ detail }, { status: 503 });
  }
};
