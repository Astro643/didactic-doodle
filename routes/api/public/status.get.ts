import { keyCount } from "../../../lib/axforge";
import { getGreenProxyControls, type GreenProxyControls } from "../../../lib/green-proxy-controls";

export default async () => {
  const keys = keyCount();
  let controls: GreenProxyControls;
  try {
    ({ controls } = await getGreenProxyControls());
  } catch (error) {
    console.error("public status control lookup failed:", error);
    return Response.json({ detail: "System status is unavailable." }, { status: 503 });
  }

  const allEnabled = Object.values(controls).every(Boolean);
  const ok = keys > 0 && allEnabled;
  return Response.json({
    overall: ok ? "operational" : "degraded",
    label: !controls.systemEnabled
      ? "All AI operations paused"
      : ok
        ? "All systems operational"
        : !allEnabled
          ? "Some services are paused"
          : "AxForge API key missing",
    updated: new Date().toISOString(),
    components: [
      {
        name: "Agent",
        detail: !controls.agentEnabled
          ? "Agent workflows disabled"
          : keys > 0
            ? "Workflows available"
            : "AI key required",
        status: controls.agentEnabled && controls.aiEnabled && controls.systemEnabled && keys > 0 ? "operational" : "paused",
      },
      {
        name: "AI",
        detail: !controls.aiEnabled
          ? "AI requests disabled"
          : keys > 0
            ? "AxForge API key configured"
            : "No AxForge API key configured",
        status: controls.aiEnabled && keys > 0 && controls.systemEnabled ? "operational" : "paused",
      },
      {
        name: "Sandbox",
        detail: controls.sandboxEnabled ? "Execution available" : "Sandbox execution disabled",
        status: controls.sandboxEnabled && controls.systemEnabled ? "operational" : "paused",
      },
      {
        name: "Discord",
        detail: controls.discordToolsEnabled ? "Tools available" : "Discord tools disabled",
        status: controls.discordToolsEnabled && controls.systemEnabled ? "operational" : "paused",
      },
      {
        name: "Support",
        detail: controls.supportEnabled ? "Support chat available" : "Support chat disabled",
        status: controls.supportEnabled && controls.systemEnabled ? "operational" : "paused",
      },
    ],
  });
};
