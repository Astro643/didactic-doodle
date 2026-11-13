import { generate, generateJson, MODELS } from "../../lib/gemini";
import { knowledgeSystem } from "../../lib/knowledge";
import type { Plan } from "../../lib/plan";

const ROUTER_SYSTEM =
  "You are Controller, an agent that manages Discord servers. " +
  "Decide whether the user's message is a question about how things work, or an actionable goal for their server. " +
  "Reply with JSON only: {\"intent\": \"question\"} or {\"intent\": \"goal\"}."

const PLAN_SYSTEM =
