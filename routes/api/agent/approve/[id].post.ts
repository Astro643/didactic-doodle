import { getHookByToken, resumeHook } from "workflow/api";
import { requireAgentAuthorization } from "../../../../lib/agent-auth";

export default async ({
  req,
  context,
}: {
  req: Request;
  context: { params?: { id?: string } };
}) => {
  const unauthorized = requireAgentAuthorization(req);
  if (unauthorized) return unauthorized;
  const runId = context.params?.id;
  if (!runId) return Response.json({ detail: "missing run id" }, { status: 400 });

  const body = await req.json().catch(() => ({} as { approval_token?: unknown; approved?: unknown }));
  if (typeof body.approval_token !== "string" || typeof body.approved !== "boolean") {
    return Response.json({ detail: "approval_token and approved are required" }, { status: 400 });
  }

  try {
    const hook = await getHookByToken(body.approval_token);
    if (hook.runId !== runId) return Response.json({ detail: "approval token does not match this run" }, { status: 403 });
    const metadata = (await hook.metadata) as { runId?: unknown } | undefined;
    if (metadata?.runId !== runId) return Response.json({ detail: "approval token does not match this run" }, { status: 403 });
    await resumeHook(hook, { approved: body.approved });
    return Response.json({ resumed: true });
  } catch (error) {
    console.error("agent approval failed:", error);
    return Response.json({ detail: "Approval is no longer available for this run." }, { status: 404 });
  }
};
