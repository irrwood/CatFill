globalThis.CatFillI18n = (() => {
  const messages = {
    zh: {
      refresh: "刷新", organize: "整理重复资料", currentProfile: "当前档案", tabsLabel: "侧栏功能",
      organizerTab: "我的资料", addTab: "导入资料", settingsTab: "设置", aiSuggestion: "整理建议",
      suggestionReady: "这些资料可以更清楚", saveSuggestion: "保存这些修改", discardSuggestion: "暂不处理",
      field: "字段", addDetails: "导入资料", addDetailsHint: "从文件批量提取，或单独添加一项。", addModeLabel: "导入资料方式",
      manualMode: "手动录入", fileMode: "文件导入", category: "分类", fieldName: "字段名", value: "值",
      aliasesOptional: "别名（可选）", moreOptions: "更多选项", saveDetail: "保存资料", addField: "添加字段", keyPlaceholder: "如 邮箱、LinkedIn、姓名",
      valuePlaceholder: "要填写的内容", aliasesPlaceholder: "如 email, e-mail",
      uploadDocument: "拖入 PDF、Excel、图片或 TXT，或点击选择", analyze: "AI 分析", analyzeFile: "分析文件",
      documentImportHint: "AI 会生成可确认的字段建议，不会直接覆盖已保存资料。", fileDropTitle: "选择文件，或拖到这里", fileDropHint: "支持 PDF、Excel、图片和 TXT",
      aiSettings: "AI 设置", save: "保存", provider: "AI 供应商", model: "模型", language: "界面语言", advancedAiSettings: "高级 AI 设置", generalSettings: "通用设置",
      aiConnected: "已连接 {provider}", aiNotConnected: "尚未连接 {provider}", importDetailsAction: "导入资料", manualAddAction: "手动添加",
      learnWithAi: "学习已填内容时使用 AI", learnWithAiHint: "开启后会用 AI 清洗字段标题、合并中英文同义字段，并整理保存的值。",
      instruction: "填表补充指令（可选）", instructionPlaceholder: "例：求职表的开放问题请基于我保存的简历要点用第一人称回答，控制在 100 字以内；薪资期望一律填「面议」。",
      instructionHint: "AI 智能填充时会附加给模型，与默认规则冲突时以这里为准。",
      apiKeyLocal: "API Key 只保存在本机浏览器里。AI 填充、AI 整理和 AI 学习会把需要判断的字段与资料发给 {provider}。{hint}",
      defaultProfile: "默认", noProfile: "还没有可用档案，请先建立一份资料。",
      noEntries: "这份档案还是空的。可以学习网页内容，或从“导入资料”开始。", itemCount: "{count} 项",
      enterValue: "填写内容", fileCannotRestore: "浏览器不允许扩展代为重新选择本地文件", alias: "别名",
      saveEdit: "保存", cancel: "取消", edit: "修改", delete: "删除", selectedFile: "已选择文件", changeFile: "点击更换",
      fieldUpdated: "字段已修改", fieldDeleted: "字段已删除", createProfileFirst: "请先在 popup 新建一个联系人",
      keyAndValueRequired: "字段名和值都需要填写", fieldAdded: "资料已添加", imageFormats: "图片仅支持 JPG、PNG 或 WebP",
      imageTooLarge: "图片不能超过 5 MB", worksheet: "工作表：{name}", documentFormats: "请选择 PDF、Excel、图片或 TXT 文件",
      selectDocumentFirst: "请先选择 PDF、Excel、图片或文本文件", documentTooLarge: "文件不能超过 20 MB",
      noDocumentText: "没有提取到可用文字；扫描版 PDF 需要先进行 OCR", analyzeFailed: "文件分析失败",
      settingsSaved: "设置已保存", refreshFailed: "刷新失败", noEntriesToOrganize: "当前档案没有可整理的资料",
      organizeFailed: "整理失败", suggestionSummary: "可以将 {before} 项资料整理为 {after} 项，保存前仍可修改。",
      profileNew: "新建档案", profileRename: "重命名档案", profileDelete: "删除档案", learnPage: "学习并保存本页内容",
      newProfileName: "档案名称：", renameProfileName: "新名称：", retainOneProfile: "至少保留一份档案",
      deleteProfileConfirm: "删除档案「{name}」？",
      localFill: "快速本地填写", fillHint: "不调用 AI，仅适合字段明确的表单", learnHint: "保存你已经填写的内容", aiFill: "AI 安全填写", aiFillHint: "先理解问题和格式，再进行填写", openOrganizer: "管理我的资料",
      savedDetailCount: "已保存 {count} 项", emptyProfileTitle: "先准备一份资料", emptyProfileHint: "可以学习当前网页，或从文件导入。", importFromFile: "从文件导入",
      aiContinue: "用 AI 继续", setupAi: "设置 AI", learnResult: "新增 {added} 项，更新 {updated} 项", savedLocally: "资料只保存在本机",
      fillNone: "没有找到可填写的内容", unmatchedCount: "还有 {count} 项未匹配", fillComplete: "当前页面已处理完成", aiFillComplete: "AI 已完成可确认的填写", noMatchingDetails: "没有足够资料可以安全填写",
      localFillUsed: "本次仅使用本地匹配。",
      applyingTo: "正在申请", viewOnLinkedIn: "在 LinkedIn 查找公司", viewOnGlassdoor: "打开 Glassdoor 公司页面",
      chooseGlassdoorCompany: "选择正确的 Glassdoor 公司", searchAllGlassdoor: "查看全部搜索结果", close: "关闭",
      tabNotFound: "找不到当前标签页", inaccessiblePage: "没有可访问的页面区域", pageScriptFailed: "页面脚本执行失败",
      scanning: "扫描中…", scanCompleteOrganizing: "扫描完成，AI 正在整理字段…", aiOrganizeFailed: "AI 整理失败",
      scanResult: "{mode}扫描到 {fields} 个字段，新增 {added} 条、更新 {updated} 条资料", aiOrganizedPrefix: "AI 已整理，",
      filling: "正在填写表单…", fillResult: "已填写 {filled} 项", aiAnalyzing: "正在理解表单…",
      aiRequestFailed: "AI 请求失败", aiFillVerified: "AI 已确认填充 {filled} 个字段", aiFillNone: "AI 未能确认填入任何字段",
      windowNotFound: "找不到当前窗口", english: "English", chinese: "中文", theme: "外观", themeSystem: "跟随系统", themeLight: "浅色", themeDark: "夜间",
      companyResearchSetting: "识别招聘公司", companyResearchSettingHint: "在招聘页面显示 LinkedIn 和 Glassdoor 查询入口。",
      setupEyebrow: "开启 AI 功能", setupTitle: "让 CatFill 读懂复杂表单", setupIntro: "使用你自己的 API Key，获得更准确的语义判断和格式转换。",
      setupSemanticTitle: "理解复杂问题", setupSemanticText: "识别换种问法的字段和选择题语义。",
      setupFormatTitle: "按要求转换格式", setupFormatText: "处理姓名拆分、电话国家码和日期格式。",
      setupFilesTitle: "整理资料与文件", setupFilesText: "合并重复字段，并从文档或图片提取资料。",
      setupStepsLabel: "API 设置步骤", setupProviderStep: "使用 {provider}", setupCreateStep: "在官方控制台创建 API Key", setupPasteStep: "粘贴到下方并保存",
      getApiKey: "获取 API Key", enterApiKey: "填写 API Key", setupPrivacy: "Key 只保存在本机；仅在你使用 AI 功能时直接发送给所选服务商。",
      categories: { "身份信息": "身份信息", "证件": "证件", "联系方式": "联系方式", "地址": "地址", "教育": "教育", "公司/工作": "公司/工作", "旅行": "旅行", "其他": "其他" },
    },
    en: {
      refresh: "Refresh", organize: "Clean up duplicates", currentProfile: "Current profile", tabsLabel: "Side panel sections",
      organizerTab: "My details", addTab: "Import", settingsTab: "Settings", aiSuggestion: "Cleanup suggestion",
      suggestionReady: "These details can be clearer", saveSuggestion: "Save these changes", discardSuggestion: "Not now",
      field: "FIELD", addDetails: "Import details", addDetailsHint: "Extract several details from a file, or add one manually.", addModeLabel: "Import method",
      manualMode: "Enter manually", fileMode: "Import file", category: "Category", fieldName: "Field name", value: "Value",
      aliasesOptional: "Aliases (optional)", moreOptions: "More options", saveDetail: "Save detail", addField: "Add field", keyPlaceholder: "e.g. Email, LinkedIn, full name",
      valuePlaceholder: "Value to fill", aliasesPlaceholder: "e.g. email, e-mail",
      uploadDocument: "Drop a PDF, spreadsheet, image, or TXT file here, or click to choose", analyze: "Analyze with AI", analyzeFile: "Analyze file",
      documentImportHint: "AI creates field suggestions for review and never overwrites saved details automatically.", fileDropTitle: "Choose a file or drop it here", fileDropHint: "PDF, Excel, images, and TXT",
      aiSettings: "AI settings", save: "Save", provider: "AI provider", model: "Model", language: "Interface language", advancedAiSettings: "Advanced AI settings", generalSettings: "General settings",
      aiConnected: "Connected to {provider}", aiNotConnected: "Not connected to {provider}", importDetailsAction: "Import details", manualAddAction: "Add manually",
      learnWithAi: "Use AI when learning filled fields", learnWithAiHint: "Uses AI to clean field titles, merge Chinese and English equivalents, and organize saved values.",
      instruction: "Extra filling instructions (optional)", instructionPlaceholder: "Example: Answer job-application prompts in first person using my saved resume notes, within 100 words. Use “Negotiable” for salary expectations.",
      instructionHint: "Included with AI filling requests and takes precedence over the default rules.",
      apiKeyLocal: "Your API key stays in this browser. AI filling, organizing, and learning send the needed fields and details to {provider}. {hint}",
      defaultProfile: "Default", noProfile: "No usable profile yet. Create one to continue.",
      noEntries: "This profile is empty. Learn from a page or start in Import.", itemCount: "{count} items",
      enterValue: "Value to fill", fileCannotRestore: "Browsers do not let extensions re-select a local file", alias: "Aliases",
      saveEdit: "Save", cancel: "Cancel", edit: "Edit", delete: "Delete", selectedFile: "Selected file", changeFile: "Click to replace",
      fieldUpdated: "Field updated", fieldDeleted: "Field deleted", createProfileFirst: "Create a profile in the popup first",
      keyAndValueRequired: "Field name and value are required", fieldAdded: "Detail added", imageFormats: "Images must be JPG, PNG, or WebP",
      imageTooLarge: "Images must be under 5 MB", worksheet: "Sheet: {name}", documentFormats: "Choose a PDF, spreadsheet, image, or TXT file",
      selectDocumentFirst: "Choose a PDF, spreadsheet, image, or text file first", documentTooLarge: "Files must be under 20 MB",
      noDocumentText: "No usable text was found. A scanned PDF needs OCR first.", analyzeFailed: "Document analysis failed",
      settingsSaved: "Settings saved", refreshFailed: "Refresh failed", noEntriesToOrganize: "This profile has no details to clean up",
      organizeFailed: "Cleanup failed", suggestionSummary: "Clean up {before} saved details into {after}. You can still edit them before saving.",
      profileNew: "New profile", profileRename: "Rename profile", profileDelete: "Delete profile", learnPage: "Learn and save this page",
      newProfileName: "Profile name:", renameProfileName: "New name:", retainOneProfile: "Keep at least one profile",
      deleteProfileConfirm: "Delete profile “{name}”?",
      localFill: "Quick local fill", fillHint: "No AI; use only on clear, familiar forms", learnHint: "Save information you already entered", aiFill: "Safer AI fill", aiFillHint: "Understand each question and format before filling", openOrganizer: "Manage my details",
      savedDetailCount: "{count} saved", emptyProfileTitle: "Prepare a profile first", emptyProfileHint: "Learn from this page or import a file.", importFromFile: "Import a file",
      aiContinue: "Continue with AI", setupAi: "Set up AI", learnResult: "Added {added}, updated {updated}", savedLocally: "Saved only in this browser",
      fillNone: "Nothing could be filled", unmatchedCount: "{count} fields still unmatched", fillComplete: "This page is complete", aiFillComplete: "AI finished the fields it could verify", noMatchingDetails: "Not enough saved information to fill safely",
      localFillUsed: "This run used local matching only.",
      applyingTo: "Applying to", viewOnLinkedIn: "Find this company on LinkedIn", viewOnGlassdoor: "Open the Glassdoor company page",
      chooseGlassdoorCompany: "Choose the correct Glassdoor company", searchAllGlassdoor: "View all search results", close: "Close",
      tabNotFound: "Could not find the current tab", inaccessiblePage: "No accessible page area was found", pageScriptFailed: "Page script failed",
      scanning: "Scanning…", scanCompleteOrganizing: "Scan complete. Organizing fields with AI…", aiOrganizeFailed: "AI organization failed",
      scanResult: "{mode}Found {fields} fields. Added {added}, updated {updated} saved details.", aiOrganizedPrefix: "AI organized. ",
      filling: "Filling this form…", fillResult: "Filled {filled} fields", aiAnalyzing: "Understanding this form…",
      aiRequestFailed: "AI request failed", aiFillVerified: "AI confirmed {filled} fields filled", aiFillNone: "AI could not confirm any filled fields",
      windowNotFound: "Could not find the current window", english: "English", chinese: "Chinese", theme: "Appearance", themeSystem: "System", themeLight: "Light", themeDark: "Dark",
      companyResearchSetting: "Identify hiring companies", companyResearchSettingHint: "Show LinkedIn and Glassdoor research links on job pages.",
      setupEyebrow: "ENABLE AI", setupTitle: "Help CatFill understand complex forms", setupIntro: "Use your own API key for more accurate semantic matching and format conversion.",
      setupSemanticTitle: "Understand complex questions", setupSemanticText: "Match reworded fields and interpret choice questions.",
      setupFormatTitle: "Convert formats correctly", setupFormatText: "Handle split names, phone country codes, and dates.",
      setupFilesTitle: "Organize details and files", setupFilesText: "Merge duplicate fields and extract details from documents or images.",
      setupStepsLabel: "API setup steps", setupProviderStep: "Use {provider}", setupCreateStep: "Create an API key in the official console", setupPasteStep: "Paste it below and save",
      getApiKey: "Get API key", enterApiKey: "Enter API key", setupPrivacy: "Your key stays in this browser and is sent directly to the selected provider only when you use an AI feature.",
      categories: { "身份信息": "Identity", "证件": "Documents", "联系方式": "Contact", "地址": "Address", "教育": "Education", "公司/工作": "Work", "旅行": "Travel", "其他": "Other" },
    },
  };

  let locale = "zh";
  let theme = "system";
  const colorSchemeQuery = globalThis.matchMedia?.("(prefers-color-scheme: dark)");

  function preferredLocale(value) {
    if (value === "zh" || value === "en") return value;
    return /^zh/i.test(navigator.language || "") ? "zh" : "en";
  }

  function setLocale(value) {
    locale = preferredLocale(value);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }

  function preferredTheme(value) {
    return ["system", "light", "dark"].includes(value) ? value : "system";
  }

  function applyTheme() {
    const resolved = theme === "system" ? (colorSchemeQuery?.matches ? "dark" : "light") : theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }

  function setTheme(value) {
    theme = preferredTheme(value);
    applyTheme();
  }

  colorSchemeQuery?.addEventListener?.("change", () => {
    if (theme === "system") applyTheme();
  });

  function t(key, vars = {}) {
    const text = key.split(".").reduce((value, part) => value?.[part], messages[locale])
      ?? key.split(".").reduce((value, part) => value?.[part], messages.zh)
      ?? key;
    return typeof text === "string"
      ? text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""))
      : text;
  }

  function category(value) {
    return messages[locale].categories?.[value] ?? messages.zh.categories?.[value] ?? value;
  }

  function applyDocument(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const value = t(el.dataset.i18nTitle);
      el.title = value;
      el.setAttribute("aria-label", value);
    });
  }

  return { t, category, setLocale, setTheme, get locale() { return locale; }, get theme() { return theme; }, applyDocument };
})();
