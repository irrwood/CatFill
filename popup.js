// CatFill popup 逻辑：联系人管理 + 触发扫描/填充。
// 存储结构（chrome.storage.local）：
//   profiles: { [id]: { name, entries: [{ signals: {...}, value }] } }
//   activeProfileId

const $ = (id) => document.getElementById(id);
const i18n = globalThis.CatFillI18n;
let state = { profiles: {}, activeProfileId: null, settings: {} };

function setStatus(text, isErr = false) {
  const el = $("status");
  el.textContent = text;
  el.className = isErr ? "err" : "";
}

// ---------- 存储 ----------
async function load() {
  const data = await chrome.storage.local.get(["profiles", "activeProfileId", "settings"]);
  state.settings = data.settings || {};
  i18n.setLocale(state.settings.language);
  i18n.setTheme(state.settings.theme);
  i18n.applyDocument();
  state.profiles = data.profiles || {};
  state.activeProfileId = data.activeProfileId;
  if (!Object.keys(state.profiles).length) {
    const id = crypto.randomUUID();
    state.profiles[id] = { name: i18n.t("defaultProfile"), entries: [] };
    state.activeProfileId = id;
    await save();
  }
  if (!state.profiles[state.activeProfileId]) {
    state.activeProfileId = Object.keys(state.profiles)[0];
  }
  render();
}

async function save() {
  await chrome.storage.local.set({
    profiles: state.profiles,
    activeProfileId: state.activeProfileId,
  });
}

function activeProfile() {
  return state.profiles[state.activeProfileId];
}

// ---------- 渲染 ----------
function render() {
  const sel = $("profileSelect");
  sel.innerHTML = "";
  for (const [id, p] of Object.entries(state.profiles)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = p.name;
    opt.selected = id === state.activeProfileId;
    sel.appendChild(opt);
  }
}

// ---------- 与页面通信 ----------
async function withContentScript(action, payload = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error(i18n.t("tabNotFound"));
  const organizerFrames = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    files: ["fieldOrganizer.js"],
  });
  const contentFrames = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    files: ["content.js"],
  });
  const frameIds = [...new Set([...organizerFrames, ...contentFrames].map((item) => item.frameId))];
  if (!frameIds.length) throw new Error(i18n.t("inaccessiblePage"));

  const sendToFrame = async (frameId, message) => {
    try {
      const res = await chrome.tabs.sendMessage(tab.id, message, { frameId });
      return { frameId, res };
    } catch (e) {
      return { frameId, res: { ok: false, error: e.message } };
    }
  };

  if (action === "scan") {
    const results = await Promise.all(frameIds.map((frameId) => sendToFrame(frameId, { action })));
    const valid = results
      .filter((item) => item.res?.ok)
      .map((item) => ({ frameId: item.frameId, fields: item.res.fields || [], page: item.res.page }))
      .sort((a, b) => b.fields.length - a.fields.length);
    if (!valid.length) throw new Error(i18n.t("pageScriptFailed"));
    return { ok: true, fields: valid[0].fields, frameId: valid[0].frameId, page: valid[0].page };
  }

  if (action === "fill") {
    const results = await Promise.all(frameIds.map((frameId) => sendToFrame(frameId, { action, ...payload })));
    const okResults = results.filter((item) => item.res?.ok);
    if (!okResults.length) throw new Error(results.find((item) => item.res?.error)?.res.error || i18n.t("pageScriptFailed"));
    return {
      ok: true,
      filled: okResults.reduce((sum, item) => sum + (item.res.filled || 0), 0),
      total: okResults.reduce((sum, item) => sum + (item.res.total || 0), 0),
    };
  }

  const targetFrameId = payload.frameId ?? frameIds[0];
  const { res } = await sendToFrame(targetFrameId, { action, ...payload });
  if (!res?.ok) throw new Error(res?.error || i18n.t("pageScriptFailed"));
  return res;
}

// 用信号去重：同一个字段再次扫描时更新值而不是重复添加
function signalKey(signals) {
  return ["autocomplete", "name", "id", "question", "label", "placeholder", "ariaLabel"]
    .map((k) => (signals[k] || "").toLowerCase().trim())
    .join("|");
}

function entryKey(entry) {
  const signals = signalKey(entry.signals || {});
  if (signals.replace(/\|/g, "")) return `signals:${signals}`;
  return `entry:${[entry.category, entry.canonicalKey, entry.value]
    .map((part) => String(part || "").toLowerCase().trim())
    .join("|")}`;
}

function entryFromField(field) {
  return {
    ...(field.type ? { type: field.type } : {}),
    signals: field.signals,
    value: field.value,
    ...(field.choice ? { choice: field.choice } : {}),
    ...(field.options ? { options: field.options } : {}),
    ...(field.file ? { file: field.file } : {}),
  };
}

async function processLearnedEntries(entries) {
  const { settings = {} } = await chrome.storage.local.get("settings");
  if (!settings.aiLearnEnabled || !entries.length) return { entries, usedAi: false };

  setStatus(i18n.t("scanCompleteOrganizing"));
  const res = await chrome.runtime.sendMessage({
    action: "aiOrganizeEntries",
    entries,
  });
  if (!res?.ok) throw new Error(res?.error || i18n.t("aiOrganizeFailed"));
  return { entries: res.entries || entries, usedAi: true };
}

function mergeEntries(targetEntries, incomingEntries) {
  let added = 0;
  let updated = 0;
  for (const entry of incomingEntries) {
    if (!entry.value || entry.value === "false") continue;
    const key = entryKey(entry);
    const existing = targetEntries.find((item) => entryKey(item) === key);
    if (existing) {
      Object.assign(existing, {
        ...entry,
        signals: { ...(existing.signals || {}), ...(entry.signals || {}) },
      });
      updated++;
    } else {
      targetEntries.push(entry);
      added++;
    }
  }
  return { added, updated };
}

// ---------- 按钮 ----------
$("scanBtn").onclick = async () => {
  try {
    setStatus(i18n.t("scanning"));
    const { fields } = await withContentScript("scan");
    const scannedEntries = fields
      .filter((field) => field.value && field.value !== "false")
      .map(entryFromField);
    const result = await processLearnedEntries(scannedEntries);
    const { added, updated } = mergeEntries(activeProfile().entries, result.entries);
    await save();
    render();
    const mode = result.usedAi ? i18n.t("aiOrganizedPrefix") : "";
    setStatus(i18n.t("scanResult", { mode, fields: fields.length, added, updated }));
  } catch (e) {
    setStatus(e.message, true);
  }
};

$("fillBtn").onclick = async () => {
  try {
    setStatus(i18n.t("filling"));
    const { filled, total } = await withContentScript("fill", {
      entries: activeProfile().entries,
    });
    setStatus(i18n.t("fillResult", { filled, total }));
  } catch (e) {
    setStatus(e.message, true);
  }
};

$("aiFillBtn").onclick = async () => {
  try {
    setStatus(i18n.t("aiAnalyzing"));
    const { fields, frameId, page } = await withContentScript("scan");
    const res = await chrome.runtime.sendMessage({
      action: "aiMap",
      fields,
      entries: activeProfile().entries,
      page,
    });
    if (!res?.ok) throw new Error(res?.error || i18n.t("aiRequestFailed"));
    const { filled } = await withContentScript("applyAssignments", {
      assignments: res.assignments,
      frameId,
    });
    setStatus(filled ? i18n.t("aiFillVerified", { filled }) : i18n.t("aiFillNone"));
  } catch (e) {
    setStatus(e.message, true);
  }
};

const SIDE_PANEL_TARGET_KEY = "sidePanelTargetTab";

async function openSidePanel(targetTab = "organizerPanel") {
  try {
    await chrome.storage.local.set({ [SIDE_PANEL_TARGET_KEY]: targetTab });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.windowId) throw new Error(i18n.t("windowNotFound"));
    await chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  } catch (e) {
    await chrome.storage.local.remove(SIDE_PANEL_TARGET_KEY).catch(() => {});
    setStatus(e.message, true);
  }
}

$("openSidePanelBtn").onclick = () => openSidePanel("organizerPanel");
$("settingsBtn").onclick = () => openSidePanel("settingsPanel");

// ---------- 联系人管理 ----------
$("profileSelect").onchange = async (e) => {
  state.activeProfileId = e.target.value;
  await save();
  render();
};

$("addProfileBtn").onclick = async () => {
  const name = prompt(i18n.t("newProfileName"));
  if (!name) return;
  const id = crypto.randomUUID();
  state.profiles[id] = { name, entries: [] };
  state.activeProfileId = id;
  await save();
  render();
};

$("renameProfileBtn").onclick = async () => {
  const name = prompt(i18n.t("renameProfileName"), activeProfile().name);
  if (!name) return;
  activeProfile().name = name;
  await save();
  render();
};

$("deleteProfileBtn").onclick = async () => {
  if (Object.keys(state.profiles).length <= 1) {
    setStatus(i18n.t("retainOneProfile"), true);
    return;
  }
  if (!confirm(i18n.t("deleteProfileConfirm", { name: activeProfile().name }))) return;
  delete state.profiles[state.activeProfileId];
  state.activeProfileId = Object.keys(state.profiles)[0];
  await save();
  render();
};

load();
