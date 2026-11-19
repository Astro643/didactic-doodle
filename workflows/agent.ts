import { getWritable } from "workflow";
import { requireGreenProxyControl } from "../lib/green-proxy-controls";
import {
  generateAgentTurn,
  MAX_AGENT_TURNS,
  type AgentMessage,
  type AgentPlan,
  type AgentTurn,
} from "../lib/agent";
import {
  executeAgentTool,
  type AgentToolCall,
  type AgentToolResult,
} from "../lib/agent-tools";

export interface AgentActionResult {
  label: string;
  tool: string;
  ok: boolean;
  output: string;
}

export interface AgentRunResult {
  summary: string;
  answer: string;
  actions: AgentActionResult[];
}

type AgentProgressEvent = { status: "processing"; label: string; tool: string };

export async function executeAgent(plan: AgentPlan): Promise<AgentRunResult> {
  "use workflow";
  const messages: AgentMessage[] = [
    {
      role: "user",
      content: JSON.stringify({
        goal: plan.prompt,
        preview_summary: plan.summary,
        preview_steps: plan.steps,
      }),
    },
  ];
  const actions: AgentActionResult[] = [];
  let nextCall: AgentToolCall | null = plan.steps[0] ?? null;
  await publishAgentProgressStep({ status: "processing", label: "Starting agent", tool: "agent" });

  for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
    let response: AgentTurn;
    if (nextCall) {
      response = { type: "tool", call: nextCall };
      nextCall = null;
    } else {
      response = await generateAgentTurnStep(messages);
    }
    if (response.type === "final") {
      return { summary: plan.summary, answer: response.answer, actions };
    }

    const call = response.call;
    messages.push({ role: "assistant", content: JSON.stringify({ tool_call: call }) });
    await publishAgentProgressStep({ status: "processing", label: call.label, tool: call.tool });

    const result = await executeAgentToolStep(call);
    messages.push({ role: "tool", content: JSON.stringify(result) });
    actions.push({ label: call.label, tool: call.tool, ...result });
  }

  return {
    summary: plan.summary,
    answer: `Stopped after reaching the ${MAX_AGENT_TURNS}-tool limit. Review the completed actions before continuing.`,
    actions,
  };
}

async function generateAgentTurnStep(messages: AgentMessage[]): Promise<AgentTurn> {
  "use step";
  await requireGreenProxyControl("systemEnabled");
  await requireGreenProxyControl("agentEnabled");
  await requireGreenProxyControl("aiEnabled");
  return generateAgentTurn(messages);
}

async function executeAgentToolStep(call: AgentToolCall): Promise<AgentToolResult> {
  "use step";
  return executeAgentTool(call);
}

async function publishAgentProgressStep(event: AgentProgressEvent): Promise<void> {
  "use step";
  const writer = getWritable<Uint8Array>({ namespace: "agent" }).getWriter();
  try {
    await writer.write(new TextEncoder().encode(JSON.stringify(event)));
  } finally {
    writer.releaseLock();
  }
}
