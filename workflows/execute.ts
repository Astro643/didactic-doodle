import { Sandbox } from "@vercel/sandbox";
import type { Plan } from "../lib/plan";
import { MAX_ACTION } from "../lib/plan";

export interface StepResult {
  label: string
  ok: boolean
  detail: string
}

const clip = (s: string) => s.slice(0, MAX_ACTION).trim();

export async function executePlan(plan: Plan): Promise<StepResult[]> {
  "use workflow";
  return await run(plan);
}

async function run(plan: Plan): Promise<StepResult[]> {
  "use step";
  const results: StepResult[] = [];
  let sandbox: Sandbox | null = null;
  try {
    const sbx = process.env.SANDBOX_SNAPSHOT_ID
      ? await Sandbox.create({
          source: { type: "snapshot", snapshotId: process.env.SANDBOX_SNAPSHOT_ID },
          persistent: false,
        })
      : await Sandbox.create({ persistent: false });
    sandbox = sbx;
    for (const step of plan.steps) {
      try {
        const cmd = await sbx.runCommand("sh", ["-lc", step.action], { timeoutMs: 60_000 });
        const out = clip(`${await cmd.stdout()}\n${await cmd.stderr()}`);
        results.push({ label: step.label, ok: cmd.exitCode === 0, detail: out });
      } catch (e) {
        results.push({ label: step.label, ok: false, detail: clip(String((e as Error)?.message ?? e)) });
      }
    }
  } catch (e) {
    const detail = clip(String((e as Error)?.message ?? e));
    for (const step of plan.steps.slice(results.length)) {
      results.push({ label: step.label, ok: false, detail });
    }
  } finally {
    if (sandbox) await sandbox.stop().catch(() => {});
  }
  return results;
}
