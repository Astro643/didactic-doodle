import { createGreenProxyCookie, isGreenProxyConfigured, verifyGreenProxyPassword } from "../../../lib/green-proxy-auth";

export default async ({ req }: { req: Request }) => {
  if (!isGreenProxyConfigured()) {
    return Response.json({ detail: "Green Proxy authentication is not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({} as { password?: unknown }));
  if (!verifyGreenProxyPassword(body.password)) {
    return Response.json({ detail: "Invalid password" }, { status: 401 });
  }

  return Response.json(
    { authenticated: true },
    {
      headers: {
        "Set-Cookie": createGreenProxyCookie(),
        "Cache-Control": "no-store",
      },
    },
  );
};
