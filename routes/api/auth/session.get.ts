import { isGreenProxySessionAuthorized } from "../../../lib/green-proxy-auth";

export default async ({ req }: { req: Request }) =>
  Response.json(
    { authenticated: isGreenProxySessionAuthorized(req) },
    { headers: { "Cache-Control": "no-store" } },
  );
