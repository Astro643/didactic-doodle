import { getRun } from "workflow/api";

export default async ({ context }: { context: { params?: { id?: string } } }) => {
  const id = context.params?.id;
  if (!id) return Response.json({ detail: "missing run id" }, { status: 400 });
  try {
    const run = getRun(id);
    const status = await run.status;
    if (status === "completed") {
      const result = await run.returnValue;
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
