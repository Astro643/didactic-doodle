import { keyCount } from "./axforge";

const FACTS = [
  "Product: Controller — agentic automation protected by the Green Proxy administrator sign-in. The dashboard lets an authenticated operator preview and run tasks, inspect status, cancel a run, and use support chat.",
  "Agent flow: type a goal -> Preview (a summary and ordered tool steps) -> Run task (returns a request id) -> watch the status. The preview may instead ask one clarifying question if the goal is unclear.",
  "Request statuses and their exact meanings:",
  "- Processing: the plan is running right now.",
  "- Completed: every step finished. The result note shows what was done.",
  "- Failed: something went wrong; the note says what. Nothing is retried without the user's say-so — run it again from the Console.",
  "- Cancelled: the user stopped it.",
  "- Expired: the request waited too long and was retired.",
  "System status: the Green Proxy dashboard or GET /api/public/status. All backend API routes require a Green Proxy session or configured machine bearer key, except the sign-in/session/logout routes.",
  "Dashboard: visit the backend root URL to sign in and open the operations panel.",
  "HTTP API (all JSON): POST /api/preview {prompt}; POST /api/execute {prompt} or {prompt, plan}; POST /api/agent/preview {prompt}; POST /api/agent/execute {agent_plan}; GET /api/status/:id; POST /api/cancel/:id; GET /api/public/status; POST /api/support/chat {message, history}.",
  "Context: Controller is in a closed beta. It is not affiliated with Discord Inc.",
].join("\n");

const RULES =
  "You are Controller's support assistant. Answer clearly and briefly using ONLY the facts below. " +
  "If something is not covered by the facts or the live status, say you are not sure rather than inventing features.";

export function knowledgeSystem() {
  return `${RULES}\n\n## Facts\n${knowledgeFacts()}`;
}

export function knowledgeFacts() {
  const keys = keyCount();
  const status =
    keys > 0
      ? `Live status: All systems operational (${keys} AxForge API key configured).`
      : "Live status: DEGRADED — AXFORGE_API_KEY is not configured, so AI features may fail right now.";
  return `${FACTS}\n\n${status}`;
}
