import { start } from "workflow/api";
import { generateAgentResponse } from "../../lib/agent";
import { parsePlan, type Plan } from "../../lib/plan";
import { executePlan } from "../../workflows/execute";

export default async ({ req }: { req: Request }) => {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  let plan = parsePlan(body.plan);
  if (!plan && typeof body.prompt === "string" && body.prompt.trim()) {
    const message = body.prompt.trim();
    try {
      const response = await generateAgentResponse(message);
      if (response.type !== "plan") {
        return Response.json({ detail: "That looks like a question, not a task." }, { status: 400 });
      }
      plan = response.plan;
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
