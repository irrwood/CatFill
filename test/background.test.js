const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadBackground() {
  const code = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
  const context = {
    console,
    fetch,
    URL,
    chrome: {
      storage: { local: { get: async () => ({ settings: {} }) } },
      runtime: { onMessage: { addListener() {} } },
    },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

test("provider registry includes DeepSeek and mainstream APIs", () => {
  const bg = loadBackground();

  assert.equal(bg.AI_PROVIDERS.deepseek.defaultModel, "deepseek-chat");
  assert.equal(bg.AI_PROVIDERS.openai.defaultModel, "gpt-4o-mini");
  assert.equal(bg.AI_PROVIDERS.anthropic.defaultModel, "claude-opus-4-8");
  assert.equal(bg.AI_PROVIDERS.gemini.defaultModel, "gemini-2.5-flash");
  assert.equal(bg.AI_PROVIDERS.openrouter.defaultModel, "openai/gpt-4o-mini");
  assert.equal(bg.AI_PROVIDERS.groq.defaultModel, "llama-3.3-70b-versatile");
  assert.equal(bg.AI_PROVIDERS.mistral.defaultModel, "mistral-large-latest");
});

test("AI fill prompt requires full semantic alignment before reusing a choice answer", () => {
  const bg = loadBackground();
  const prompt = bg.buildPrompt(
    [{ index: 0, type: "radio", signals: { question: "Are you authorized to work?" } }],
    [{
      canonicalKey: "Will you require visa sponsorship?",
      signals: { question: "Will you require visa sponsorship?" },
      choice: { value: "yes", text: "Yes" },
      value: "yes",
    }],
  );

  assert.match(prompt, /对象、动作\/关系、时间条件、范围\/地点\/雇主、肯定或否定方向/);
  assert.match(prompt, /答案只属于它的 sourceQuestion/);
  assert.match(prompt, /语义完全对齐/);
});

test("OpenAI-compatible providers build chat completions JSON requests", () => {
  const bg = loadBackground();
  const request = bg.buildOpenAICompatibleRequest({
    provider: bg.AI_PROVIDERS.deepseek,
    apiKey: "sk-test",
    model: "deepseek-chat",
    prompt: "返回 JSON",
  });

  assert.equal(request.url, "https://api.deepseek.com/chat/completions");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.authorization, "Bearer sk-test");
  const body = JSON.parse(request.options.body);
  assert.equal(body.model, "deepseek-chat");
  assert.equal(body.response_format.type, "json_object");
  assert.equal(body.messages[0].role, "user");
});

test("Gemini provider builds generateContent request and extracts JSON", () => {
  const bg = loadBackground();
  const request = bg.buildGeminiRequest({
    provider: bg.AI_PROVIDERS.gemini,
    apiKey: "gm-test",
    model: "gemini-2.5-flash",
    prompt: "返回 JSON",
  });

  assert.equal(
    request.url,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gm-test",
  );
  const body = JSON.parse(request.options.body);
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.equal(body.contents[0].parts[0].text, "返回 JSON");

  const text = bg.extractProviderText(bg.AI_PROVIDERS.gemini, {
    candidates: [{ content: { parts: [{ text: "{\"assignments\":[]}" }] } }],
  });
  assert.equal(text, "{\"assignments\":[]}");
});

test("vision extraction requests use each provider's image input format", () => {
  const bg = loadBackground();
  const image = { mimeType: "image/png", data: "aGVsbG8=" };

  const anthropic = bg.buildProviderRequest({
    provider: bg.AI_PROVIDERS.anthropic,
    apiKey: "sk-test",
    model: "claude-sonnet-4-5",
    prompt: "提取资料",
    image,
  });
  const anthropicBody = JSON.parse(anthropic.options.body);
  assert.equal(anthropicBody.messages[0].content[0].type, "image");
  assert.equal(anthropicBody.messages[0].content[0].source.media_type, "image/png");

  const openai = bg.buildOpenAICompatibleRequest({
    provider: bg.AI_PROVIDERS.openai,
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    prompt: "提取资料",
    image,
  });
  const openaiBody = JSON.parse(openai.options.body);
  assert.equal(openaiBody.messages[0].content[1].type, "image_url");
  assert.equal(openaiBody.messages[0].content[1].image_url.url, "data:image/png;base64,aGVsbG8=");

  const gemini = bg.buildGeminiRequest({
    provider: bg.AI_PROVIDERS.gemini,
    apiKey: "gm-test",
    model: "gemini-2.5-flash",
    prompt: "提取资料",
    image,
  });
  const geminiBody = JSON.parse(gemini.options.body);
  assert.equal(geminiBody.contents[0].parts[1].inline_data.mime_type, "image/png");
  assert.equal(geminiBody.contents[0].parts[1].inline_data.data, "aGVsbG8=");
});

test("parseOrganizedEntries keeps organized field metadata", () => {
  const bg = loadBackground();
  const entries = bg.parseOrganizedEntries(`{
    "entries": [
      {
        "category": "联系方式",
        "canonicalKey": "邮箱",
        "aliases": ["email", "电子邮件"],
        "signals": { "label": "Email", "name": "email", "note": "Use work email only" },
        "choice": { "value": "email-home", "text": "个人邮箱", "index": 1 },
        "options": [{ "value": "email-home", "text": "个人邮箱" }],
        "value": "hi@example.com"
      }
    ]
  }`);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].category, "联系方式");
  assert.equal(entries[0].canonicalKey, "邮箱");
  assert.equal(entries[0].aliases[1], "电子邮件");
  assert.equal(entries[0].signals.name, "email");
  assert.equal(entries[0].signals.note, "Use work email only");
  assert.equal(entries[0].choice.text, "个人邮箱");
  assert.equal(entries[0].options[0].value, "email-home");
  assert.equal(entries[0].value, "hi@example.com");
});

test("document extraction prompt limits AI to explicit form-ready data", () => {
  const bg = loadBackground();
  const prompt = bg.buildDocumentExtractPrompt("resume.pdf", "Qian Zhao\nqian@example.com");

  assert.match(prompt, /resume\.pdf/);
  assert.match(prompt, /只提取文件中明确出现的事实/);
  assert.match(prompt, /不要提取密码、银行卡、身份证号码/);
  assert.match(prompt, /Qian Zhao/);
});

test("English organizer prompts keep categories stable but request English field titles", () => {
  const bg = loadBackground();
  const prompt = bg.buildOrganizePrompt([], "en");

  assert.match(prompt, /Output canonicalKey and aliases in clear English/);
  assert.match(prompt, /Chinese category values/);
});

test("document extraction rejects values that do not exist in the source text", () => {
  const bg = loadBackground();
  const entries = [
    { canonicalKey: "邮箱", value: "john.smith@email.com" },
    { canonicalKey: "姓名", value: "Qian Zhao" },
  ];

  const verified = bg.verifiedDocumentEntries(entries, "Qian Zhao\nqian.zhao@outlook.com");

  assert.equal(verified.length, 1);
  assert.equal(verified[0].canonicalKey, "姓名");
});

test("parseOrganizedEntries falls back to question when title drifts to another topic", () => {
  const bg = loadBackground();
  const question = "Will you now or in the future require visa sponsorship for employment with Miro?";
  const entries = bg.parseOrganizedEntries(`{
    "entries": [
      {
        "category": "其他",
        "canonicalKey": "是否愿意被联系",
        "aliases": ["visa sponsorship"],
        "signals": {
          "question": "${question}",
          "name": "visa_sponsorship"
        },
        "choice": { "value": "yes", "text": "Yes", "index": 1 },
        "value": "yes"
      }
    ]
  }`);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].category, "其他");
  assert.equal(entries[0].canonicalKey, question);
  assert.equal(entries[0].choice.text, "Yes");
});

test("parseOrganizedEntries falls back to full question when title loses meaning", () => {
  const bg = loadBackground();
  const question = "Do you identify as a member of the LGBTQ+ community?";
  const entries = bg.parseOrganizedEntries(`{
    "entries": [
      {
        "category": "其他",
        "canonicalKey": "身份信息",
        "aliases": ["demographic_lgbtq"],
        "signals": {
          "question": "${question}",
          "name": "demographic_lgbtq"
        },
        "choice": { "value": "no", "text": "No", "index": 2 },
        "value": "no"
      }
    ]
  }`);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].canonicalKey, question);
  assert.equal(entries[0].choice.text, "No");
});

test("parseOrganizedEntries rejects vague confirmation titles for full questions", () => {
  const bg = loadBackground();
  const question = "Are you legally authorized to work in the country where this role is based?";
  const entries = bg.parseOrganizedEntries(`{
    "entries": [
      {
        "category": "其他",
        "canonicalKey": "是否确认？",
        "aliases": [],
        "signals": {
          "question": "${question}",
          "name": "work_authorization"
        },
        "choice": { "value": "yes", "text": "Yes", "index": 1 },
        "value": "yes"
      }
    ]
  }`);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].canonicalKey, question);
  assert.equal(entries[0].choice.text, "Yes");
});
