export function playgroundPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#ffffff">
    <title>AI Playground</title>
    <link rel="stylesheet" href="/dashboard.css">
    <script src="/dashboard.js" defer></script>
  </head>
  <body data-playground-mode="public" data-playground-url="/api/public/playground">
    <main class="page">
      <section id="dashboard">
        <header class="topbar">
          <a class="controller-brand" href="/" aria-label="Controller admin">
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 5h28L16 29 2 5Z" fill="currentColor"/></svg>
            <span>Controller</span>
          </a>
          <div class="topbar-actions">
            <span class="admin-label">PUBLIC PLAYGROUND</span>
            <a id="open-console" class="button button-dark" hidden target="_blank" rel="noopener noreferrer">Open Console</a>
            <button id="logout" class="button button-light" type="button">Sign out</button>
          </div>
        </header>

        <section class="hero" aria-labelledby="playground-hero-title">
          <div>
            <p class="eyebrow">AXFORGE · PUBLIC PREVIEW</p>
            <h1 id="playground-hero-title">Try the AI<br>playground.</h1>
            <p class="hero-copy">Send a prompt to the configured AxForge model. No account is required. Rate limits apply.</p>
          </div>
          <div class="hero-status">
            <span id="system-indicator" class="indicator"></span>
            <span id="system-label">Playground available</span>
          </div>
        </section>

        <section class="playground-section" aria-labelledby="playground-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">MODEL TESTING</p>
              <h2 id="playground-title">AI playground</h2>
            </div>
            <span class="playground-model">qwen3.8-flash-next</span>
          </div>
          <p class="playground-copy">Do not share passwords, API keys, or other secrets in your prompt.</p>
          <form id="playground-form">
            <label for="playground-prompt">Prompt</label>
            <textarea id="playground-prompt" name="prompt" rows="6" maxlength="4000" required placeholder="What would you like to try?"></textarea>
            <div class="playground-actions">
              <span id="playground-status" class="playground-status" role="status" aria-live="polite"></span>
              <button id="playground-submit" class="button button-dark" type="submit">Run prompt</button>
            </div>
          </form>
          <pre id="playground-response" class="playground-response" aria-label="Model response" hidden></pre>
        </section>

        <footer class="footer">
          <span>Anonymous requests are limited to five per 10 minutes.</span>
          <span>Administrator access</span>
        </footer>
      </section>
    </main>
  </body>
</html>`;
}
