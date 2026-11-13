import { getRun } from "workflow/api";

export default async ({ context }: { context: { params?: { id?: string } } }) => {
  const id = context.params?.id;
  if (!id) return Response.json({ detail: "missing run id" }, { status: 400 });
  try {
    const run = getRun(id);
    const status = await run.status;
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
    return Response.json({ status });
  } catch (e) {
    console.error("status lookup failed:", e);
    return Response.json({ detail: "Run not found" }, { status: 404 });
  }
};
