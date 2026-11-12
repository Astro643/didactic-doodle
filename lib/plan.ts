export interface PlannedStep {
  label: string
  action: string
}

export interface Plan {
  summary: string
  steps: PlannedStep[]
}

export const MAX_STEPS = 10
export const MAX_ACTION = 2000

export function parsePlan(input: unknown): Plan | null {
  if (!input || typeof input !== "object") return null
  const { summary, steps } = input as { summary?: unknown, steps?: unknown }
  if (typeof summary !== "string" || !summary.trim()) return null
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > MAX_STEPS) return null
  const clean: PlannedStep[] = []
  for (const step of steps) {
    if (!step || typeof step !== "object") return null
    const { label, action } = step as { label?: unknown, action?: unknown }
    if (typeof label !== "string" || !label.trim()) return null
    if (typeof action !== "string" || !action.trim() || action.length > MAX_ACTION) return null
    clean.push({ label: label.trim(), action })
  }
  return { summary: summary.trim(), steps: clean }
}
