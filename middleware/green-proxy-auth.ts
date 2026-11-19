import {
  isAgentApiKeyAuthorized,
  isGreenProxyConfigured,
  isGreenProxySessionAuthorized,
} from "../lib/green-proxy-auth";
import {
  getGreenProxyControls,
  type GreenProxyControl,
} from "../lib/green-proxy-controls";

const PUBLIC_AUTH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/session",
  "/api/auth/logout",
]);

export default (event: { req: Request }) => {
  const request = event.req;
  const path = new URL(request.url).pathname;
  if ((path !== "/api" && !path.startsWith("/api/")) || PUBLIC_AUTH_PATHS.has(path)) return;

  if (!isGreenProxyConfigured()) {
    return Response.json({ detail: "Green Proxy authentication is not configured" }, { status: 503 });
  }
  const agentApiPath =
    path === "/api/agent/preview" ||
    path === "/api/agent/execute" ||
    /^\/api\/(?:status|cancel)\/[^/]+$/.test(path);
  if (!isGreenProxySessionAuthorized(request) && !(agentApiPath && isAgentApiKeyAuthorized(request))) {
    return Response.json({ detail: "unauthorized" }, { status: 401 });
  }

  if (
    path === "/api" ||
    path === "/api/public/status" ||
    path === "/api/admin/controls" ||
    /^\/api\/(?:status|cancel)\/[^/]+$/.test(path)
  ) {
    return;
  }

  return checkGreenProxyControls(path);
};

async function checkGreenProxyControls(path: string) {
  let controls;
  try {
    ({ controls } = await getGreenProxyControls());
  } catch (error) {
    console.error("Green Proxy control state unavailable:", error);
    return Response.json({ detail: "Green Proxy control state is unavailable." }, { status: 503 });
  }

  if (!controls.systemEnabled) {
    return Response.json({ detail: "All AI operations are paused in Green Proxy." }, { status: 503 });
  }

  const required: GreenProxyControl[] = [];
  if (path.startsWith("/api/agent/")) required.push("agentEnabled", "aiEnabled");
  if (path === "/api/preview") required.push("aiEnabled");
  if (path === "/api/execute") required.push("sandboxEnabled");
  if (path === "/api/support/chat") required.push("supportEnabled", "aiEnabled");

  const disabled = required.find((control) => !controls[control]);
  if (disabled) {
    return Response.json({ detail: `This feature is turned off in Green Proxy: ${disabled}` }, { status: 503 });
  }
}
