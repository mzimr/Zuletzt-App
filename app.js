/* ---------------------------------------------------------
   Zuletzt — eigenständige PWA, keine Build-Tools nötig.
   Datenmodell: tasks[] und completions[] in localStorage.
--------------------------------------------------------- */

const STORAGE_KEY = "zuletzt:data";
const ALL = "Alle";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: [], completions: [] };
    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      completions: Array.isArray(parsed.completions) ? parsed.completions : [],
    };
  } catch {
    return { tasks: [], completions: [] };
  }
}

function saveData(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: state.tasks, completions: state.completions }));
  } catch {}
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function getTimeAgo(iso) {
  if (!iso) return null;
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  const diffW = Math.floor(diffD / 7);
  const diffM = Math.floor(diffD / 30);
  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffH < 24) return `vor ${diffH} Std.`;
  if (diffD === 1) return "vor 1 Tag";
  if (diffD < 7) return `vor ${diffD} Tagen`;
  if (diffW === 1) return "vor 1 Woche";
  if (diffW < 5) return `vor ${diffW} Wochen`;
  if (diffM === 1) return "vor 1 Monat";
  return `vor ${diffM} Monaten`;
}

function formatExact(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function getStatus(lastIso, intervalDays) {
  if (!lastIso) return "gray";
  const daysSince = (Date.now() - new Date(lastIso).getTime()) / 86400000;
  if (intervalDays) {
    const ratio = daysSince / intervalDays;
    if (ratio < 0.6) return "green";
    if (ratio < 0.9) return "amber";
    return "red";
  }
  if (daysSince < 7) return "green";
  if (daysSince < 30) return "amber";
  return "red";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ----------------------------- State ----------------------------- */

const state = loadData();
let tab = "tasks";
let filter = ALL;
let openHistoryId = null;
let justCompletedId = null;
let dialogOpen = false;
let editTaskId = null;

function persist() {
  saveData(state);
}

function getCompletionsFor(taskId) {
  return state.completions.filter((c) => c.task_id === taskId);
}

function getLastCompletedAt(taskId) {
  const logs = getCompletionsFor(taskId);
  if (logs.length === 0) return null;
  return logs.reduce((latest, c) => (c.completed_at > latest ? c.completed_at : latest), logs[0].completed_at);
}

function sortedTasks() {
  return [...state.tasks].sort((a, b) => {
    const aLast = getLastCompletedAt(a.id);
    const bLast = getLastCompletedAt(b.id);
    if (!aLast && !bLast) return 0;
    if (!aLast) return -1;
    if (!bLast) return 1;
    return new Date(aLast) - new Date(bLast);
  });
}

function categories() {
  return [ALL, ...new Set(state.tasks.map((t) => t.category || "Sonstiges"))];
}

/* ----------------------------- Actions ----------------------------- */

function completeTask(taskId) {
  state.completions.push({ id: uid(), task_id: taskId, completed_at: new Date().toISOString() });
  persist();
  justCompletedId = taskId;
  render();
  setTimeout(() => {
    justCompletedId = null;
    render();
  }, 1200);
}

function saveTask(data) {
  if (editTaskId) {
    state.tasks = state.tasks.map((t) => (t.id === editTaskId ? { ...t, ...data } : t));
  } else {
    state.tasks.push({ id: uid(), ...data, created_at: new Date().toISOString() });
  }
  persist();
  closeDialog();
  render();
}

function deleteTask(taskId) {
  if (!confirm("Diese Aufgabe wirklich löschen?")) return;
  state.tasks = state.tasks.filter((t) => t.id !== taskId);
  state.completions = state.completions.filter((c) => c.task_id !== taskId);
  persist();
  render();
}

function clearAll() {
  if (!confirm("Wirklich ALLES löschen? Das kann nicht rückgängig gemacht werden.")) return;
  state.tasks = [];
  state.completions = [];
  persist();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ tasks: state.tasks, completions: state.completions }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "zuletzt-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data.tasks) && Array.isArray(data.completions)) {
        state.tasks = data.tasks;
        state.completions = data.completions;
        persist();
        render();
      }
    } catch {}
  };
  reader.readAsText(file);
}

function openDialog(taskId) {
  editTaskId = taskId || null;
  dialogOpen = true;
  render();
}

function closeDialog() {
  dialogOpen = false;
  editTaskId = null;
  render();
}

/* ----------------------------- Rendering ----------------------------- */

const ICONS = {
  plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  chevDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
  chevUp: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>',
  edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>',
  list: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  download: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  upload: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
};

function renderTaskCard(task) {
  const completions = getCompletionsFor(task.id).sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
  const last = completions[0]?.completed_at;
  const status = getStatus(last, task.interval_days);
  const timeAgo = getTimeAgo(last);
  const isOpen = openHistoryId === task.id;
  const justDone = justCompletedId === task.id;

  const metaLine = task.interval_days
    ? `alle ${task.interval_days} Tage`
    : escapeHtml(task.category || "Sonstiges");

  const historyRows = completions.length === 0
    ? `<div class="history-empty">Noch kein Verlauf</div>`
    : completions.slice(0, 10).map((c) => `
        <div class="history-row">
          <span class="hdot"></span>
          <span class="when">${getTimeAgo(c.completed_at)}</span>
          <span class="exact">${formatExact(c.completed_at)}</span>
        </div>
      `).join("");

  return `
    <div class="task-card s-${status}" data-task-id="${task.id}">
      <button class="task-main" data-action="complete" data-id="${task.id}">
        <div class="avatar">
          ${task.emoji ? `<span class="avatar-emoji">${task.emoji}</span>` : `<div class="dot"></div>`}
        </div>
        <div class="task-info">
          <div class="task-name">${escapeHtml(task.title)}</div>
          <div class="task-ago">${timeAgo || "Noch nie erledigt"}</div>
          <div class="task-meta">${metaLine}</div>
        </div>
        ${justDone ? `<div class="check-burst">${ICONS.check}</div>` : ""}
      </button>
      <div class="task-actions">
        <button class="btn-history" data-action="toggle-history" data-id="${task.id}">
          ${isOpen ? ICONS.chevUp : ICONS.chevDown} Verlauf (${completions.length})
        </button>
        <button class="btn-icon" data-action="edit" data-id="${task.id}">${ICONS.edit}</button>
        <button class="btn-icon danger" data-action="delete" data-id="${task.id}">${ICONS.trash}</button>
      </div>
      ${isOpen ? `<div class="history">${historyRows}</div>` : ""}
    </div>
  `;
}

function renderTasksTab() {
  const cats = categories();
  const list = sortedTasks().filter((t) => filter === ALL || (t.category || "Sonstiges") === filter);

  return `
    <div class="header">
      <div class="header-inner">
        <h1 class="app-title">Zuletzt</h1>
        <p class="app-subtitle">Wann hast du was zuletzt gemacht?</p>
      </div>
      ${cats.length > 2 ? `
        <div class="pills">
          ${cats.map((c) => `<button class="pill ${filter === c ? "active" : ""}" data-action="filter" data-cat="${escapeHtml(c)}">${c === ALL ? "" : categoryEmoji(c) + " "}${escapeHtml(c)}</button>`).join("")}
        </div>
      ` : ""}
    </div>
    <div class="content">
      ${state.tasks.length === 0 ? `
        <div class="empty">
          <div>Noch nichts hier. Füge etwas hinzu, das du im Blick behalten willst.</div>
          <button class="btn-primary" style="width:auto; display:inline-flex;" data-action="open-add">${ICONS.plus} Erste Aufgabe</button>
        </div>
      ` : `<div class="task-list">${list.map(renderTaskCard).join("")}</div>`}
    </div>
    ${state.tasks.length > 0 ? `<button class="fab" data-action="open-add">${ICONS.plus}</button>` : ""}
  `;
}

function renderSettingsTab() {
  return `
    <div class="settings-page">
      <h2>Einstellungen</h2>
      <div class="settings-card">
        <div class="title">Daten</div>
        <div class="desc">Alles bleibt lokal auf deinem Gerät gespeichert. Hier kannst du ein Backup sichern oder wiederherstellen.</div>
        <div class="row-gap">
          <button class="btn-secondary" data-action="export">${ICONS.download} Exportieren</button>
          <label class="btn-secondary">
            ${ICONS.upload} Importieren
            <input type="file" accept="application/json" id="import-input" style="display:none;" />
          </label>
        </div>
      </div>
      <div class="settings-card">
        <div class="title" style="color:#B91C1C;">Gefahrenzone</div>
        <div class="desc">Löscht alle Aufgaben und den Verlauf unwiderruflich.</div>
        <button class="btn-secondary btn-danger-outline" data-action="clear-all">Alles löschen</button>
      </div>
    </div>
  `;
}

const QUICK_EMOJIS = ["🪴","🧺","🧹","🪥","🧴","💊","🐶","🚿","🛁","🧽","🚗","💇","🦷","🛏️","🗑️","📚","💪","🧘","☕","🌿"];

const CATEGORY_EMOJI_MAP = [
  [/haushalt|putzen|reinig/i, "🧹"],
  [/gesundheit|arzt|zahn/i, "💊"],
  [/pflanze|garten/i, "🪴"],
  [/tier|hund|katze/i, "🐶"],
  [/auto|fahrzeug/i, "🚗"],
  [/sport|fitness/i, "💪"],
  [/sonstig/i, "📌"],
];

function categoryEmoji(cat) {
  const found = CATEGORY_EMOJI_MAP.find(([re]) => re.test(cat));
  return found ? found[1] : "🏷️";
}

function renderDialog() {
  if (!dialogOpen) return "";
  const task = editTaskId ? state.tasks.find((t) => t.id === editTaskId) : null;
  const currentEmoji = task?.emoji || "";
  return `
    <div class="overlay" data-action="close-dialog">
      <div class="dialog" onclick="event.stopPropagation()">
        <div class="dialog-head">
          <h2>${task ? "Aufgabe bearbeiten" : "Neue Aufgabe"}</h2>
          <button data-action="close-dialog">${ICONS.x}</button>
        </div>

        <label class="field-label">Symbol (optional)</label>
        <div class="emoji-row">
          <input class="field-input emoji-input" id="f-emoji" maxlength="4" placeholder="🪴" value="${escapeHtml(currentEmoji)}" />
        </div>
        <div class="emoji-picker">
          ${QUICK_EMOJIS.map((e) => `<button type="button" class="emoji-chip" data-action="pick-emoji" data-emoji="${e}">${e}</button>`).join("")}
        </div>

        <label class="field-label">Was möchtest du tracken?</label>
        <input class="field-input" id="f-title" placeholder="z. B. Pflanzen gegossen" value="${task ? escapeHtml(task.title) : ""}" />
        <label class="field-label">Kategorie (optional)</label>
        <input class="field-input" id="f-category" placeholder="z. B. Haushalt" value="${task ? escapeHtml(task.category || "") : ""}" />
        <label class="field-label">Intervall in Tagen (optional)</label>
        <input class="field-input" id="f-interval" type="number" min="1" placeholder="z. B. 7 — färbt die Karte je nach Fälligkeit ein" value="${task && task.interval_days ? task.interval_days : ""}" />
        <button class="btn-primary" data-action="save-task">${task ? "Speichern" : "Hinzufügen"}</button>
      </div>
    </div>
  `;
}

function renderNav() {
  return `
    <div class="bottom-nav">
      <button class="nav-item ${tab === "tasks" ? "active" : ""}" data-action="nav" data-tab="tasks">
        ${ICONS.list}<span>Aufgaben</span>
      </button>
      <button class="nav-item ${tab === "settings" ? "active" : ""}" data-action="nav" data-tab="settings">
        ${ICONS.settings}<span>Einstellungen</span>
      </button>
    </div>
  `;
}

function render() {
  const root = document.getElementById("app");
  root.innerHTML = `
    ${tab === "tasks" ? renderTasksTab() : renderSettingsTab()}
    ${renderNav()}
    ${renderDialog()}
  `;
  bindEvents();
}

function bindEvents() {
  const root = document.getElementById("app");

  root.querySelectorAll("[data-action]").forEach((el) => {
    const action = el.dataset.action;
    if (action === "complete") {
      el.addEventListener("click", () => completeTask(el.dataset.id));
    } else if (action === "toggle-history") {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        openHistoryId = openHistoryId === el.dataset.id ? null : el.dataset.id;
        render();
      });
    } else if (action === "edit") {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        openDialog(el.dataset.id);
      });
    } else if (action === "delete") {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTask(el.dataset.id);
      });
    } else if (action === "filter") {
      el.addEventListener("click", () => {
        filter = el.dataset.cat;
        render();
      });
    } else if (action === "open-add") {
      el.addEventListener("click", () => openDialog(null));
    } else if (action === "close-dialog") {
      el.addEventListener("click", () => closeDialog());
    } else if (action === "save-task") {
      el.addEventListener("click", () => {
        const title = document.getElementById("f-title").value.trim();
        if (!title) return;
        const category = document.getElementById("f-category").value.trim();
        const emoji = document.getElementById("f-emoji").value.trim();
        const intervalRaw = document.getElementById("f-interval").value;
        const interval = parseInt(intervalRaw, 10);
        saveTask({
          title,
          category: category || "Sonstiges",
          emoji: emoji || null,
          interval_days: Number.isFinite(interval) && interval > 0 ? interval : null,
        });
      });
    } else if (action === "pick-emoji") {
      el.addEventListener("click", () => {
        document.getElementById("f-emoji").value = el.dataset.emoji;
      });
    } else if (action === "nav") {
      el.addEventListener("click", () => {
        tab = el.dataset.tab;
        render();
      });
    } else if (action === "export") {
      el.addEventListener("click", exportData);
    } else if (action === "clear-all") {
      el.addEventListener("click", clearAll);
    }
  });

  const importInput = document.getElementById("import-input");
  if (importInput) {
    importInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) importData(file);
      e.target.value = "";
    });
  }
}

render();
