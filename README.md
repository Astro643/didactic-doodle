# Controller backend

Minimal Discord-server-agent backend. No database, no Redis, no queues, no containers.

- **Framework:** Nitro v3 with the `workflow/nitro` module (compiles the `use workflow` / `use step` directives)
- **Orchestration:** [Vercel Workflows](https://vercel.com/docs/workflow-durable-execution) — the workflow run *is* the database
- **Execution:** one throwaway [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) per run (`persistent: false`)
- **AI:** Preview and execute use one structured Gemini request to return either a support answer or a plan; plan-or-answer responses fall back through the configured strong-model chain. Gemini uses raw `fetch` with a hand-rolled key pool and in-memory cooldowns.

## Layout

```
routes/api/
  preview.post.ts        POST /api/preview        prompt -> plan or answer (sync, Gemini)
  execute.post.ts        POST /api/execute        prompt|plan -> {command_id, status}
  status/[id].get.ts     GET  /api/status/:id     run status + result
  cancel/[id].post.ts    POST /api/cancel/:id     cancel a run
  public/status.get.ts   GET  /api/public/status  status widget feed
  support/chat.post.ts   POST /api/support/chat   support chat
workflows/
  execute.ts             one workflow, one step, one sandbox per run
lib/
  agent.ts               one-call structured response + model fallback chain
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
