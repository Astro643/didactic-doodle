import {
  GREEN_PROXY_CONTROL_DEFAULTS,
  updateGreenProxyControls,
  type GreenProxyControl,
} from "../../../lib/green-proxy-controls";

export default async ({ req }: { req: Request }) => {
  const parsed: unknown = await req.json().catch(() => ({}));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return Response.json({ detail: "Provide one or more valid boolean controls." }, { status: 400 });
  }
  const body = parsed as Record<string, unknown>;
  const entries = Object.entries(body);
  if (
    entries.length === 0 ||
    entries.some(([key, value]) => !Object.hasOwn(GREEN_PROXY_CONTROL_DEFAULTS, key) || typeof value !== "boolean")
  ) {
    return Response.json({ detail: "Provide one or more valid boolean controls." }, { status: 400 });
  }

  try {
    return Response.json(
      await updateGreenProxyControls(Object.fromEntries(entries) as Partial<Record<GreenProxyControl, boolean>>),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Green Proxy controls update failed:", error);
    return Response.json({ detail: "Could not save Green Proxy controls." }, { status: 503 });
  }
};
