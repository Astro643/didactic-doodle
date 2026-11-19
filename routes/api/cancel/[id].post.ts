import { getRun } from "workflow/api";
import { requireGreenProxyAuthorization } from "../../../lib/green-proxy-auth";

export default async ({ req, context }: { req: Request; context: { params?: { id?: string } } }) => {
  const id = context.params?.id;
  if (!id) return Response.json({ detail: "missing run id" }, { status: 400 });
  try {
    const run = getRun(id);
    const agentEvents = run.getReadable<Uint8Array>({ namespace: "agent" });
    if ((await agentEvents.getTailIndex()) >= 0) {
      const unauthorized = requireGreenProxyAuthorization(req);
      if (unauthorized) return unauthorized;
    }
    await run.cancel();
    return Response.json({ cancelled: true });
  } catch (e) {
    console.error("cancel failed:", e);
    return Response.json({ detail: "Run not found" }, { status: 404 });
  }
};
