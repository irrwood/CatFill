// Shared field cleanup helpers for popup, side panel, background tests.
(() => {
  const CATEGORY_ORDER = ["身份信息", "联系方式", "地址", "公司/工作", "其他"];

  const FIELD_DEFINITIONS = [
    {
      category: "身份信息",
      canonicalKey: "姓名",
      canonicalKeyEn: "Full name",
      aliases: ["姓名", "名字", "name", "full name", "fullname", "full_name", "contact name"],
    },
    {
      category: "身份信息",
      canonicalKey: "名",
      canonicalKeyEn: "First name",
      aliases: ["名", "first name", "firstname", "first_name", "given name", "given_name"],
    },
    {
      category: "身份信息",
      canonicalKey: "姓",
      canonicalKeyEn: "Last name",
      aliases: ["姓", "last name", "lastname", "last_name", "family name", "family_name", "surname"],
    },
    {
      category: "联系方式",
      canonicalKey: "邮箱",
      canonicalKeyEn: "Email",
      aliases: ["邮箱", "电子邮件", "邮件", "email", "e-mail", "mail", "email address", "email_address"],
    },
    {
      category: "联系方式",
      canonicalKey: "手机",
      canonicalKeyEn: "Phone",
      aliases: ["手机", "手机号", "电话", "联系电话", "phone", "mobile", "tel", "telephone", "phone number", "phone_number"],
    },
    {
      category: "地址",
      canonicalKey: "地址",
      canonicalKeyEn: "Address",
      aliases: ["地址", "详细地址", "address", "street address", "street_address", "addr"],
    },
    {
      category: "地址",
      canonicalKey: "城市",
      canonicalKeyEn: "City",
      aliases: ["城市", "市", "city", "locality"],
    },
    {
      category: "地址",
      canonicalKey: "省/州",
      canonicalKeyEn: "State / Province",
      aliases: ["省", "州", "省份", "state", "province", "region"],
    },
    {
      category: "地址",
      canonicalKey: "邮编",
      canonicalKeyEn: "Postal code",
      aliases: ["邮编", "邮政编码", "postcode", "postal code", "postal_code", "zip", "zip code", "zipcode"],
    },
    {
      category: "地址",
      canonicalKey: "国家/地区",
      canonicalKeyEn: "Country / Region",
      aliases: ["国家", "地区", "country", "country name", "country_name"],
    },
    {
      category: "公司/工作",
      canonicalKey: "公司",
      canonicalKeyEn: "Company",
      aliases: ["公司", "单位", "组织", "company", "organization", "organisation", "employer"],
    },
    {
      category: "公司/工作",
      canonicalKey: "职位",
      canonicalKeyEn: "Job title",
      aliases: ["职位", "职务", "岗位", "title", "job title", "job_title", "position", "role"],
    },
  ];

  function norm(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[\s:*：、（）()\[\]\-\/.]+/g, "")
      .replace(/_/g, "")
      .trim();
  }

  function isMachineSignal(text) {
    const value = String(text || "").trim();
    if (!value) return true;
    const compact = value.toLowerCase();
    const uuidPattern = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
    if (["on", "off", "true", "false", "yes", "no", "checked", "unchecked"].includes(compact)) return true;
    if (["please select", "please select...", "select", "选择", "请选择", "问题-选择", "问题选择"].includes(compact)) return true;
    if (new RegExp(`^${uuidPattern}(_${uuidPattern})?(-[a-z]+-[a-z]+-\\d+)?$`, "i").test(compact)) return true;
    if (new RegExp(uuidPattern, "i").test(compact) && compact.length > 24) return true;
    if (/^(select|radio|checkbox)[_-]?(question|field|input|answer|response|item|option)[_-]?\d{4,}$/i.test(compact)) return true;
    if (/^(question|field|input|answer|response|item|option)[_-]?\d{4,}$/i.test(compact)) return true;
    if (/^(question|field|input|answer|response|item|option)[_-]?[a-f0-9]{8,}$/i.test(compact)) return true;
    if (/^[a-z0-9_-]{24,}-(labeled|labelled)?-?(radio|checkbox|select|option)-\d+$/i.test(compact)) return true;
    if (/^[a-f0-9]{12,}$/i.test(compact)) return true;
    if (/^\d{4,}$/.test(compact)) return true;
    return false;
  }

  function humanSignal(text) {
    const value = String(text || "").trim();
    return isMachineSignal(value) ? "" : value;
  }

  function looksLikeOptionDump(text, options = []) {
    const compact = norm(text);
    if (!compact || options.length < 2) return false;
    const optionText = options.map((option) => norm(option.text || option.value)).filter(Boolean).join("");
    return optionText && (compact === optionText || compact.includes(optionText));
  }

  function cleanAlias(alias, entry) {
    const value = humanSignal(alias);
    if (!value) return "";
    if (looksLikeOptionDump(value, entry?.options || [])) return "";
    if (entry?.choice && [entry.choice.value, entry.choice.text, entry.value].some((choiceValue) => norm(choiceValue) === norm(value))) return "";
    return value;
  }

  function signalsFor(entry) {
    const signals = entry?.signals || {};
    return ["question", "label", "name", "placeholder", "ariaLabel", "id", "autocomplete"]
      .map((key) => humanSignal(signals[key]))
      .filter(Boolean);
  }

  function entryDisplayKey(entry) {
    return (
      humanSignal(entry?.canonicalKey) ||
      humanSignal(entry?.signals?.question) ||
      humanSignal(entry?.signals?.label) ||
      humanSignal(entry?.signals?.placeholder) ||
      humanSignal(entry?.signals?.ariaLabel) ||
      humanSignal(entry?.signals?.name) ||
      humanSignal(entry?.signals?.id) ||
      humanSignal(entry?.signals?.autocomplete) ||
      "(未命名)"
    );
  }

  function isFullQuestionText(text) {
    const value = String(text || "").trim();
    const compact = norm(value);
    if (!compact) return false;
    if (/[?？]/.test(value)) return true;
    if (/^(will|would|do|does|did|are|is|can|could|may|have|has|what|which|when|where|why|how)\b/i.test(value)) return true;
    if (/^(是否|您是否|你是否|请选择|请问|哪一|什么|何时|为什么|如何)/.test(value)) return true;
    return compact.length >= 18 && /(consent|permission|sponsorship|authorization|authorized|identity|preference|community|gender|voluntary|acknowledge)/.test(compact);
  }

  function choiceQuestionDefinition(entry) {
    if (!entry?.choice) return null;
    const question = humanSignal(entry.signals?.question);
    if (isFullQuestionText(question)) {
      return {
        category: "其他",
        canonicalKey: question,
        aliases: [],
      };
    }
    return null;
  }

  function matchDefinition(entry, language = "zh") {
    const choiceDefinition = choiceQuestionDefinition(entry);
    if (choiceDefinition) return choiceDefinition;

    const texts = signalsFor(entry);
    const normalizedTexts = texts.map(norm).filter(Boolean);
    let best = null;
    let bestScore = 0;
    for (const definition of FIELD_DEFINITIONS) {
      const normalizedAliases = definition.aliases.map(norm);
      let score = 0;
      for (const text of normalizedTexts) {
        for (const alias of normalizedAliases) {
          if (!text || !alias) continue;
          if (text === alias) score = Math.max(score, 100 + alias.length);
          else if (text.includes(alias) && alias.length >= 4) score = Math.max(score, 40 + alias.length);
          else if (alias.includes(text) && text.length >= 4) score = Math.max(score, 30 + text.length);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = definition;
      }
    }
    if (best) {
      return {
        ...best,
        canonicalKey: language === "en" ? (best.canonicalKeyEn || best.canonicalKey) : best.canonicalKey,
      };
    }
    return {
      category: "其他",
      canonicalKey: entryDisplayKey(entry),
      aliases: [],
    };
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function mergeSignals(baseSignals = {}, nextSignals = {}) {
    const merged = { ...baseSignals };
    for (const [key, value] of Object.entries(nextSignals)) {
      if (!merged[key] && value) merged[key] = value;
    }
    return merged;
  }

  function organizeEntries(entries = [], options = {}) {
    const language = options.language || "zh";
    const byKey = new Map();
    for (const entry of entries) {
      if (!entry || !entry.value) continue;
      const definition = matchDefinition(entry, language);
      const mapKey = `${definition.category}|${definition.canonicalKey}|${entry.value}`;
      const aliases = unique([...signalsFor(entry), ...(entry.aliases || []).map((alias) => cleanAlias(alias, entry))]);
      const existing = byKey.get(mapKey);
      if (existing) {
        existing.aliases = unique([...existing.aliases, ...aliases]);
        existing.signals = mergeSignals(existing.signals, entry.signals);
        if (!existing.choice && entry.choice) existing.choice = { ...entry.choice };
        if (!existing.options && entry.options) existing.options = [...entry.options];
        if (!existing.file && entry.file) existing.file = { ...entry.file };
      } else {
        byKey.set(mapKey, {
          ...(entry.type ? { type: entry.type } : {}),
          category: definition.category,
          canonicalKey: definition.canonicalKey,
          aliases,
          signals: { ...(entry.signals || {}) },
          ...(entry.choice ? { choice: { ...entry.choice } } : {}),
          ...(entry.options ? { options: [...entry.options] } : {}),
          ...(entry.file ? { file: { ...entry.file } } : {}),
          value: entry.value,
        });
      }
    }

    return [...byKey.values()].sort((a, b) => {
      const categoryDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      if (categoryDiff) return categoryDiff;
      return a.canonicalKey.localeCompare(b.canonicalKey, "zh-CN");
    });
  }

  function groupOrganizedEntries(entries = []) {
    const groups = new Map();
    for (const entry of entries) {
      const category = entry.category || "其他";
      if (!groups.has(category)) groups.set(category, { category, entries: [] });
      groups.get(category).entries.push(entry);
    }
    return [...groups.values()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    );
  }

  function aliasesFromText(text) {
    return unique(
      String(text || "")
        .split(/[,，\n]/)
        .map((item) => item.trim()),
    );
  }

  function updateEntryAt(entries = [], index, patch = {}) {
    return entries.map((entry, currentIndex) => {
      if (currentIndex !== index) return entry;
      const canonicalKey = (patch.canonicalKey || entry.canonicalKey || entryDisplayKey(entry)).trim();
      const displayValue = patch.value !== undefined ? String(patch.value).trim() : (entry.choice?.text || entry.value);
      const selectedOption = entry.options?.find((option) =>
        norm(option.text) === norm(displayValue) || norm(option.value) === norm(displayValue));
      const choiceValue = selectedOption?.value || displayValue;
      const value = entry.choice ? choiceValue : displayValue;
      const aliases = patch.aliasesText !== undefined ? aliasesFromText(patch.aliasesText) : entry.aliases || [];
      return {
        ...entry,
        category: patch.category || entry.category || "其他",
        canonicalKey,
        aliases,
        signals: {
          ...(entry.signals || {}),
          question: canonicalKey,
          label: canonicalKey,
        },
        ...(entry.choice ? { choice: { ...entry.choice, value: choiceValue, text: displayValue } } : {}),
        value,
      };
    });
  }

  function deleteEntryAt(entries = [], index) {
    return entries.filter((_, currentIndex) => currentIndex !== index);
  }

  // 逐个信号判断，中文用精确匹配。
  // 千万不要在拼接后的长串上跑 /名/ 这类单字正则——"公司名""职位名称""用户名"全会误中。
  function signalValues(signals = {}) {
    return [
      signals.question,
      signals.label,
      signals.name,
      signals.placeholder,
      signals.ariaLabel,
      signals.id,
      signals.autocomplete,
    ].map(norm).filter(Boolean);
  }

  function isFirstNameField(signals = {}) {
    const parts = signalValues(signals);
    if (parts.some((p) => /firstname|givenname/.test(p))) return true;
    return parts.some((p) => p === "名" || p === "名字");
  }

  function isLastNameField(signals = {}) {
    const parts = signalValues(signals);
    if (parts.some((p) => /lastname|familyname|surname/.test(p))) return true;
    return parts.some((p) => p === "姓" || p === "姓氏");
  }

  function isFullNameField(signals = {}) {
    const parts = signalValues(signals);
    if (parts.some((p) => /fullname|contactname/.test(p))) return true;
    if (parts.some((p) => p === "姓名" || p === "全名" || p === "name" || p === "yourname")) return true;
    return false;
  }

  function splitName(value = "") {
    const parts = String(value).trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { first: value, last: "" };
    return {
      first: parts.slice(0, -1).join(" "),
      last: parts[parts.length - 1],
    };
  }

  function findEntry(entries, predicate) {
    return entries.find((entry) => predicate(entry.signals || {}, entry));
  }

  function resolveEntryValueForField(fieldSignals = {}, entry = {}, allEntries = []) {
    if (!entry || entry.choice || entry.file) return entry?.value || "";
    const currentValue = entry.value || "";
    const fullNameEntry = findEntry(allEntries, (signals) => isFullNameField(signals));
    const firstNameEntry = findEntry(allEntries, (signals) => isFirstNameField(signals));
    const lastNameEntry = findEntry(allEntries, (signals) => isLastNameField(signals));

    if (isFirstNameField(fieldSignals)) {
      if (firstNameEntry) return firstNameEntry.value;
      if (fullNameEntry) return splitName(fullNameEntry.value).first;
      if (isFullNameField(entry.signals)) return splitName(currentValue).first;
    }
    if (isLastNameField(fieldSignals)) {
      if (lastNameEntry) return lastNameEntry.value;
      if (fullNameEntry) return splitName(fullNameEntry.value).last;
      if (isFullNameField(entry.signals)) return splitName(currentValue).last;
    }
    if (isFullNameField(fieldSignals)) {
      if (fullNameEntry) return fullNameEntry.value;
      if (firstNameEntry || lastNameEntry) {
        return [firstNameEntry?.value, lastNameEntry?.value].filter(Boolean).join(" ");
      }
    }
    return currentValue;
  }

  globalThis.CatFillFieldOrganizer = {
    CATEGORY_ORDER,
    FIELD_DEFINITIONS,
    deleteEntryAt,
    entryDisplayKey,
    groupOrganizedEntries,
    isMachineSignal,
    organizeEntries,
    resolveEntryValueForField,
    updateEntryAt,
  };
})();
