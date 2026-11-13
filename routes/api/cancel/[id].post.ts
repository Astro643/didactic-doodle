import { getRun } from "workflow/api";

export default async ({ context }: { context: { params?: { id?: string } } }) => {
  const id = context.params?.id;
  if (!id) return Response.json({ detail: "missing run id" }, { status: 400 });
  try {
    const run = getRun(id);
    await run.cancel();
    return Response.json({ cancelled: true });
  } catch (e) {
    console.error("cancel failed:", e);
    return Response.json({ detail: "Run not found" }, { status: 404 });
  }
};
