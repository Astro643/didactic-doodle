import { start } from "workflow/api";
import { generate, generateJson, MODELS } from "../../lib/gemini";
import { parsePlan, type Plan } from "../../lib/plan";
import { executePlan } from "../../workflows/execute";

const ROUTER_SYSTEM =
  "You are Controller, an agent that manages Discord servers. " +
  "Decide whether the user's message is a question about how things work, or an actionable goal for their server. " +
  "Reply with JSON only: {\"intent\": \"question\"} or {\"intent\": \"goal\"}."

const PLAN_SYSTEM =
  "You are Controller's planner. Given a goal for a Discord server, produce a short summary and an ordered list of concrete steps. " +
  "Each step has a short label and a machine-readable action. Reply with JSON only: " +
  "{\"summary\": string, \"steps\": [{\"label\": string, \"action\": string}]}."

export default async ({ req }: { req: Request }) => {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  let plan = parsePlan(body.plan);
  if (!plan && typeof body.prompt === "string" && body.prompt.trim()) {
    const message = body.prompt.trim();
    try {
      const route = await generateJson<{ intent: "question" | "goal" }>(MODELS.support, message, ROUTER_SYSTEM);
      if (route.intent !== "goal") {
        return Response.json({ detail: "That looks like a question, not a task." }, { status: 400 });
      }
      plan = parsePlan(await generateJson<Plan>(MODELS.strong, `Goal: ${message}`, PLAN_SYSTEM));
    } catch (e) {
      console.error("execute planning failed:", e);
      return Response.json({ detail: "Could not plan that goal right now." }, { status: 503 });
    }
  }
  if (!plan) {
    return Response.json({ detail: "prompt or plan is required" }, { status: 400 });
  }
  const run = await start(executePlan, [plan]);
  return Response.json({ command_id: run.runId, status: "processing" });
};
