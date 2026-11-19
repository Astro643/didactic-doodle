import { randomUUID } from "node:crypto";
import { createHook, getWorkflowMetadata, getWritable } from "workflow";
import {
  generateAgentTurn,
  MAX_AGENT_TURNS,
  type AgentMessage,
  type AgentPlan,
  type AgentTurn,
} from "../lib/agent";
import {
  executeAgentTool,
  isHighImpactTool,
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

type AgentProgressEvent =
  | {
      status: "awaiting_approval";
      approval_token: string;
      label: string;
      tool: string;
      arguments: Record<string, unknown>;
    }
  | { status: "processing"; label: string; tool: string };

interface ApprovalDecision {
  approved: boolean;
}

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
    if (isHighImpactTool(call.tool)) {
      const approvalToken = await createApprovalTokenStep();
      const runId = getWorkflowMetadata().workflowRunId;
      const approval = createHook<ApprovalDecision>({
        token: approvalToken,
        metadata: { runId, label: call.label, tool: call.tool },
      });
      if (await approval.getConflict()) throw new Error("Approval token is already in use");
      await publishAgentProgressStep({
        status: "awaiting_approval",
        approval_token: approvalToken,
        label: call.label,
        tool: call.tool,
        arguments: call.arguments,
      });
      let decision: ApprovalDecision;
      try {
        decision = await approval;
      } finally {
        approval.dispose();
      }
      await publishAgentProgressStep({ status: "processing", label: call.label, tool: call.tool });
      if (!decision.approved) {
        const rejected = { ok: false, output: "The user did not approve this action." };
        messages.push({ role: "tool", content: JSON.stringify(rejected) });
        actions.push({ label: call.label, tool: call.tool, ...rejected });
        continue;
      }
    } else {
      await publishAgentProgressStep({ status: "processing", label: call.label, tool: call.tool });
    }

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
  return generateAgentTurn(messages);
}

async function executeAgentToolStep(call: AgentToolCall): Promise<AgentToolResult> {
  "use step";
  return executeAgentTool(call);
}

async function createApprovalTokenStep(): Promise<string> {
  "use step";
  return randomUUID();
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
