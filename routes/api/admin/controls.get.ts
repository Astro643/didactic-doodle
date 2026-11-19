import { getGreenProxyControls } from "../../../lib/green-proxy-controls";

export default async () => {
  try {
    return Response.json(await getGreenProxyControls(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Green Proxy controls lookup failed:", error);
    return Response.json({ detail: "Could not load Green Proxy controls." }, { status: 503 });
  }
};
