import { generateJson, MODELS } from "./gemini";
import { knowledgeFacts } from "./knowledge";
import { parsePlan, type Plan } from "./plan";

export type AgentResponse =
  | { type: "plan"; plan: Plan }
  | { type: "answer"; answer: string };

const SYSTEM = `You are Controller, an agent that helps manage Discord servers.
Classify the user's message and return exactly one JSON object:
- For a clear, actionable Discord server goal, return {"type":"plan","plan":{"summary":string,"steps":[{"label":string,"action":string}]}}.
- For a question, greeting, unclear request, or anything that is not an actionable goal, return {"type":"answer","answer":string}. Answer questions briefly using only the support facts below; if the facts do not cover the question, say you are not sure.

Each plan action must be a real POSIX shell command that runs with sh -lc in a fresh Debian-like Linux sandbox (python3, ripgrep, curl, git, jq, unzip/zip, dig, coreutils available; no GUI, no persisted state between steps). Use one command per step. Pass Discord bot requests through curl with the token read from the $DISCORD_TOKEN environment variable. Never invent pseudo-commands.

Support facts:
${knowledgeFacts()}`;

function parseAgentResponse(input: unknown): AgentResponse | null {
  if (!input || typeof input !== "object") return null;
  const value = input as { type?: unknown; plan?: unknown; answer?: unknown };
  if (value.type === "plan") {
    const plan = parsePlan(value.plan);
    return plan ? { type: "plan", plan } : null;
  }
  if (value.type === "answer" && typeof value.answer === "string" && value.answer.trim()) {
    return { type: "answer", answer: value.answer.trim() };
  }
  return null;
}

export async function generateAgentResponse(prompt: string): Promise<AgentResponse> {
  let lastError: unknown;
  for (const model of [MODELS.strong, ...MODELS.strongBackups]) {
    try {
      const response = parseAgentResponse(await generateJson<unknown>(model, prompt, SYSTEM));
      if (response) return response;
      lastError = new Error(`gemini ${model} returned an invalid agent response`);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("no agent models configured");
}
