// CatFill 后台：调用多家 AI API 做智能字段映射。
// 密钥只存在 chrome.storage.local，从 service worker 发请求，不经过页面。

const SCHEMA = {
  type: "object",
  properties: {
    assignments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          // why 让模型先写下对题意的理解再给值，能明显提高审题准确率；填充时忽略
          why: { type: "string" },
          value: { type: "string" },
        },
        required: ["index", "why", "value"],
        additionalProperties: false,
      },
    },
  },
  required: ["assignments"],
  additionalProperties: false,
};

const ORGANIZE_SCHEMA = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          canonicalKey: { type: "string" },
          aliases: { type: "array", items: { type: "string" } },
          signals: {
            type: "object",
            properties: {
              autocomplete: { type: "string" },
              name: { type: "string" },
              id: { type: "string" },
              placeholder: { type: "string" },
              question: { type: "string" },
              label: { type: "string" },
              ariaLabel: { type: "string" },
              note: { type: "string" },
            },
            required: ["autocomplete", "name", "id", "placeholder", "question", "label", "ariaLabel"],
            additionalProperties: false,
          },
          choice: {
            type: "object",
            properties: {
              value: { type: "string" },
              text: { type: "string" },
              index: { type: "integer" },
            },
            required: ["value", "text"],
            additionalProperties: false,
          },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                value: { type: "string" },
                text: { type: "string" },
              },
              required: ["value", "text"],
              additionalProperties: false,
            },
          },
          file: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              size: { type: "integer" },
              lastModified: { type: "integer" },
            },
            required: ["name", "type", "size", "lastModified"],
            additionalProperties: false,
          },
          value: { type: "string" },
        },
        required: ["category", "canonicalKey", "aliases", "signals", "value"],
        additionalProperties: false,
      },
    },
  },
  required: ["entries"],
  additionalProperties: false,
};

const AI_PROVIDERS = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    kind: "anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-opus-4-8",
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    kind: "openai-compatible",
    endpoint: "https://api.deepseek.com/chat/completions",
    defaultModel: "deepseek-chat",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    kind: "openai-compatible",
    endpoint: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    kind: "gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    defaultModel: "gemini-2.5-flash",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    kind: "openai-compatible",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "openai/gpt-4o-mini",
  },
  groq: {
    id: "groq",
    name: "Groq",
    kind: "openai-compatible",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    kind: "openai-compatible",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    defaultModel: "mistral-large-latest",
  },
};

function selectedProvider(settings = {}) {
  return AI_PROVIDERS[settings.provider] || AI_PROVIDERS.anthropic;
}

function localizedError(settings, chinese, english) {
  return settings.language === "en" ? english : chinese;
}

function apiKeyForProvider(settings = {}, provider) {
  return settings.apiKeys?.[provider.id] || settings.apiKey || "";
}

function buildPrompt(fields, entries, page = {}, instruction = "") {
  const fieldDesc = fields.map((f) => ({
    index: f.index,
    type: f.type,
    ...f.signals,
    ...(f.value ? { currentValue: f.value } : {}),
    ...(f.options ? { options: f.options.map((o) => o.text || o.value) } : {}),
  }));
  const profileDesc = entries.map((e) => ({
    kind: e.choice || e.type === "custom-choice" || e.type === "select" ? "已回答的选择题" : "可复用资料",
    key: e.canonicalKey || e.signals.question || e.signals.label || e.signals.name || e.signals.placeholder || e.signals.id,
    ...(e.aliases?.length ? { aliases: e.aliases } : {}),
    ...(e.signals?.question ? { sourceQuestion: e.signals.question } : {}),
    ...(e.signals?.note ? { sourceNote: e.signals.note } : {}),
    ...(e.choice ? { choice: e.choice } : {}),
    ...(e.options?.length ? { sourceOptions: e.options.map((option) => option.text || option.value) } : {}),
    ...(e.file ? { file: e.file } : {}),
    value: e.value,
  }));

  return [
    "你是一个表单填写助手，帮用户把资料填进网页表单。",
    `页面：${page.title || ""}${page.heading && page.heading !== page.title ? ` | ${page.heading}` : ""} (${page.url || ""})`,
    "下面是页面上按出现顺序排列的表单字段（question 是从页面提取的题目文字，note 是说明/格式要求），以及用户保存的资料。",
    "",
    "第一步：审题。逐个字段读 question/label/note，先弄清楚它真正在问什么（结合页面主题和前后字段的上下文）。",
    "第二步：找证据。每个候选资料都要判断是直接事实，还是某个旧问题的已选答案；已选答案绝不是通用资料。",
    "第三步：决定填什么。按字段性质分三类处理：",
    "1. 事实类（姓名/邮箱/电话/地址/证件/教育/工作经历等）：值必须来自资料，可做格式转换：",
    "   - 姓名按字段拆分或合并（first/given name 填名，last/family name 填姓，full name 填全名）；",
    "   - date 类型输入必须用 YYYY-MM-DD；其他日期按 note 或 placeholder 的格式要求；",
    "   - 电话按 note 要求处理国家码/加号/空格（如 international format 输出 +86...，digits only 输出纯数字）；note 的格式要求优先于资料里保存的原始格式；",
    "   - 资料里完全没有的事实信息不要编造，跳过该字段。",
    "2. 选择类（select/radio/checkbox/custom-choice）：value 必须是 options 里某一项的原文。做语义匹配而不是字面匹配：资料里的「中国」可以对应选项「China (+86)」，「男」对应「Male」。checkbox 用 \"true\"/\"false\"。custom-select 是弹层式下拉框（选项列表未知），给出资料中最合适的候选文本即可，插件会打开弹层做模糊匹配。",
    "3. 开放问答类（自我介绍、申请原因、备注等）：如果资料里有能支撑回答的素材（简历要点、过往回答等），可以基于素材组织成通顺的回答，语言与题目语言一致；资料里没有相关素材就跳过，绝不虚构经历或观点。",
    "",
    "选择题的语义门槛（必须遵守）：",
    "- 复用某个旧选择题的答案前，逐项比较新旧问题的对象、动作/关系、时间条件、范围/地点/雇主、肯定或否定方向；五项中任何关键项不同，都不能复用。",
    "- 相同关键词、同样的 Yes/No、都涉及工作或都涉及某个国家，都不足以说明是同一问题。答案只属于它的 sourceQuestion，不能脱离原问题使用。",
    "- 只有提问方式不同但要求用户作出同一个决定时才可复用。例如“未来是否需要雇主提供工作签证支持”和“是否需要公司为你的工作许可提供赞助”可以对齐；“是否已有工作许可”“是否接受营销联系”“是否愿意去办公室工作”即使同为 Yes/No 也不是同一个决定。",
    "- 任何范围、时间、主体或否定含义不明确时跳过，不要猜用户偏好。",
    "",
    "其他要求：",
    "- currentValue 是字段当前已有的值；如果它已经正确就不要重复输出该字段；",
    "- 没把握的字段宁可跳过，也不要乱填；",
    "- why 必须简短写出：目标问题的语义、使用了哪条资料、以及是直接事实还是经过新旧问题完全对齐后复用；这三点写不清就跳过该字段。",
    "- 只返回一个 JSON 对象：{\"assignments\":[{\"index\":0,\"why\":\"目标：…；资料：…；依据：直接事实/语义完全对齐\",\"value\":\"……\"}]}。",
    instruction ? `\n用户补充指令（与上面规则冲突时以此为准）：\n${instruction}` : "",
    "",
    "表单字段：",
    JSON.stringify(fieldDesc),
    "",
    "用户资料：",
    JSON.stringify(profileDesc),
  ].join("\n");
}

function outputLanguageInstruction(language) {
  return language === "en"
    ? "Output canonicalKey and aliases in clear English. Keep category values exactly as one of the required Chinese category values."
    : "canonicalKey 和 aliases 使用清晰的中文或中英文常用名称；category 必须保持为指定中文分类。";
}

function buildOrganizePrompt(entries, language = "zh") {
  return [
    "你是 CatFill 的联系人资料整理助手。下面是用户保存的表单资料条目。",
    "请把中英文相同含义的字段归并，按类别整理，并只返回 JSON 对象。",
    "格式必须是：{\"entries\":[{\"category\":\"联系方式\",\"canonicalKey\":\"邮箱\",\"aliases\":[\"email\"],\"signals\":{\"autocomplete\":\"\",\"name\":\"email\",\"id\":\"\",\"placeholder\":\"\",\"label\":\"Email\",\"ariaLabel\":\"\",\"note\":\"\"},\"value\":\"hi@example.com\"}]}。",
    "规则：",
    "- category 只能使用：身份信息、联系方式、地址、公司/工作、其他；",
    "- canonicalKey 使用清晰、具体、忠于原问题的标题；简单资料字段可用简洁中文，如 姓名、邮箱、手机、地址、公司、职位；",
    "- 对 radio/select/checkbox 这类选择题，先判断整句 question 的真实语义；如果 question 是完整问题，canonicalKey 必须保留或准确概括这个问题，不要只抓某个关键词改成宽泛资料字段；",
    "- 选择题不要用选项文字当标题。Yes/No、Male/Female、Please select 等只是选项，不是字段语义；",
    "- 不要把不同语义的问题混淆：contact consent 是联系许可，visa sponsorship 是签证赞助，work authorization/authorized to work 是工作许可，demographic/community/gender 是人口统计/身份信息偏好；它们都不能互相改写；",
    "- 不要把 question_35380312002、field_8f3a91c2 这类机器生成的 name/id 当作标题或别名；找不到人类可读标题时用「(未命名)」；",
    "- 不要把 off、on、true、false 这类浏览器控制值当作标题或别名；",
    "- 不要把「问题-选择」「请选择」「Please select...」或 Please select...YesNo 这类选项列表拼接串当作标题或别名；",
    "- aliases 收集被合并字段的中文/英文名称；",
    "- value 必须来自原始条目，不要编造；",
    "- 如果原始条目有 choice/options，尽量原样保留，用来之后一键选择下拉框、单选项；",
    "- 如果原始条目有 file，只能保留文件名、类型、大小等元信息，不能编造文件内容；",
    "- 如果多个同义字段 value 相同，只保留一条；",
    "- 如果同义字段 value 不同，保留多条，不要猜测哪条正确；",
    "- signals 必须保留一个最有代表性的原始 signals，缺失字段用空字符串；如果有 question 或 note 字段必须保留。",
    `- ${outputLanguageInstruction(language)}`,
    "",
    "原始资料：",
    JSON.stringify(entries),
  ].join("\n");
}

function buildDocumentExtractPrompt(fileName, text = "", language = "zh") {
  const isImage = !text;
  return [
    `你是 CatFill 的资料提取助手。请从用户主动选择的${isImage ? "图片" : "文件"}中提取明确写出的、适合用于网页表单填写的个人资料。`,
    `文件名：${fileName || "未命名文件"}`,
    "只返回 JSON 对象，格式必须是：{\"entries\":[{\"category\":\"身份信息\",\"canonicalKey\":\"姓名\",\"aliases\":[\"full name\"],\"signals\":{\"autocomplete\":\"\",\"name\":\"\",\"id\":\"\",\"placeholder\":\"\",\"question\":\"\",\"label\":\"姓名\",\"ariaLabel\":\"\",\"note\":\"来自文件\"},\"value\":\"...\"}]}",
    "规则：",
    "- 只提取文件中明确出现的事实；每个 value 必须逐字来自文件文字，不能猜测、补全、改写数值或编造经历。",
    "- 邮箱、电话、网址、证件号尤其必须原样复制文件里的字符；不要输出 john.smith@email.com、example.com 等示例或占位内容。",
    "- 优先提取姓名、邮箱、电话、地址、网站、LinkedIn、公司、职位、教育经历、工作经历、技能、作品集链接等可填写资料。",
    "- category 只能使用：身份信息、联系方式、地址、公司/工作、其他。",
    "- 同一含义的中英文内容合并成一个字段；canonicalKey 用清晰简短的中文标题。",
    "- 长内容（个人简介、工作经历、教育经历）可以保留为一个字段的完整文本，但不要超过 1500 字。",
    "- 不要提取密码、银行卡、身份证号码等高敏感信息；不要把文档标题、页码、空白字段当资料。",
    "- signals 的字段必须齐全；无对应值时填空字符串，label 填 canonicalKey，note 填“来自文件”。",
    "- 最多返回 30 条，且只返回 JSON，不能附加解释。",
    `- ${outputLanguageInstruction(language)}`,
    "",
    isImage ? "请直接阅读附带图片中的文字和版式。" : "文件文字：",
    isImage ? "" : text.slice(0, 45000),
  ].join("\n");
}

function evidenceKey(text) {
  return String(text || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

// 文字型文件有可用原文时，拒绝模型无法在原文中举证的值。
function verifiedDocumentEntries(entries, sourceText) {
  const source = evidenceKey(sourceText);
  if (!source) return [];
  return entries.filter((entry) => {
    const value = evidenceKey(entry.value);
    return value.length >= 2 && source.includes(value);
  });
}

function buildAnthropicRequest({ provider, apiKey, model, prompt, schema = SCHEMA, image = null }) {
  return {
    url: provider.endpoint,
    options: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        output_config: { format: { type: "json_schema", schema } },
        messages: [{
          role: "user",
          content: image
            ? [
                { type: "image", source: { type: "base64", media_type: image.mimeType, data: image.data } },
                { type: "text", text: prompt },
              ]
            : prompt,
        }],
      }),
    },
  };
}

function buildOpenAICompatibleRequest({ provider, apiKey, model, prompt, image = null }) {
  return {
    url: provider.endpoint,
    options: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: "user",
          content: image
            ? [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}`, detail: "high" } },
              ]
            : prompt,
        }],
        response_format: { type: "json_object" },
      }),
    },
  };
}

function buildGeminiRequest({ provider, apiKey, model, prompt, image = null }) {
  return {
    url: `${provider.endpoint}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    options: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: image
            ? [{ text: prompt }, { inline_data: { mime_type: image.mimeType, data: image.data } }]
            : [{ text: prompt }],
        }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  };
}

function buildProviderRequest({ provider, apiKey, model, prompt, schema = SCHEMA, image = null }) {
  if (provider.kind === "anthropic") {
    return buildAnthropicRequest({ provider, apiKey, model, prompt, schema, image });
  }
  if (provider.kind === "gemini") {
    return buildGeminiRequest({ provider, apiKey, model, prompt, image });
  }
  return buildOpenAICompatibleRequest({ provider, apiKey, model, prompt, image });
}

function extractProviderText(provider, data) {
  if (provider.kind === "anthropic") {
    if (data.stop_reason === "refusal") throw new Error("模型拒绝了本次请求");
    return (data.content || []).find((b) => b.type === "text")?.text || "";
  }
  if (provider.kind === "gemini") {
    return data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text || "";
  }
  return data.choices?.[0]?.message?.content || "";
}

function parseAssignments(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  if (!cleaned) throw new Error("API 返回内容为空");
  return JSON.parse(cleaned).assignments || [];
}

function cleanJsonText(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

function normalizeSignals(signals = {}) {
  return {
    autocomplete: signals.autocomplete || "",
    name: signals.name || "",
    id: signals.id || "",
    placeholder: signals.placeholder || "",
    question: signals.question || "",
    label: signals.label || "",
    ariaLabel: signals.ariaLabel || "",
    note: signals.note || "",
  };
}

function normalizeChoice(choice) {
  if (!choice) return null;
  return {
    value: choice.value || "",
    text: choice.text || "",
    ...(Number.isInteger(choice.index) ? { index: choice.index } : {}),
  };
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return null;
  return options
    .filter((option) => option && (option.value || option.text))
    .map((option) => ({
      value: option.value || "",
      text: option.text || "",
    }));
}

function normalizeFile(file) {
  if (!file) return null;
  return {
    name: file.name || "",
    type: file.type || "",
    size: Number.isInteger(file.size) ? file.size : 0,
    lastModified: Number.isInteger(file.lastModified) ? file.lastModified : 0,
  };
}

function isMachineSignal(text) {
  const value = String(text || "").trim().toLowerCase();
  const uuidPattern = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
  if (!value) return true;
  if (["on", "off", "true", "false", "yes", "no", "checked", "unchecked"].includes(value)) return true;
  if (["please select", "please select...", "select", "选择", "请选择", "问题-选择", "问题选择"].includes(value)) return true;
  if (new RegExp(`^${uuidPattern}(_${uuidPattern})?(-[a-z]+-[a-z]+-\\d+)?$`, "i").test(value)) return true;
  if (new RegExp(uuidPattern, "i").test(value) && value.length > 24) return true;
  if (/^(select|radio|checkbox)[_-]?(question|field|input|answer|response|item|option)[_-]?\d{4,}$/i.test(value)) return true;
  if (/^(question|field|input|answer|response|item|option)[_-]?\d{4,}$/i.test(value)) return true;
  if (/^(question|field|input|answer|response|item|option)[_-]?[a-f0-9]{8,}$/i.test(value)) return true;
  if (/^[a-z0-9_-]{24,}-(labeled|labelled)?-?(radio|checkbox|select|option)-\d+$/i.test(value)) return true;
  if (/^[a-f0-9]{12,}$/i.test(value)) return true;
  if (/^\d{4,}$/.test(value)) return true;
  return false;
}

function normText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\s:*：、（）()\[\]\-\/.]+/g, "")
    .replace(/_/g, "")
    .trim();
}

function isFullQuestionText(text) {
  const value = String(text || "").trim();
  const compact = normText(value);
  if (!compact) return false;
  if (/[?？]/.test(value)) return true;
  if (/^(will|would|do|does|did|are|is|can|could|may|have|has|what|which|when|where|why|how)\b/i.test(value)) return true;
  if (/^(是否|您是否|你是否|请选择|请问|哪一|什么|何时|为什么|如何)/.test(value)) return true;
  return compact.length >= 18 && /(consent|permission|sponsorship|authorization|authorized|identity|preference|community|gender|voluntary|acknowledge)/.test(compact);
}

function semanticTokens(text) {
  const stop = new Set(["will", "would", "you", "your", "now", "the", "for", "with", "and", "or", "are", "is", "do", "does", "did", "what", "which", "when", "where", "why", "how", "是否", "请选择"]);
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !stop.has(token));
}

function titleKeepsQuestionMeaning(title, question) {
  const titleText = normText(title);
  if (/^(是否)?(确认|同意|选择|回答)$|^(yesno|yesorno|confirm|confirmation|answer|response)$/.test(titleText)) return false;
  const tokens = semanticTokens(question);
  if (!tokens.length) return true;
  return tokens.some((token) => titleText.includes(normText(token)));
}

function looksLikeOptionDump(text, options = []) {
  const compact = normText(text);
  if (!compact || !Array.isArray(options) || options.length < 2) return false;
  const optionText = options.map((option) => normText(option.text || option.value)).filter(Boolean).join("");
  return optionText && (compact === optionText || compact.includes(optionText));
}

function looksLikeSelectedChoice(text, entry = {}) {
  const value = normText(text);
  if (!value) return false;
  return [entry.value, entry.choice?.value, entry.choice?.text]
    .filter(Boolean)
    .some((choiceValue) => normText(choiceValue) === value);
}

// 只做两件事：标题丢了题目语义时退回题目原文；标题是机器串时找人类可读的兜底。
// 不做任何按主题硬编码的改写——那会在没见过的表单上把对的标题改错。
function cleanTitle(title, signals = {}) {
  const question = signals.question || "";
  if (isFullQuestionText(question) && (!title || !titleKeepsQuestionMeaning(title, question))) {
    return question;
  }
  const candidates = [
    title,
    signals.question,
    signals.label,
    signals.placeholder,
    signals.ariaLabel,
    signals.name,
  ];
  return candidates.find((candidate) => candidate && !isMachineSignal(candidate)) || "(未命名)";
}

function parseOrganizedEntries(text) {
  const cleaned = cleanJsonText(text);
  if (!cleaned) throw new Error("API 返回内容为空");
  const data = JSON.parse(cleaned);
  return (data.entries || [])
    .filter((entry) => entry && entry.value)
    .map((entry) => {
      const choice = normalizeChoice(entry.choice);
      const options = normalizeOptions(entry.options);
      const file = normalizeFile(entry.file);
      return {
        ...(entry.type ? { type: entry.type } : {}),
        category: entry.category || "其他",
        canonicalKey: cleanTitle(entry.canonicalKey, entry.signals),
        aliases: Array.isArray(entry.aliases)
          ? entry.aliases.filter((alias) => alias && !isMachineSignal(alias) && !looksLikeOptionDump(alias, entry.options) && !looksLikeSelectedChoice(alias, entry))
          : [],
        signals: normalizeSignals(entry.signals),
        ...(choice ? { choice } : {}),
        ...(options?.length ? { options } : {}),
        ...(file ? { file } : {}),
        value: String(entry.value),
      };
    });
}

async function aiMap(fields, entries, page) {
  const { settings = {} } = await chrome.storage.local.get("settings");
  const provider = selectedProvider(settings);
  const apiKey = apiKeyForProvider(settings, provider);
  if (!apiKey) throw new Error(localizedError(settings, `请先在设置中填写 ${provider.name} API Key`, `Add a ${provider.name} API key in Settings first`));
  const model = settings.models?.[provider.id] || settings.model || provider.defaultModel;
  const prompt = buildPrompt(fields, entries, page, settings.aiInstruction || "");
  const request = buildProviderRequest({ provider, apiKey, model, prompt });

  const res = await fetch(request.url, request.options);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return parseAssignments(extractProviderText(provider, data));
}

async function aiOrganizeEntries(entries) {
  const { settings = {} } = await chrome.storage.local.get("settings");
  const provider = selectedProvider(settings);
  const apiKey = apiKeyForProvider(settings, provider);
  if (!apiKey) throw new Error(localizedError(settings, `请先在设置中填写 ${provider.name} API Key`, `Add a ${provider.name} API key in Settings first`));
  const model = settings.models?.[provider.id] || settings.model || provider.defaultModel;
  const prompt = buildOrganizePrompt(entries, settings.language);
  const request = buildProviderRequest({ provider, apiKey, model, prompt, schema: ORGANIZE_SCHEMA });

  const res = await fetch(request.url, request.options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return parseOrganizedEntries(extractProviderText(provider, data));
}

async function aiExtractDocument(fileName, text, image = null) {
  const { settings = {} } = await chrome.storage.local.get("settings");
  const provider = selectedProvider(settings);
  if (image && provider.id === "deepseek") {
    throw new Error(localizedError(
      settings,
      "DeepSeek 当前接口未配置图片识别；请在设置中选择 Claude、OpenAI、Gemini 或支持视觉的兼容模型",
      "The configured DeepSeek API does not support image analysis. Choose Claude, OpenAI, Gemini, or a vision-capable compatible model in Settings.",
    ));
  }
  const apiKey = apiKeyForProvider(settings, provider);
  if (!apiKey) throw new Error(localizedError(settings, `请先在设置中填写 ${provider.name} API Key`, `Add a ${provider.name} API key in Settings first`));
  const model = settings.models?.[provider.id] || settings.model || provider.defaultModel;
  const prompt = buildDocumentExtractPrompt(fileName, text, settings.language);
  const request = buildProviderRequest({ provider, apiKey, model, prompt, schema: ORGANIZE_SCHEMA, image });
  const res = await fetch(request.url, request.options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const entries = parseOrganizedEntries(extractProviderText(provider, data));
  if (image) return entries;
  const verified = verifiedDocumentEntries(entries, text);
  if (entries.length && !verified.length) {
    throw new Error(localizedError(
      settings,
      "AI 返回的内容无法在文件原文中验证，已拒绝保存",
      "The AI response could not be verified against the source file, so it was not saved.",
    ));
  }
  return verified;
}

globalThis.AI_PROVIDERS = AI_PROVIDERS;
globalThis.buildPrompt = buildPrompt;
globalThis.buildProviderRequest = buildProviderRequest;
globalThis.buildOpenAICompatibleRequest = buildOpenAICompatibleRequest;
globalThis.buildGeminiRequest = buildGeminiRequest;
globalThis.extractProviderText = extractProviderText;
globalThis.parseOrganizedEntries = parseOrganizedEntries;
globalThis.buildOrganizePrompt = buildOrganizePrompt;
globalThis.buildDocumentExtractPrompt = buildDocumentExtractPrompt;
globalThis.verifiedDocumentEntries = verifiedDocumentEntries;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "aiMap") {
    aiMap(msg.fields, msg.entries, msg.page)
      .then((assignments) => sendResponse({ ok: true, assignments }))
      .catch((e) => sendResponse({ ok: false, error: e.message || String(e) }));
    return true; // 异步响应
  }
  if (msg.action === "aiOrganizeEntries") {
    aiOrganizeEntries(msg.entries)
      .then((entries) => sendResponse({ ok: true, entries }))
      .catch((e) => sendResponse({ ok: false, error: e.message || String(e) }));
    return true;
  }
  if (msg.action === "aiExtractDocument") {
    aiExtractDocument(msg.fileName, msg.text, msg.image)
      .then((entries) => sendResponse({ ok: true, entries }))
      .catch((e) => sendResponse({ ok: false, error: e.message || String(e) }));
    return true;
  }
});

// ---------- 工具栏图标跟随系统深浅色 ----------
// 深色工具栏配白色图标，浅色配黑色。service worker 里没有 matchMedia，
// 用 offscreen document 监听 prefers-color-scheme 并回报。
const TOOLBAR_ICONS = {
  light: { 16: "icons/icon16.png", 48: "icons/icon48.png", 128: "icons/icon128.png" },
  dark: { 16: "icons/icon16-white.png", 48: "icons/icon48-white.png", 128: "icons/icon128-white.png" },
};

function applyToolbarIcon(dark) {
  chrome.action?.setIcon({ path: TOOLBAR_ICONS[dark ? "dark" : "light"] })?.catch?.(() => {});
}

async function ensureThemeWatcher() {
  if (!chrome.offscreen) return; // 旧版 Chrome（<109）：保持默认黑色图标
  try {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["MATCH_MEDIA"],
      justification: "监听系统深浅色以切换工具栏图标颜色",
    });
  } catch (e) {
    // 并发创建时的 "single offscreen document" 报错可忽略
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "systemThemeChanged") applyToolbarIcon(Boolean(msg.dark));
});

chrome.runtime.onInstalled?.addListener(ensureThemeWatcher);
chrome.runtime.onStartup?.addListener(ensureThemeWatcher);
ensureThemeWatcher();
