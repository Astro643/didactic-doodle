import { getRun } from "workflow/api";
import { isAgentAuthorized } from "../../../lib/agent-auth";

async function latestAgentEvent(run: ReturnType<typeof getRun>) {
  const stream = run.getReadable<Uint8Array>({ namespace: "agent" });
  const tailIndex = await stream.getTailIndex();
  if (tailIndex < 0) return null;

  const latest = run.getReadable<Uint8Array>({ namespace: "agent", startIndex: tailIndex });
  const reader = latest.getReader();
  try {
    const { value } = await reader.read();
    return value ? JSON.parse(new TextDecoder().decode(value)) as Record<string, unknown> : null;
  } finally {
    await reader.cancel();
  }
}

export default async ({ req, context }: { req: Request; context: { params?: { id?: string } } }) => {
  const id = context.params?.id;
  if (!id) return Response.json({ detail: "missing run id" }, { status: 400 });
  try {
    const run = getRun(id);
    const status = await run.status;
    const progress = await latestAgentEvent(run);
    if (progress && !isAgentAuthorized(req)) {
      return Response.json({ detail: "unauthorized" }, { status: 401 });
    }
    if (status === "completed") {
      const value = await run.returnValue;
      // The workflow returns StepResult[] objects; the Console renders `result` as plain text,
      // so flatten it into readable lines: "✓ label — output".
      const result = Array.isArray(value)
        ? value
            .map((s: { label?: string; ok?: boolean; detail?: string }) =>
              `${s?.ok ? "\u2713" : "\u2717"} ${s?.label ?? "step"}${s?.detail ? ` \u2014 ${s.detail}` : ""}`.trim(),
            )
            .join("\n")
        : value && typeof value === "object" && Array.isArray((value as { actions?: unknown[] }).actions)
          ? [
              ...(value as { actions: { label?: string; tool?: string; ok?: boolean; output?: string }[] }).actions
                .map((action) => `${action.ok ? "\u2713" : "\u2717"} ${action.label ?? action.tool ?? "tool"}${action.output ? ` \u2014 ${action.output}` : ""}`.trim()),
              String((value as { answer?: unknown }).answer ?? ""),
            ].filter(Boolean).join("\n")
        : typeof value === "string"
          ? value
          : "";
      return Response.json({ status, result });
    }
    if (status === "failed" || status === "cancelled") {
      let error = `Run ${status}`;
      try {
        await run.returnValue;
      } catch (e) {
        error = String((e as Error)?.message ?? e).slice(0, 500);
      }
      return Response.json({ status, error });
    }
    if (progress?.status === "awaiting_approval") {
      return Response.json({ status: "awaiting_approval", approval: progress });
    }
    return Response.json({ status, ...(progress ? { progress } : {}) });
  } catch (e) {
    console.error("status lookup failed:", e);
    return Response.json({ detail: "Run not found" }, { status: 404 });
  }
};
