import {
  isAgentApiKeyAuthorized,
  isGreenProxyConfigured,
  isGreenProxySessionAuthorized,
} from "../lib/green-proxy-auth";
import {
  getGreenProxyControls,
  type GreenProxyControls,
} from "../lib/green-proxy-controls";
import { isPlaygroundRateLimited, playgroundRateLimitKey } from "../lib/playground-rate-limit";

const PUBLIC_AUTH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/session",
  "/api/auth/logout",
]);

export default (event: { req: Request }) => {
  const request = event.req;
  const path = new URL(request.url).pathname;
  if ((path !== "/api" && !path.startsWith("/api/")) || PUBLIC_AUTH_PATHS.has(path)) return;
  const publicPlayground = path === "/api/public/playground";
  if (publicPlayground) {
    if (!isGreenProxyConfigured()) {
      return Response.json({ detail: "Green Proxy authentication is not configured" }, { status: 503 });
    }
    if (isPlaygroundRateLimited(playgroundRateLimitKey(request)).limited) {
      return Response.json({ detail: "Rate limit exceeded. Try again in about 10 minutes." }, { status: 429 });
    }
    return checkGreenProxyControls(path, true);
  }

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

async function checkGreenProxyControls(path: string, publicPlayground?: boolean) {
  let controls: GreenProxyControls;
  try {
    ({ controls } = await getGreenProxyControls());
  } catch (error) {
    console.error("Green Proxy control state unavailable:", error);
    return Response.json({ detail: "Green Proxy control state is unavailable." }, { status: 503 });
  }

  if (!controls.systemEnabled) {
    return Response.json({ detail: "All AI operations are paused in Green Proxy." }, { status: 503 });
  }

  const disabled = publicPlayground
    ? (controls.aiEnabled ? undefined : "aiEnabled")
    : findDisabledControl(path, controls);
  if (disabled) {
    return Response.json({ detail: `This feature is turned off in Green Proxy: ${disabled}` }, { status: 503 });
  }
}

function findDisabledControl(path: string, controls: GreenProxyControls) {
  const required: Array<keyof GreenProxyControls> = [];
  if (path.startsWith("/api/agent/")) required.push("agentEnabled", "aiEnabled");
  if (path === "/api/preview" || path === "/api/playground") required.push("aiEnabled");
  if (path === "/api/execute") required.push("sandboxEnabled");
  if (path === "/api/support/chat") required.push("supportEnabled", "aiEnabled");
  return required.find((control) => !controls[control]) as keyof GreenProxyControls | undefined;
}
