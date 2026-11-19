function escapeAttribute(value: string) {
  return value.replace(/[&"<>]/g, (character) => ({
    "&": "&amp;",
    '"': "&quot;",
    "<": "&lt;",
    ">": "&gt;",
  })[character]!);
}

export default async () => {
  const consoleUrl = escapeAttribute(process.env.CONTROLLER_CONSOLE_URL ?? "");
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#ffffff">
    <title>Controller | Green Proxy</title>
    <link rel="stylesheet" href="/dashboard.css">
    <script src="/dashboard.js" defer></script>
  </head>
  <body data-console-url="${consoleUrl}">
    <main class="page">
      <section id="signin" class="signin" aria-labelledby="signin-title" hidden>
        <div class="brand-lockup">
          <span class="protected-label">PROTECTED BY</span>
          <div class="green-brand">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M16 2 28 7v8c0 8-5.3 13-12 16C9.3 28 4 23 4 15V7l12-5Z" fill="currentColor"/>
              <path d="m10 16 4 4 8-9" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/>
            </svg>
            <span>Green Proxy</span>
          </div>
        </div>
        <h1 id="signin-title">Sign in</h1>
        <p class="muted">Administrator access only.</p>
        <form id="signin-form">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required>
          <button class="button button-dark" type="submit">Continue</button>
          <p id="signin-error" class="feedback" role="status" aria-live="polite"></p>
        </form>
      </section>

      <section id="dashboard" hidden>
        <header class="topbar">
          <a class="controller-brand" href="/" aria-label="Controller admin">
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 5h28L16 29 2 5Z" fill="currentColor"/></svg>
            <span>Controller</span>
          </a>
          <div class="topbar-actions">
            <span class="admin-label">ADMIN CONTROL</span>
            <a id="open-console" class="button button-dark" hidden target="_blank" rel="noopener noreferrer">Open Console</a>
            <button id="logout" class="button button-light" type="button">Sign out</button>
          </div>
        </header>

        <section class="hero" aria-labelledby="hero-title">
          <div>
            <p class="eyebrow">GREEN PROXY · CONTROL PLANE</p>
            <h1 id="hero-title">Agent infrastructure,<br>under your control.</h1>
            <p class="hero-copy">Pause AI operations or turn individual capabilities on and off. The user console stays separate.</p>
          </div>
          <div class="hero-status">
            <span id="system-indicator" class="indicator"></span>
            <span id="system-label">Loading controls…</span>
          </div>
        </section>

        <section class="control-section" aria-labelledby="controls-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">ADMIN SETTINGS</p>
              <h2 id="controls-title">Service controls</h2>
            </div>
            <button id="refresh-controls" class="button button-light" type="button">Refresh</button>
          </div>
          <div id="control-error" class="notice" role="status" aria-live="polite" hidden></div>
          <div id="control-grid" class="control-grid"></div>
          <p id="control-store" class="control-store"></p>
        </section>

        <footer class="footer">
          <span id="service-status">Checking service health…</span>
          <span>Changes are enforced by the backend.</span>
        </footer>
      </section>
    </main>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    },
  );
};
