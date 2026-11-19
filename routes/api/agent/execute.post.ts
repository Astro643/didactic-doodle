import { start } from "workflow/api";
import { parseAgentPlanInput } from "../../../lib/agent";
import { requireGreenProxyAuthorization } from "../../../lib/green-proxy-auth";
import { executeAgent } from "../../../workflows/agent";

export default async ({ req }: { req: Request }) => {
  const unauthorized = requireGreenProxyAuthorization(req);
  if (unauthorized) return unauthorized;
  const body = await req.json().catch(() => ({} as { agent_plan?: unknown }));
  const plan = parseAgentPlanInput(body.agent_plan);
  if (!plan) return Response.json({ detail: "a valid agent_plan from preview is required" }, { status: 400 });

  try {
    const run = await start(executeAgent, [plan]);
    return Response.json({ command_id: run.runId, status: "processing" });
  } catch (error) {
    console.error("agent workflow start failed:", error);
    return Response.json({ detail: "Could not start the agent right now." }, { status: 503 });
  }
};
