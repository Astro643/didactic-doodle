# Controller backend

Discord-server-agent backend with a Green Proxy admin control plane. It uses no application database or queues; a small Upstash Redis record stores shared admin switches so Vercel instances enforce the same control state.

- **Framework:** Nitro v3 with the `workflow/nitro` module (compiles the `use workflow` / `use step` directives)
- **Orchestration:** [Vercel Workflows](https://vercel.com/docs/workflow-durable-execution) — the workflow run *is* the database
- **Admin controls:** Upstash Redis REST stores the global pause and AI, agent, Sandbox, Discord, and support switches
- **Execution:** one throwaway [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) per run (`persistent: false`)
- **AI:** The legacy preview/execute routes use a single structured AxForge request. The multi-turn agent routes combine Sandbox tools with scoped Discord tools and execute requested actions immediately, including high-impact actions, then continue from tool results. AxForge uses its OpenAI-compatible chat-completions API.

## Layout

```
routes/api/
  index.get.ts          GET  /api                    API name, health, and route list
  auth/
    login.post.ts       POST /api/auth/login       create a Green Proxy session
    logout.post.ts      POST /api/auth/logout      clear the session
    session.get.ts      GET  /api/auth/session     check sign-in state
  admin/
    controls.get.ts     GET  /api/admin/controls   read admin switches
    controls.patch.ts   PATCH /api/admin/controls  update admin switches
  preview.post.ts        POST /api/preview        prompt -> plan or answer (sync, AxForge)
  playground.post.ts    POST /api/playground     prompt -> AxForge response (admin-only)
  execute.post.ts        POST /api/execute        prompt|plan -> {command_id, status}
  agent/
    preview.post.ts      POST /api/agent/preview  prompt -> tool plan or answer
    execute.post.ts      POST /api/agent/execute  tool plan -> {command_id, status}
  status/[id].get.ts     GET  /api/status/:id     run status + result
  cancel/[id].post.ts    POST /api/cancel/:id     cancel a run
  public/status.get.ts   GET  /api/public/status  status widget feed
  support/chat.post.ts   POST /api/support/chat   support chat
middleware/
  green-proxy-auth.ts    require authentication for API routes
public/
  dashboard.css         monochrome admin panel and sign-in styles
  dashboard.js          Green Proxy control panel
routes/index.get.ts     GET /                       Green Proxy sign-in/dashboard
workflows/
  agent.ts               bounded multi-turn tool loop
  execute.ts             one workflow, one step, one sandbox per run
lib/
  green-proxy-auth.ts  signed session cookie and bearer-key validation
  agent-tools.ts         bounded Sandbox and Discord tool registry
  agent.ts               structured responses and multi-turn model calls
  axforge.ts             single API key + OpenAI-compatible chat completions
  knowledge.ts           support facts and live key status
  plan.ts                plan types + server-side validation
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AXFORGE_API_KEY` | yes | single AxForge API key, sent as a Bearer token |
| `GREEN_PROXY_PASSWORD` | yes | administrator password for the sign-in page (use at least 16 characters) |
| `GREEN_PROXY_SESSION_SECRET` | yes | random secret of at least 32 characters used to sign 12-hour sessions |
| `UPSTASH_REDIS_REST_URL` | yes in production | Upstash Redis REST URL for shared control state |
| `UPSTASH_REDIS_REST_TOKEN` | yes in production | private Upstash Redis REST token; never expose it to the browser |
| `AGENT_API_KEY` | no | optional bearer key for machine-to-machine agent preview, execution, status, and cancel calls |
| `CONTROLLER_CONSOLE_URL` | no | frontend Console URL shown as a separate link in the admin panel |
| `DISCORD_TOKEN` | no | bot token used only by server-side Discord tools |
| `DISCORD_GUILD_ID` | no | Discord server ID that all agent Discord tools are restricted to |
| `SANDBOX_SNAPSHOT_ID` | no | optional Vercel Sandbox snapshot used as the starting environment |

Visiting the backend root opens the Green Proxy admin sign-in page. After signing in, admins can pause all operations or independently switch AI requests, agent workflows, Sandbox execution, Discord tools, and support chat. These controls are enforced by the API middleware and active workflows, not just hidden in the UI. In local development, controls use temporary in-memory state; production requires Upstash Redis REST credentials so all Vercel instances share the same state. The user-facing Console stays separate and can be linked with `CONTROLLER_CONSOLE_URL`.

All `/api` endpoints require a valid Green Proxy session, except the sign-in/session/logout endpoints. A configured `AGENT_API_KEY` is accepted only for multi-turn agent preview, execution, and their status/cancel routes. Requested Discord actions execute immediately without a separate approval step. Sandbox web search is restricted to DuckDuckGo and does not receive the Discord token.

The admin dashboard includes an AI playground for testing prompts and optional system instructions against the configured AxForge model. Requests use the server-side API key and are blocked when AI operations are disabled.

AI requests use the `qwen3.8-flash-next` model at `https://api.axforge.ai/v1/chat/completions`.

## Deploy

1. Import the repo into Vercel. The `nitro` dependency enables the Nitro framework preset automatically; if not, set Framework Preset to **Nitro**.
2. In Project Settings → Functions, tick **Enable access to System Environment Variables** (Workflows needs `VERCEL_DEPLOYMENT_ID`).
3. Add the environment variables above.
4. Create an Upstash Redis database and set its REST URL and token for shared Green Proxy controls. Remove unused legacy integrations such as Neon, Inngest, and Queues.

## Local dev

```sh
npm install
npm run dev
```
