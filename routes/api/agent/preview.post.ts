import { generateAgentPlan } from "../../../lib/agent";
import { requireAgentAuthorization } from "../../../lib/agent-auth";
import { isHighImpactTool } from "../../../lib/agent-tools";

export default async ({ req }: { req: Request }) => {
  const unauthorized = requireAgentAuthorization(req);
  if (unauthorized) return unauthorized;
  const body = await req.json().catch(() => ({} as { prompt?: unknown }));
  if (typeof body.prompt !== "string" || !body.prompt.trim()) {
    return Response.json({ detail: "prompt is required" }, { status: 400 });
  }
  try {
    const response = await generateAgentPlan(body.prompt.trim());
    if (response.type === "answer") {
      return Response.json({ incomplete: true, question: response.answer, complete: false });
    }
    return Response.json({
      summary: response.summary,
      steps: response.steps.map((step) => ({
        label: step.label,
        action: `${step.tool}: ${step.label}`,
        tool: step.tool,
        requires_confirmation: isHighImpactTool(step.tool),
      })),
      agent_plan: response,
      complete: true,
    });
  } catch (error) {
    console.error("agent preview failed:", error);
    return Response.json({ detail: "Could not generate an agent plan right now." }, { status: 503 });
  }
};
