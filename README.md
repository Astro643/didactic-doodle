# Controller backend

Minimal Discord-server-agent backend. No database, no Redis, no queues, no containers.

- **Framework:** Nitro v3 with the `workflow/nitro` module (compiles the `use workflow` / `use step` directives)
- **Orchestration:** [Vercel Workflows](https://vercel.com/docs/workflow-durable-execution) — the workflow run *is* the database
- **Execution:** one throwaway [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) per run (`persistent: false`)
- **AI:** The legacy preview/execute routes use a single structured Gemini request. The multi-turn agent routes combine Sandbox tools with scoped Discord tools, pause for approval on high-impact actions, and continue from tool results. Gemini uses raw `fetch` with a hand-rolled key pool and in-memory cooldowns.

## Layout

```
routes/api/
  preview.post.ts        POST /api/preview        prompt -> plan or answer (sync, Gemini)
  execute.post.ts        POST /api/execute        prompt|plan -> {command_id, status}
  agent/
    preview.post.ts      POST /api/agent/preview  prompt -> tool plan or answer
    execute.post.ts      POST /api/agent/execute  tool plan -> {command_id, status}
    approve/[id].post.ts POST /api/agent/approve/:id  approve/reject pending action
  status/[id].get.ts     GET  /api/status/:id     run status + result
  cancel/[id].post.ts    POST /api/cancel/:id     cancel a run
  public/status.get.ts   GET  /api/public/status  status widget feed
  support/chat.post.ts   POST /api/support/chat   support chat
workflows/
  agent.ts               bounded multi-turn tool loop with approval hooks
  execute.ts             one workflow, one step, one sandbox per run
lib/
  agent-auth.ts         bearer-key protection for multi-turn agent routes
  agent-tools.ts         bounded Sandbox and Discord tool registry
  agent.ts               structured responses and multi-turn model calls
  gemini.ts              key pool + raw fetch, in-memory cooldowns
  knowledge.ts           support facts and live key status
  plan.ts                plan types + server-side validation
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEYS` (or `GEMINI_API_KEY`, `GEMINI_API_KEY_1..4`) | yes | comma-separated Gemini keys, rotated with cooldowns |
| `MODEL_STRONG` | no | primary plan-or-answer model (default: `gemini-4-hydrogen`) |
| `MODEL_STRONG_BACKUP1` / `MODEL_STRONG_BACKUP2` | no | fallback models (defaults: `gemini-3.5-flash-lite`, `gemini-decision-1`) |
| `MODEL_SUPPORT` | no | support-chat model (default: `gemini-3.5-flash-lite`) |
| `AGENT_API_KEY` | yes, for multi-turn agent routes | bearer key protecting agent preview, execution, and approval |
| `DISCORD_TOKEN` | no | bot token used only by server-side Discord tools |
| `DISCORD_GUILD_ID` | no | Discord server ID that all agent Discord tools are restricted to |
| `SANDBOX_SNAPSHOT_ID` | no | optional Vercel Sandbox snapshot used as the starting environment |

The multi-turn flow is `POST /api/agent/preview` -> `POST /api/agent/execute` -> poll `GET /api/status/:id`. Include `Authorization: Bearer $AGENT_API_KEY` on agent requests; status also requires it to reveal a pending approval token. Submit the approval token and decision to `POST /api/agent/approve/:id` with `{ "approval_token": "...", "approved": true }` (or `false` to reject). Sandbox web search is restricted to DuckDuckGo and does not receive the Discord token.

## Deploy

1. Import the repo into Vercel. The `nitro` dependency enables the Nitro framework preset automatically; if not, set Framework Preset to **Nitro**.
2. In Project Settings → Functions, tick **Enable access to System Environment Variables** (Workflows needs `VERCEL_DEPLOYMENT_ID`).
3. Add the environment variables above.
4. Remove the old integrations from the previous project: Neon, Upstash, Inngest, Queues — none are used.

## Local dev

```sh
npm install
npm run dev
```
