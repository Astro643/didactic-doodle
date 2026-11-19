import { clearGreenProxyCookie } from "../../../lib/green-proxy-auth";

export default async () =>
  Response.json(
    { authenticated: false },
    {
      headers: {
        "Set-Cookie": clearGreenProxyCookie(),
        "Cache-Control": "no-store",
      },
    },
  );
