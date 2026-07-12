const $ = (id) => document.getElementById(id);
const organizer = globalThis.CatFillFieldOrganizer;
const i18n = globalThis.CatFillI18n;
const SIDE_PANEL_TARGET_KEY = "sidePanelTargetTab";
const SIDE_PANEL_TABS = new Set(["organizerPanel", "manualPanel", "settingsPanel"]);

let state = {
  profiles: {},
  activeProfileId: null,
  settings: {},
  pendingEntries: null,
  editingIndex: null,
  documentFile: null,
};
let statusTimer = null;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const MAX_DOCUMENT_CHARS = 45000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
let pdfjsPromise = null;
let sheetjsPromise = null;

const AI_PROVIDERS = {
  anthropic: {
    name: "Anthropic Claude",
    keyLabel: "Anthropic API Key",
    keyPlaceholder: "sk-ant-...",
    keyUrl: "https://platform.claude.com/settings/keys",
    defaultModel: "claude-opus-4-8",
    models: ["claude-opus-4-8", "claude-sonnet-4-5", "claude-haiku-4-5"],
    hint: { zh: "从 platform.claude.com 获取 API Key。", en: "Get an API key from platform.claude.com." },
  },
  deepseek: {
    name: "DeepSeek",
    keyLabel: "DeepSeek API Key",
    keyPlaceholder: "sk-...",
    keyUrl: "https://platform.deepseek.com/api_keys",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    hint: { zh: "使用 DeepSeek 官方 OpenAI 兼容接口。", en: "Uses DeepSeek's official OpenAI-compatible API." },
  },
  openai: {
    name: "OpenAI",
    keyLabel: "OpenAI API Key",
    keyPlaceholder: "sk-proj-...",
    keyUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    hint: { zh: "使用 OpenAI Chat Completions API。", en: "Uses the OpenAI Chat Completions API." },
  },
  gemini: {
    name: "Google Gemini",
    keyLabel: "Gemini API Key",
    keyPlaceholder: "AIza...",
    keyUrl: "https://aistudio.google.com/app/apikey",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"],
    hint: { zh: "从 Google AI Studio 获取 API Key。", en: "Get an API key from Google AI Studio." },
  },
  openrouter: {
    name: "OpenRouter",
    keyLabel: "OpenRouter API Key",
    keyPlaceholder: "sk-or-...",
    keyUrl: "https://openrouter.ai/settings/keys",
    defaultModel: "openai/gpt-4o-mini",
    models: ["openai/gpt-4o-mini", "anthropic/claude-sonnet-4", "google/gemini-2.5-flash"],
    hint: { zh: "通过 OpenRouter 调用多家模型。", en: "Use OpenRouter to access multiple models." },
  },
  groq: {
    name: "Groq",
    keyLabel: "Groq API Key",
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b"],
    hint: { zh: "使用 Groq OpenAI 兼容接口。", en: "Uses Groq's OpenAI-compatible API." },
  },
  mistral: {
    name: "Mistral AI",
    keyLabel: "Mistral API Key",
    keyPlaceholder: "...",
    keyUrl: "https://console.mistral.ai/api-keys/",
    defaultModel: "mistral-large-latest",
    models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
    hint: { zh: "使用 Mistral Chat Completions API。", en: "Uses the Mistral Chat Completions API." },
  },
};

function setStatus(text, type = "", autoClearMs = 0) {
  const el = $("status");
  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
  el.textContent = text;
  el.className = `status ${type}`.trim();
  if (autoClearMs) {
    statusTimer = setTimeout(() => {
      el.textContent = "";
      el.className = "status";
      statusTimer = null;
    }, autoClearMs);
  }
}

function activeProfile() {
  return state.profiles[state.activeProfileId];
}

async function load() {
  const data = await chrome.storage.local.get(["profiles", "activeProfileId", "settings", SIDE_PANEL_TARGET_KEY]);
  i18n.setLocale(data.settings?.language);
  i18n.setTheme(data.settings?.theme);
  state.profiles = data.profiles || {};
  state.activeProfileId = data.activeProfileId || Object.keys(state.profiles)[0] || null;
  state.settings = normalizeSettings(data.settings || {});
  i18n.applyDocument();
  state.pendingEntries = null;
  state.editingIndex = null;
  renderProfileSelect();
  initProviderSelect();
  initManualCategorySelect();
  renderSettings();
  renderSuggestion();
  renderGroups();
  switchTab(SIDE_PANEL_TABS.has(data[SIDE_PANEL_TARGET_KEY]) ? data[SIDE_PANEL_TARGET_KEY] : "organizerPanel");
  if (data[SIDE_PANEL_TARGET_KEY]) await chrome.storage.local.remove(SIDE_PANEL_TARGET_KEY);
}

async function saveProfiles() {
  await chrome.storage.local.set({
    profiles: state.profiles,
    activeProfileId: state.activeProfileId,
  });
}

function renderProfileSelect() {
  const sel = $("profileSelect");
  sel.innerHTML = "";
  for (const [id, profile] of Object.entries(state.profiles)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = profile.name;
    opt.selected = id === state.activeProfileId;
    sel.appendChild(opt);
  }
}

function normalizeSettings(settings) {
  const provider = settings.provider || "anthropic";
  return {
    provider,
    language: settings.language || i18n.locale,
    theme: settings.theme || i18n.theme,
    aiLearnEnabled: Boolean(settings.aiLearnEnabled),
    aiInstruction: settings.aiInstruction || "",
    apiKeys: { ...(settings.apiKeys || {}), ...(settings.apiKey ? { [provider]: settings.apiKey } : {}) },
    models: { ...(settings.models || {}), ...(settings.model ? { [provider]: settings.model } : {}) },
  };
}

function initProviderSelect() {
  const sel = $("provider");
  sel.innerHTML = "";
  for (const [id, provider] of Object.entries(AI_PROVIDERS)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = provider.name;
    sel.appendChild(opt);
  }
}

function initManualCategorySelect() {
  const sel = $("newCategory");
  sel.innerHTML = "";
  organizer.CATEGORY_ORDER.forEach((category) => {
    const opt = document.createElement("option");
    opt.value = category;
    opt.textContent = i18n.category(category);
    sel.appendChild(opt);
  });
  sel.value = "其他";
}

function renderSettings() {
  const providerId = state.settings.provider || "anthropic";
  const provider = AI_PROVIDERS[providerId] || AI_PROVIDERS.anthropic;
  $("provider").value = providerId;
  $("apiKeyLabel").textContent = provider.keyLabel;
  $("apiKey").placeholder = provider.keyPlaceholder;
  $("apiKey").value = state.settings.apiKeys?.[providerId] || "";
  $("model").placeholder = provider.defaultModel;
  $("model").value = state.settings.models?.[providerId] || provider.defaultModel;
  $("aiLearnEnabled").checked = Boolean(state.settings.aiLearnEnabled);
  $("aiInstruction").value = state.settings.aiInstruction || "";
  $("language").value = state.settings.language;
  $("theme").value = state.settings.theme;
  const hasApiKey = Boolean(state.settings.apiKeys?.[providerId]?.trim());
  $("aiSetupGuide").classList.toggle("hidden", hasApiKey);
  $("setupProviderStep").textContent = i18n.t("setupProviderStep", { provider: provider.name });
  $("getApiKeyLink").href = provider.keyUrl;
  $("providerHint").textContent = i18n.t("apiKeyLocal", { provider: provider.name, hint: provider.hint[i18n.locale] || provider.hint.zh });

  const list = $("modelOptions");
  list.innerHTML = "";
  provider.models.forEach((model) => {
    const opt = document.createElement("option");
    opt.value = model;
    list.appendChild(opt);
  });
}

function rememberVisibleSettings() {
  const provider = state.settings.provider || "anthropic";
  state.settings.apiKeys[provider] = $("apiKey").value.trim();
  state.settings.models[provider] = $("model").value.trim();
  state.settings.aiLearnEnabled = $("aiLearnEnabled").checked;
  state.settings.aiInstruction = $("aiInstruction").value.trim();
}

function switchTab(panelId) {
  document.querySelectorAll(".tabButton").forEach((button) => {
    const active = button.dataset.tab === panelId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".tabPanel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== panelId);
  });
}

function renderSuggestion() {
  const section = $("suggestionSection");
  if (!state.pendingEntries) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  $("suggestionSummary").textContent = i18n.t("suggestionSummary", {
    before: activeProfile().entries.length,
    after: state.pendingEntries.length,
  });
}

function renderGroups() {
  const box = $("groups");
  box.innerHTML = "";
  const profile = activeProfile();
  if (!profile) {
    box.append(empty(i18n.t("noProfile")));
    return;
  }

  const sourceEntries = currentEntries();
  if (!sourceEntries.length) {
    box.append(empty(i18n.t("noEntries")));
    return;
  }

  const groups = organizer.groupOrganizedEntries(sourceEntries);
  for (const group of groups) {
    const groupEl = document.createElement("section");
    groupEl.className = "group";

    const header = document.createElement("div");
    header.className = "groupHeader";
    const title = document.createElement("h2");
    title.textContent = i18n.category(group.category);
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = i18n.t("itemCount", { count: group.entries.length });
    header.append(title, count);

    const entriesCard = document.createElement("div");
    entriesCard.className = "groupEntries";
    group.entries.forEach((entry) => entriesCard.appendChild(entryNode(entry, sourceEntries.indexOf(entry))));
    groupEl.append(header, entriesCard);
    box.appendChild(groupEl);
  }
}

function currentEntries() {
  const profile = activeProfile();
  if (!profile) return [];
  return state.pendingEntries || organizer.organizeEntries(profile.entries || [], { language: i18n.locale });
}

function entryNode(entry, index) {
  const row = document.createElement("article");
  const editing = state.editingIndex === index;
  row.className = `entry${editing ? " editing" : ""}`;

  const displayKey = organizer.entryDisplayKey(entry);
  const form = document.createElement("form");
  form.className = "entryFields";

  const valueInput = document.createElement("input");
  valueInput.name = "value";
  valueInput.id = `entry-value-${index}`;
  valueInput.value = entry.file ? fileDisplay(entry.file) : (entry.choice?.text || entry.value || "");
  valueInput.readOnly = !editing || Boolean(entry.file);
  valueInput.setAttribute("aria-label", i18n.t("enterValue"));
  valueInput.placeholder = i18n.t("enterValue");
  if (entry.file) valueInput.title = i18n.t("fileCannotRestore");

  if (editing) {
    const keyInput = document.createElement("input");
    keyInput.name = "canonicalKey";
    keyInput.value = displayKey;
    keyInput.setAttribute("aria-label", i18n.t("fieldName"));
    keyInput.placeholder = i18n.t("fieldName");
    form.appendChild(keyInput);
  } else {
    const keyLabel = document.createElement("label");
    keyLabel.className = "entryKeyLabel";
    keyLabel.htmlFor = valueInput.id;
    keyLabel.textContent = displayKey;
    form.appendChild(keyLabel);
  }
  form.appendChild(valueInput);

  if (editing) {
    const details = document.createElement("div");
    details.className = "entryEditDetails";
    const categoryField = document.createElement("label");
    categoryField.textContent = i18n.t("category");
    const categorySelect = document.createElement("select");
    categorySelect.name = "category";
    organizer.CATEGORY_ORDER.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = i18n.category(category);
      categorySelect.appendChild(option);
    });
    categorySelect.value = entry.category || "其他";
    categoryField.appendChild(categorySelect);

    const aliasesField = document.createElement("label");
    aliasesField.textContent = i18n.t("alias");
    const aliasesInput = document.createElement("textarea");
    aliasesInput.name = "aliases";
    aliasesInput.rows = 2;
    aliasesInput.value = (entry.aliases || []).join(", ");
    aliasesField.appendChild(aliasesInput);
    details.append(categoryField, aliasesField);
    form.appendChild(details);
  }

  form.onsubmit = async (event) => {
    event.preventDefault();
    await updateEntry(index, {
      category: form.elements.category?.value || entry.category,
      canonicalKey: form.elements.canonicalKey.value,
      value: form.elements.value.value,
      aliasesText: form.elements.aliases?.value,
    });
  };

  const originalQuestion = originalQuestionTag(entry, displayKey);
  if (editing && originalQuestion) {
    const questionTag = document.createElement("span");
    questionTag.className = "questionTag";
    questionTag.textContent = originalQuestion;
    questionTag.title = originalQuestion;
    form.appendChild(questionTag);
  }

  const actions = document.createElement("div");
  actions.className = "entryActions";

  if (editing) {
    const save = iconButton(i18n.t("saveEdit"), iconCheck(), "saveButton");
    save.type = "button";
    save.onclick = () => form.requestSubmit();
    const cancel = iconButton(i18n.t("cancel"), iconClose());
    cancel.type = "button";
    cancel.onclick = () => {
      state.editingIndex = null;
      renderGroups();
    };
    actions.append(save, cancel);
  } else {
    const edit = iconButton(i18n.t("edit"), iconPencil());
    edit.type = "button";
    edit.onclick = () => {
      state.editingIndex = index;
      renderGroups();
    };
    actions.appendChild(edit);
  }

  const del = document.createElement("button");
  del.className = "iconButton danger";
  del.title = i18n.t("delete");
  del.setAttribute("aria-label", i18n.t("delete"));
  del.appendChild(iconTrash());
  del.onclick = async () => deleteEntry(index);
  actions.appendChild(del);

  row.appendChild(form);
  row.appendChild(actions);
  return row;
}

function originalQuestionTag(entry, displayKey) {
  const question = String(entry?.signals?.question || "").trim();
  if (!question || question === displayKey) return "";
  if (/^(question|field|input|answer|response|item|option)[_-]?[a-f0-9\d]{4,}$/i.test(question)) return "";
  if (["on", "off", "true", "false", "yes", "no"].includes(question.toLowerCase())) return "";
  return question;
}

function iconTrash() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  [
    "M3 6h18",
    "M8 6V4h8v2",
    "M6 6l1 15h10l1-15",
    "M10 11v6",
    "M14 11v6",
  ].forEach((d) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  });
  return svg;
}

function iconPencil() {
  return iconPaths(["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"]);
}

function iconCheck() {
  return iconPaths(["M20 6 9 17l-5-5"]);
}

function iconClose() {
  return iconPaths(["M6 6l12 12", "M18 6 6 18"]);
}

function iconPaths(paths) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  paths.forEach((d) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  });
  return svg;
}

function iconButton(label, icon, className = "") {
  const button = document.createElement("button");
  button.className = `iconButton ${className}`.trim();
  button.title = label;
  button.setAttribute("aria-label", label);
  button.appendChild(icon);
  return button;
}

function fileDisplay(file) {
  const size = file.size ? ` · ${formatBytes(file.size)}` : "";
  return `${file.name || i18n.t("selectedFile")}${size}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function updateEntry(index, patch) {
  const entries = currentEntries();
  const updated = organizer.updateEntryAt(entries, index, patch);
  await replaceCurrentEntries(updated);
  state.editingIndex = null;
  setStatus(i18n.t("fieldUpdated"), "ok");
}

async function deleteEntry(index) {
  const entries = currentEntries();
  const updated = organizer.deleteEntryAt(entries, index);
  await replaceCurrentEntries(updated);
  state.editingIndex = null;
  setStatus(i18n.t("fieldDeleted"), "ok");
}

async function replaceCurrentEntries(entries) {
  if (state.pendingEntries) {
    state.pendingEntries = entries;
  } else {
    activeProfile().entries = entries;
    await saveProfiles();
  }
  renderSuggestion();
  renderGroups();
}

async function addManualEntry(event) {
  event.preventDefault();
  const profile = activeProfile();
  if (!profile) {
    setStatus(i18n.t("createProfileFirst"), "err");
    return;
  }

  const key = $("newKey").value.trim();
  const value = $("newValue").value.trim();
  const aliases = $("newAliases").value
    .split(/[,，]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
  if (!key || !value) {
    setStatus(i18n.t("keyAndValueRequired"), "err");
    return;
  }

  profile.entries = profile.entries || [];
  profile.entries.push({
    category: $("newCategory").value || "其他",
    canonicalKey: key,
    aliases: [...new Set([key, ...aliases])],
    signals: { autocomplete: "", name: "", id: "", placeholder: "", label: key, ariaLabel: "" },
    value,
  });

  state.pendingEntries = null;
  state.editingIndex = null;
  await saveProfiles();
  $("addEntryForm").reset();
  $("manualAdvanced").open = false;
  $("newCategory").value = "其他";
  renderSuggestion();
  renderGroups();
  switchTab("organizerPanel");
  setStatus(i18n.t("fieldAdded"), "ok");
}

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(chrome.runtime.getURL("vendor/pdfjs/pdf.mjs")).then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdfjs/pdf.worker.mjs");
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

async function loadSheetJs() {
  if (!sheetjsPromise) {
    sheetjsPromise = import(chrome.runtime.getURL("vendor/sheetjs/xlsx.mjs"));
  }
  return sheetjsPromise;
}

function compactDocumentText(text) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_DOCUMENT_CHARS);
}

async function extractPdfText(file) {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useWorkerFetch: false,
    cMapUrl: chrome.runtime.getURL("vendor/pdfjs/cmaps/"),
    cMapPacked: true,
  });
  const pdf = await loadingTask.promise;
  const parts = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => `${item.str || ""}${item.hasEOL ? "\n" : " "}`)
        .join("");
      parts.push(pageText);
      if (parts.join("").length >= MAX_DOCUMENT_CHARS) break;
    }
  } finally {
    await pdf.destroy();
  }
  return compactDocumentText(parts.join("\n"));
}

function isSpreadsheetFile(file) {
  return /\.(xlsx|xls|xlsm|xlsb|csv)$/i.test(file.name || "");
}

function imageMimeType(file) {
  if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp") return file.type;
  const extension = (file.name || "").split(".").pop()?.toLowerCase();
  return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[extension] || "";
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  for (let index = 0; index < bytes.length; index += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)));
  }
  return btoa(chunks.join(""));
}

async function prepareVisionImage(file) {
  const mimeType = imageMimeType(file);
  if (!mimeType) throw new Error(i18n.t("imageFormats"));
  if (file.size > MAX_IMAGE_BYTES) throw new Error(i18n.t("imageTooLarge"));
  return { mimeType, data: arrayBufferToBase64(await file.arrayBuffer()) };
}

async function extractSpreadsheetText(file) {
  const XLSX = await loadSheetJs();
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
  const lines = [];
  let length = 0;

  for (const sheetName of workbook.SheetNames.slice(0, 12)) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });
    if (!rows.length) continue;
    const heading = i18n.t("worksheet", { name: sheetName });
    lines.push(heading);
    length += heading.length + 1;
    for (const row of rows.slice(0, 300)) {
      const line = row
        .map((cell) => String(cell ?? "").replace(/[\t\r\n]+/g, " ").trim())
        .join("\t")
        .trim();
      if (!line) continue;
      lines.push(line);
      length += line.length + 1;
      if (length >= MAX_DOCUMENT_CHARS) return compactDocumentText(lines.join("\n"));
    }
  }
  return compactDocumentText(lines.join("\n"));
}

async function extractDocumentText(file) {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) return extractPdfText(file);
  if (isSpreadsheetFile(file)) return extractSpreadsheetText(file);
  if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
    return compactDocumentText(await file.text());
  }
  throw new Error(i18n.t("documentFormats"));
}

async function analyzeDocument() {
  const file = state.documentFile || $("documentFile").files?.[0];
  if (!file) throw new Error(i18n.t("selectDocumentFirst"));
  const image = imageMimeType(file) ? await prepareVisionImage(file) : null;
  if (!image && file.size > MAX_DOCUMENT_BYTES) throw new Error(i18n.t("documentTooLarge"));

  const text = image ? "" : await extractDocumentText(file);
  if (!image && text.length < 20) {
    throw new Error(i18n.t("noDocumentText"));
  }

  const res = await chrome.runtime.sendMessage({
    action: "aiExtractDocument",
    fileName: file.name,
    text,
    ...(image ? { image } : {}),
  });
  if (!res?.ok) throw new Error(res?.error || i18n.t("analyzeFailed"));

  const profile = activeProfile();
  if (!profile) throw new Error(i18n.t("createProfileFirst"));
  state.pendingEntries = organizer.organizeEntries([...currentEntries(), ...(res.entries || [])], { language: i18n.locale });
  state.editingIndex = null;
  renderSuggestion();
  renderGroups();
  setDocumentFile(null);
  $("documentFile").value = "";
  switchTab("organizerPanel");
}

function empty(text) {
  const el = document.createElement("div");
  el.className = "empty";
  el.textContent = text;
  return el;
}

$("profileSelect").onchange = async (event) => {
  state.activeProfileId = event.target.value;
  state.pendingEntries = null;
  state.editingIndex = null;
  await saveProfiles();
  renderSuggestion();
  renderGroups();
};

$("addEntryForm").onsubmit = addManualEntry;

function switchAddMode(panelId) {
  const validPanelIds = new Set(["manualEntryMode", "documentEntryMode"]);
  const targetPanelId = validPanelIds.has(panelId) ? panelId : "manualEntryMode";
  document.querySelectorAll(".addModeButton").forEach((button) => {
    const active = button.dataset.addMode === targetPanelId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".addModePanel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== targetPanelId);
  });
}

function setDocumentFile(file) {
  state.documentFile = file || null;
  const zone = $("documentDropzone");
  zone.classList.toggle("hasFile", Boolean(file));
  $("documentFileName").textContent = file ? file.name : "";
  $("analyzeDocumentBtn").disabled = !file;
}

$("documentFile").onchange = () => setDocumentFile($("documentFile").files?.[0]);

$("documentDropzone").ondragover = (event) => {
  event.preventDefault();
  $("documentDropzone").classList.add("dragOver");
};

$("documentDropzone").ondragleave = (event) => {
  if (!$("documentDropzone").contains(event.relatedTarget)) {
    $("documentDropzone").classList.remove("dragOver");
  }
};

$("documentDropzone").ondrop = (event) => {
  event.preventDefault();
  $("documentDropzone").classList.remove("dragOver");
  setDocumentFile(event.dataTransfer?.files?.[0]);
};

$("documentDropzone").onkeydown = (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    $("documentFile").click();
  }
};

$("analyzeDocumentBtn").onclick = async () => {
  const button = $("analyzeDocumentBtn");
  try {
    button.classList.remove("done");
    button.classList.add("loading");
    button.disabled = true;
    setStatus("");
    await analyzeDocument();
    button.classList.remove("loading");
    button.classList.add("done");
    setTimeout(() => button.classList.remove("done"), 800);
  } catch (e) {
    button.classList.remove("loading", "done");
    setStatus(e.message || i18n.t("analyzeFailed"), "err");
  } finally {
    button.disabled = !state.documentFile;
  }
};

document.querySelectorAll(".addModeButton").forEach((button) => {
  button.onclick = () => switchAddMode(button.dataset.addMode);
});

document.querySelectorAll(".tabButton").forEach((button) => {
  button.onclick = () => switchTab(button.dataset.tab);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  const targetTab = changes[SIDE_PANEL_TARGET_KEY]?.newValue;
  if (areaName !== "local" || !SIDE_PANEL_TABS.has(targetTab)) return;
  switchTab(targetTab);
  chrome.storage.local.remove(SIDE_PANEL_TARGET_KEY).catch(() => {});
});

  $("provider").onchange = () => {
  rememberVisibleSettings();
  state.settings.provider = $("provider").value;
  renderSettings();
};

$("language").onchange = async () => {
  rememberVisibleSettings();
  state.settings.language = $("language").value;
  i18n.setLocale(state.settings.language);
  i18n.applyDocument();
  initManualCategorySelect();
  renderSettings();
  renderSuggestion();
  renderGroups();
  await chrome.storage.local.set({ settings: state.settings });
};

$("theme").onchange = async () => {
  rememberVisibleSettings();
  state.settings.theme = $("theme").value;
  i18n.setTheme(state.settings.theme);
  await chrome.storage.local.set({ settings: state.settings });
};

$("startApiSetupBtn").onclick = () => {
  $("apiKey").scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => $("apiKey").focus(), 220);
};

$("saveSettingsBtn").onclick = async () => {
  const provider = $("provider").value;
  state.settings.provider = provider;
  state.settings.apiKeys[provider] = $("apiKey").value.trim();
  state.settings.models[provider] = $("model").value.trim() || AI_PROVIDERS[provider].defaultModel;
  state.settings.aiLearnEnabled = $("aiLearnEnabled").checked;
  state.settings.aiInstruction = $("aiInstruction").value.trim();
  state.settings.language = $("language").value;
  state.settings.theme = $("theme").value;
  await chrome.storage.local.set({ settings: state.settings });
  renderSettings();
  setStatus(i18n.t("settingsSaved"), "ok");
};

$("refreshBtn").onclick = async () => {
  const button = $("refreshBtn");
  button.classList.remove("done");
  button.classList.add("refreshing");
  button.disabled = true;
  try {
    await load();
    button.classList.remove("refreshing");
    button.classList.add("done");
    setStatus("");
    setTimeout(() => button.classList.remove("done"), 800);
  } catch (e) {
    button.classList.remove("refreshing", "done");
    setStatus(e.message || i18n.t("refreshFailed"), "err");
  } finally {
    button.disabled = false;
  }
};

$("organizeBtn").onclick = async () => {
  const button = $("organizeBtn");
  try {
    const profile = activeProfile();
    if (!profile || !profile.entries?.length) {
      setStatus(i18n.t("noEntriesToOrganize"), "err");
      return;
    }
    button.classList.remove("done");
    button.classList.add("loading");
    button.disabled = true;
    setStatus("");
    const res = await chrome.runtime.sendMessage({
      action: "aiOrganizeEntries",
      entries: profile.entries,
    });
    if (!res?.ok) throw new Error(res?.error || i18n.t("organizeFailed"));
    button.classList.remove("loading");
    button.classList.add("done");
    state.pendingEntries = organizer.organizeEntries(res.entries || [], { language: i18n.locale });
    state.editingIndex = null;
    renderSuggestion();
    renderGroups();
    switchTab("organizerPanel");
    setStatus("");
    setTimeout(() => button.classList.remove("done"), 800);
  } catch (e) {
    button.classList.remove("loading", "done");
    setStatus(e.message, "err");
  } finally {
    button.disabled = false;
  }
};

$("applySuggestionBtn").onclick = async () => {
  if (!state.pendingEntries || !activeProfile()) return;
  activeProfile().entries = state.pendingEntries;
  state.pendingEntries = null;
  state.editingIndex = null;
  await saveProfiles();
  renderSuggestion();
  renderGroups();
  setStatus("");
};

$("discardSuggestionBtn").onclick = () => {
  state.pendingEntries = null;
  state.editingIndex = null;
  renderSuggestion();
  renderGroups();
  setStatus("");
};

load();
