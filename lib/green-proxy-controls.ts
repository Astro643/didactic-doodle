export const GREEN_PROXY_CONTROL_DEFAULTS = {
  systemEnabled: true,
  aiEnabled: true,
  agentEnabled: true,
  sandboxEnabled: true,
  discordToolsEnabled: true,
  supportEnabled: true,
} as const;

export type GreenProxyControl = keyof typeof GREEN_PROXY_CONTROL_DEFAULTS;
export type GreenProxyControls = Record<GreenProxyControl, boolean>;

const CONTROL_KEY = "controller:green-proxy:controls";
let localControls: GreenProxyControls = { ...GREEN_PROXY_CONTROL_DEFAULTS };

function localDevelopmentStore() {
  return process.env.VERCEL !== "1" && process.env.NODE_ENV !== "production";
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url: url.replace(/\/+$/, ""), token };
  if (localDevelopmentStore() && !url && !token) return null;
  throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured for Green Proxy controls");
}

async function redisCommand(command: string[]) {
  const config = redisConfig();
  if (!config) throw new Error("Redis control store is unavailable in this runtime");

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Green Proxy control store returned HTTP ${response.status}`);

  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload.error) throw new Error(`Green Proxy control store error: ${payload.error}`);
  return payload.result;
}

function parseControls(raw: unknown): GreenProxyControls {
  const controls: GreenProxyControls = { ...GREEN_PROXY_CONTROL_DEFAULTS };
  if (raw === null || raw === undefined) return controls;
  if (!Array.isArray(raw)) throw new Error("Green Proxy control data is invalid");

  for (let index = 0; index + 1 < raw.length; index += 2) {
    const key = raw[index];
    const value = raw[index + 1];
    if (typeof key !== "string" || !Object.hasOwn(GREEN_PROXY_CONTROL_DEFAULTS, key)) continue;
    if (value !== "true" && value !== "false") throw new Error(`Green Proxy control "${key}" is invalid`);
    controls[key as GreenProxyControl] = value === "true";
  }
  return controls;
}

export async function getGreenProxyControls(): Promise<{ controls: GreenProxyControls; store: "local" | "upstash" }> {
  const config = redisConfig();
  if (!config) return { controls: { ...localControls }, store: "local" };
  const result = await redisCommand(["HGETALL", CONTROL_KEY]);
  return { controls: parseControls(result), store: "upstash" };
}

export async function updateGreenProxyControls(updates: Partial<GreenProxyControls>) {
  const entries = Object.entries(updates) as [GreenProxyControl, boolean][];
  if (
    entries.length === 0 ||
    entries.some(([key, value]) => !Object.hasOwn(GREEN_PROXY_CONTROL_DEFAULTS, key) || typeof value !== "boolean")
  ) {
    throw new Error("At least one valid Green Proxy control must be provided");
  }

  const config = redisConfig();
  if (!config) {
    localControls = { ...localControls, ...updates };
    return { controls: { ...localControls }, store: "local" as const };
  }

  await redisCommand(["HSET", CONTROL_KEY, ...entries.flatMap(([key, value]) => [key, String(value)])]);
  const result = await redisCommand(["HGETALL", CONTROL_KEY]);
  return { controls: parseControls(result), store: "upstash" as const };
}

export async function requireGreenProxyControl(control: GreenProxyControl) {
  const { controls } = await getGreenProxyControls();
  if (!controls[control]) {
    throw new Error(`This feature is turned off in Green Proxy: ${control}`);
  }
}
