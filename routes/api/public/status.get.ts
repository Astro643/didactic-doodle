import { keyCount } from "../../../lib/gemini";

export default async () => {
  const keys = keyCount();
  const ok = keys > 0;
  return Response.json({
    overall: ok ? "operational" : "degraded",
    label: ok ? "All systems operational" : "AI keys missing",
    updated: new Date().toISOString(),
    components: [
      { name: "Agent", detail: "Workflows + Sandbox", status: ok ? "operational" : "degraded" },
      { name: "AI", detail: ok ? `${keys} Gemini key(s) loaded` : "No Gemini keys configured", status: ok ? "operational" : "degraded" },
    ],
  });
};
