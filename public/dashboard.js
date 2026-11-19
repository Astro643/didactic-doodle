const signin = document.querySelector("#signin");
const dashboard = document.querySelector("#dashboard");
const signinForm = document.querySelector("#signin-form");
const signinError = document.querySelector("#signin-error");
const controlGrid = document.querySelector("#control-grid");
const controlError = document.querySelector("#control-error");
const controlsUrl = "/api/admin/controls";

const controls = [
  {
    key: "systemEnabled",
    title: "Global operations",
    description: "Master switch. When off, new AI and automation requests are blocked.",
    master: true,
  },
  {
    key: "aiEnabled",
    title: "AI requests",
    description: "Allow AxForge-powered planning, agent reasoning, and responses.",
  },
  {
    key: "agentEnabled",
    title: "Agent workflows",
    description: "Allow multi-turn agent runs and new agent requests.",
  },
  {
    key: "sandboxEnabled",
    title: "Sandbox execution",
    description: "Allow command plans and isolated web-search sandboxes.",
  },
  {
    key: "discordToolsEnabled",
    title: "Discord tools",
    description: "Allow the agent to read or change the configured Discord server.",
  },
  {
    key: "supportEnabled",
    title: "Support chat",
    description: "Allow the support chat endpoint to use the AI service.",
  },
];

let controlState = {};
let controlStore = "";

function showSignin(message = "") {
  dashboard.hidden = true;
  signin.hidden = false;
  signinError.textContent = message;
  signinError.classList.toggle("error", Boolean(message));
  document.querySelector("#password").focus();
}

function showDashboard() {
  signin.hidden = true;
  dashboard.hidden = false;
  loadControls();
  loadServiceStatus();
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== "/api/auth/login") {
    showSignin("Your session has ended. Sign in again.");
  }
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}

async function initialize() {
  try {
    const session = await request("/api/auth/session");
    if (session.authenticated) showDashboard();
    else showSignin();
  } catch (error) {
    showSignin(error.message);
  }
}

signinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = signinForm.querySelector("button");
  button.disabled = true;
  signinError.textContent = "";
  try {
    await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password: document.querySelector("#password").value }),
    });
    signinForm.reset();
    showDashboard();
  } catch (error) {
    showSignin(error.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#logout").addEventListener("click", async () => {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } finally {
    showSignin("You have signed out.");
  }
});

function showControlError(message = "") {
  controlError.textContent = message;
  controlError.hidden = !message;
}

function renderControls() {
  controlGrid.replaceChildren();
  for (const control of controls) {
    const card = document.createElement("article");
    card.className = `control-card${control.master ? " control-card-master" : ""}`;

    const copy = document.createElement("div");
    copy.className = "control-copy";
    const title = document.createElement("h3");
    title.textContent = control.title;
    const description = document.createElement("p");
    description.textContent = control.description;
    copy.append(title, description);

    const label = document.createElement("label");
    label.className = "switch";
    label.setAttribute("aria-label", `${control.title} ${controlState[control.key] ? "on" : "off"}`);
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(controlState[control.key]);
    input.addEventListener("change", () => updateControl(control.key, input));
    const track = document.createElement("span");
    track.className = "switch-track";
    label.append(input, track);

    const state = document.createElement("span");
    state.className = "control-state";
    state.textContent = input.checked ? "On" : "Off";
    input.addEventListener("change", () => {
      state.textContent = input.checked ? "On" : "Off";
      label.setAttribute("aria-label", `${control.title} ${input.checked ? "on" : "off"}`);
    });

    card.append(copy, label, state);
    controlGrid.append(card);
  }
}

async function loadControls() {
  showControlError();
  try {
    const result = await request(controlsUrl);
    controlState = result.controls;
    controlStore = result.store;
    renderControls();
    document.querySelector("#system-label").textContent = controlState.systemEnabled
      ? "All operations enabled"
      : "Global pause is on";
    document.querySelector("#system-indicator").classList.toggle("indicator-off", !controlState.systemEnabled);
    document.querySelector("#control-store").textContent = controlStore === "upstash"
      ? "Control state is shared across deployments."
      : "Local preview controls are temporary and reset when the server restarts.";
  } catch (error) {
    showControlError(error.message);
    document.querySelector("#system-label").textContent = "Control state unavailable";
    document.querySelector("#control-store").textContent = "";
  }
}

async function updateControl(key, input) {
  input.disabled = true;
  showControlError();
  try {
    const result = await request(controlsUrl, {
      method: "PATCH",
      body: JSON.stringify({ [key]: input.checked }),
    });
    controlState = result.controls;
    controlStore = result.store;
    renderControls();
    document.querySelector("#system-label").textContent = controlState.systemEnabled
      ? "All operations enabled"
      : "Global pause is on";
    document.querySelector("#system-indicator").classList.toggle("indicator-off", !controlState.systemEnabled);
    document.querySelector("#control-store").textContent = controlStore === "upstash"
      ? "Control state is shared across deployments."
      : "Local preview controls are temporary and reset when the server restarts.";
  } catch (error) {
    input.checked = !input.checked;
    input.disabled = false;
    showControlError(error.message);
  }
}

document.querySelector("#refresh-controls").addEventListener("click", loadControls);
window.setInterval(() => {
  if (!dashboard.hidden) {
    loadControls();
    loadServiceStatus();
  }
}, 15000);

const playgroundForm = document.querySelector("#playground-form");
const playgroundStatus = document.querySelector("#playground-status");
const playgroundResponse = document.querySelector("#playground-response");

playgroundForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.querySelector("#playground-submit");
  button.disabled = true;
  playgroundStatus.textContent = "Generating response…";
  playgroundResponse.hidden = true;
  try {
    // Determine endpoint and payload based on playground mode
    const playgroundUrl = document.body.dataset.playgroundUrl;
    const isAdminMode = document.body.dataset.playgroundMode === "admin";
    
    const payload = {
      prompt: document.querySelector("#playground-prompt").value,
    };
    
    if (isAdminMode) {
      const systemField = document.querySelector("#playground-system");
      if (systemField && systemField.value.trim()) {
        payload.system = systemField.value.trim();
      }
    }
    
    const result = await request(playgroundUrl, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    playgroundResponse.textContent = result.response;
    playgroundResponse.hidden = false;
    playgroundStatus.textContent = "Response ready";
  } catch (error) {
    playgroundStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

async function loadServiceStatus() {
  const output = document.querySelector("#service-status");
  try {
    const status = await request("/api/public/status");
    const components = status.components || [];
    const affected = components.filter((component) => component.status !== "operational").length;
    const details = affected ? `${affected} services affected` : `${components.length} services checked`;
    output.textContent = `${status.label || status.overall} · ${details}`;
  } catch (error) {
    output.textContent = error.message;
  }
}

const consoleUrl = document.body.dataset.consoleUrl;
if (consoleUrl) {
  try {
    const target = new URL(consoleUrl, window.location.origin);
    if (target.protocol === "https:" || target.origin === window.location.origin) {
      const link = document.querySelector("#open-console");
      link.href = target.href;
      link.hidden = false;
    }
  } catch {
    console.error("Invalid CONTROLLER_CONSOLE_URL; the Open Console link is hidden.");
  }
}

initialize();
