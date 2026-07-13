# CatFill 技术方案与开发计划

> 本文档面向接手开发的工程师/AI。读完本文 + 现有代码即可继续开发，无需其他上下文。
>
> UI/UX 升级请优先参考 [`docs/ux-upgrade-plan.md`](docs/ux-upgrade-plan.md)。该计划以用户旅程为主线，包含目标信息架构、文案规范、实施优先级和验收标准。

## 1. 项目目标

Chrome 插件（Manifest V3），实现：

1. **扫描保存**：把用户在网页表单里填过的内容，连同字段特征一起存为"资料条目"；
2. **多联系人**：多套独立资料（如"自己 / 公司 / 家人"），可切换；
3. **一键填充**：本地特征匹配，不联网，瞬间完成；
4. **AI 智能填充**：本地匹配搞不定时，调用户选择的 AI API（DeepSeek / Claude / OpenAI / Gemini / OpenRouter / Groq / Mistral）让大模型看字段列表 + 资料，返回字段→值映射（不是逐步操作浏览器的 computer use，而是一次结构化推理，快且便宜）。
5. **字段整理侧栏**：用 Chrome Side Panel 管理当前联系人资料，按类别整理字段，并用 AI 合并中英文同义字段。
6. **资料编辑**：侧边栏支持修改字段标题、分类、值、别名，以及删除字段。

设计原则：**无构建步骤**（纯 vanilla JS，直接"加载已解压的扩展程序"可用）、**本地优先**（AI 是可选兜底）、**密码框永不碰**。

## 2. 现状（v0.2.13，已完成并可用）

| 文件 | 职责 | 状态 |
|---|---|---|
| `manifest.json` | MV3 配置；权限 `storage` `activeTab` `scripting` `sidePanel`；host 包含各 AI API 域名 | ✅ |
| `content.js` | 页面内扫描/填充。按需注入（非常驻），`window.__catfillLoaded` 防重复注册 | ✅ |
| `popup.html/css/js` | 面板 UI：联系人管理、三个动作按钮、资料列表增删、设置页 | ✅ |
| `sidepanel.html/css/js` | Chrome Side Panel 字段整理工作台 | ✅ |
| `fieldOrganizer.js` | 本地字段归类、同义词合并、分组渲染 helper | ✅ |
| `background.js` | Service worker，只做一件事：调所选 AI API 做字段映射 | ✅ |
| `README.md` | 用户向安装使用说明 | ✅ |

所有 JS 已通过 `node --check`，manifest 已通过 JSON 校验。**尚未在真实 Chrome 中端到端测试**——接手后第一件事应该是手动跑一遍（见 §9 测试）。

## 3. 数据模型（`chrome.storage.local`）

```js
{
  profiles: {
    "<uuid>": {
      name: "默认",                    // 联系人显示名
      entries: [                       // 资料条目数组
        {
          category: "联系方式",         // 可选，整理后增加
          canonicalKey: "邮箱",         // 可选，整理后增加
          aliases: ["email", "电子邮件"], // 可选，整理后增加
          choice: { value: "CN", text: "中国", index: 2 }, // 可选，select/radio/checkbox 的选中项
          options: [{ value: "CN", text: "中国" }], // 可选，select 的选项列表
          signals: {                   // 字段特征，用于匹配（全部 string，可为空串）
            autocomplete: "email",
            name: "user_email",
            id: "email-input",
            placeholder: "请输入邮箱",
            label: "电子邮箱",          // 截断到 120 字符
            ariaLabel: ""
          },
          value: "xx@example.com"      // 截断到 500 字符
        }
      ]
    }
  },
  activeProfileId: "<uuid>",
  settings: {
    provider: "deepseek",              // 当前 AI 供应商，默认兼容旧配置为 anthropic
    apiKeys: { deepseek: "sk-..." },    // 各供应商 API Key，只存本机
    models: { deepseek: "deepseek-chat" },
    aiLearnEnabled: false,             // 学习时是否先过一遍 AI 整理
    aiInstruction: ""                  // 用户自定义填表指令，追加进 aiMap 的 prompt
  }
}
```

- 条目去重键：`signalKey(signals)` = 六个信号 lowercase+trim 后用 `|` 连接（见 `popup.js`）。再次扫描同一字段时更新 value 而非新增。
- 手动添加的条目只有 `label` 信号有值。

## 4. 消息协议

### popup → content（先 `chrome.scripting.executeScript` 注入 `content.js`，再 `chrome.tabs.sendMessage`）

| action | 请求 payload | 响应 |
|---|---|---|
| `scan` | — | `{ ok, fields: Field[], page: {url, title, heading} }` |
| `fill` | `{ entries }` （当前联系人的条目） | `{ ok, filled, total }` |
| `applyAssignments` | `{ assignments: [{index, value, why?}] }` | `{ ok, filled, total }` |

`Field` 结构：`{ index, type, signals: {...}, value, options?: [{value, text}] }`（options 仅 select/custom-choice，截断 50 项）。`type` 额外可能是 `richtext`（contenteditable）和 `custom-choice`（无原生控件的按钮组）。`page` 是页面级上下文，传给 AI 审题用。

**重要不变量**：content.js 里 `scan()` 每次重建 `lastElements` 数组，`Field.index` 与 `lastElements` 下标一一对应。`applyAssignments` 在应用前会重新 `scan()`，所以 AI 往返期间若 DOM 大变，索引可能错位（已知限制，见 §8）。

### popup → background（`chrome.runtime.sendMessage`）

| action | 请求 | 响应 |
|---|---|---|
| `aiMap` | `{ fields, entries, page }` | `{ ok, assignments: [{index, why, value}] }` 或 `{ ok: false, error }` |
| `aiOrganizeEntries` | `{ entries }` | `{ ok, entries: OrganizedEntry[] }` 或 `{ ok: false, error }` |

`assignments[].why` 是模型对题意的理解（先审题再作答，提高准确率），填充时忽略。

background 的 listener 返回 `true` 表示异步 sendResponse。

## 5. 扫描与填充算法（content.js）

### 扫描
- 所有查询走 `deepQueryAll()`：递归穿透 open shadow root；label/aria 引用用 `rootOf(el)`（元素所在 root）解析，不是 `document`；
- 原生控件：`input, textarea, select`，排除 `disabled`、`readOnly`、type ∈ {hidden, password, submit, button, reset, image}、不可见；
- 富文本：`[contenteditable]`、`[role="textbox"]` → `type: "richtext"`，value 取 `innerText`；
- 自定义按钮组（`customChoiceGroups()`）：无原生控件的 2~8 个按钮/role=radio 选项 + 能提取到题目文字 → `type: "custom-choice"`；
- label 提取顺序：`label[for=id]` → 祖先 `<label>` → `aria-labelledby`；
- **question（题目文字）提取顺序**：`aria-labelledby` → fieldset legend → 常见分组容器的 heading → 表格 `th` / `dl dt` → radio/checkbox 父级直接文本 → **通用兜底 `nearestPrecedingText()`**（沿祖先向上最多 6 层，每层向前找最多 4 个兄弟里最近的一段 2~300 字符可见纯文本——绝大多数表单的题目都在控件前面的兄弟节点里）。

### 本地匹配打分（`score()` + 同义词组）
- 权重表 `WEIGHTS = { autocomplete: 5, name: 4, id: 3, label: 3, question: 3, placeholder: 2, ariaLabel: 2, note: 1 }`；
- 条目侧参与比较的文本 = 原始 signals **+ AI 整理出的 `canonicalKey`（权重 4）和 `aliases`（权重 3）**（见 `entryTexts()`）——整理后 signals 是机器串的条目也能按人类可读标题匹配；
- 两两比较（归一化后）：完全相等 `+min(w1,w2)*2`；包含关系 `+min(w1,w2)`，**被包含文本 ≥6 字符时视同精确 `×2`**（题目原文之间的包含是强信号）；
- **同义词组加分 +6**：词典来自 `fieldOrganizer.FIELD_DEFINITIONS`，双方文本命中同一组即加分。命中方式：整串精确、**token 切分精确**（`user_email`/`tbl_city`/`companyName` 按 `_ - 空格 camelCase` 切开）、**中文别名（≥2 字）包含**（"所在城市"⊃"城市"）、autocomplete 标准值映射（`AUTOCOMPLETE_TO_KEY`）。英文别名不做包含匹配（`name` ⊂ `companyname` 会误伤）；
- **词典是两层的**（2026-07-11 起）：① `FIELD_DEFINITIONS` 字段名同义（~40 组：证件/签证/教育/联系/工作等，"护照号 ↔ Passport No. ↔ Travel Document Number"）；② `VALUE_SYNONYM_GROUPS` **选项值同义**（"护照 ↔ Ordinary Passport ↔ Travel Document"、"男 ↔ Male"、"本科 ↔ Bachelor's degree"），由 `valueSynonyms(norm值)` 查询。选项匹配（select/radio/custom-choice/custom-select）统一走 `bestCandidateMatch()` 分档打分：原值精确 > 同义词精确 > 原值包含 > 同义词包含；包含匹配要求 ≥2 字符且带**否定前缀防护**（"本科"不会匹配"非本科"，见 `containsClean`）。填充后的 `valueWasApplied` 验证同样认同义词，否则跨语言选中会被误判失败不计数；
- 每个字段取得分最高的条目，**阈值 `bestScore >= 4`** 才填（宁缺勿错）。允许多个字段命中同一条目；
- **姓名探测（fieldOrganizer）必须逐信号精确匹配**：中文单字正则（`/名/`）在拼接串上会把"公司名""职位名称"误判成 first name——这是修过的真 bug，别改回去。

### 填充（`applyValue()`）
- 文本类（`setNativeValue`）：`focus()` → 原型 native value setter（绕过 React 受控组件） → 重置 `el._valueTracker`（不重置 React onChange 不触发） → dispatch `InputEvent("input")` + `change` → `blur()`；
- richtext（`applyRichText`）：`focus()` → `execCommand("selectAll") + execCommand("insertText")`（走浏览器原生输入路径，ProseMirror/Quill/Slate 都认），失败则 `textContent` + InputEvent 兜底；
- checkbox：value 归一到布尔（`true/1/yes/是/on`），用 `.click()` 切换；
- radio：在**同一 root**（支持 shadow DOM）的同 name 组里按 value 或 label 匹配后 `.click()`；
- select：按 option 的 value 或文本匹配（归一化比较），native setter 赋值；
- custom-choice：候选值与选项文字归一化后相等/包含匹配，`click()` + input/change；
- **注意**：候选值只用 `entry.value / choice.value / choice.text`，**绝不能把 `aliases` 当候选值**（aliases 是字段名不是值，会选错选项）。

### 值同义词典（2026-07-11 新增）
- 词典 `VALUE_SYNONYM_GROUPS` 在 `fieldOrganizer.js`，解决"资料存「护照」、选项写 Ordinary Passport / Travel Document"这类跨语言/跨写法选择：护照/身份证/中国/性别/是否/婚姻/学历（本科硕士博士大专）/民族等 15 组，**每组必须填表意图严格等价，宁缺勿滥**；
- select / radio / custom-choice / custom-select 四条选项匹配路径统一走 `bestCandidateMatch()`，分档：原值精确(4) > 同义词精确(3) > 原值包含(2) > 同义词包含(1)；包含匹配要求双方 ≥2 字符（"m"/"f" 只允许精确），且有否定前缀防护（`containsClean`："本科"不会匹配"非本科"）；
- 可搜索弹层下拉：先按原值打字过滤，若过滤后选项清零（资料中文、选项英文），自动清空搜索词恢复全量再按同义词挑；
- **填后校验（`valueWasApplied`）的 select/radio 分支必须 value 和显示文本都比对**——`selected.value || selected.textContent` 的短路写法会让 "cn" 挡住 "China (+86)"，导致填成功却计数为 0（修过的真 bug）；
- 调试：`debugMatch` action（popup 不用，开发用）返回每个字段的最佳条目与得分。

## 6. 多供应商 AI API 集成（background.js）

- `AI_PROVIDERS` 维护供应商配置：Anthropic Claude、DeepSeek、OpenAI、Gemini、OpenRouter、Groq、Mistral AI；
- Anthropic：`POST https://api.anthropic.com/v1/messages`；
- OpenAI 兼容供应商：`/chat/completions`，使用 bearer token、`messages` 和 `response_format: { type: "json_object" }`；
- Gemini：`generateContent`，API Key 放 query string，`generationConfig.responseMimeType = "application/json"`；
- Prompt（`buildPrompt(fields, entries, page, instruction)`，中文，单条 user 消息）：
  - 带页面上下文（title/heading/url），字段按页面顺序排列；
  - **两步式**：先审题（把对题意的理解写进 `why`）再作答——让模型先输出理解能显著提高选择题/格式题的准确率；
  - **三类策略**：事实类必须来自资料（可做格式转换，date 输入用 YYYY-MM-DD，电话格式以 note 为准）；选择类做语义匹配（"中国"↔"China (+86)"），value 必须是 options 原文；开放问答类只有资料里有素材时才基于素材组织回答，绝不虚构；
  - `settings.aiInstruction`（侧栏设置的"填表补充指令"）追加在规则后，声明与默认规则冲突时以用户指令为准；
  - 资料侧发送的是清洗后的 `key/aliases/question/value`，不发机器串 signals，减少模型噪音；
- 错误处理：非 2xx 抛 `API {status}: {body 前 300 字}`；`stop_reason === "refusal"` 单独报错；content 里找第一个 `text` block 解析。
- 解析：不同供应商先抽取文本，再统一 `JSON.parse`，支持去掉常见 markdown code fence。
- **标题清洗（`cleanTitle`）只做通用规则**：标题丢失题目语义→退回题目原文；标题是机器串→找人类可读兜底。**禁止按主题硬编码改写**（如 "visa sponsorship→固定中文标题"）——那会在没见过的表单上把对的标题改错，历史上正是"标题不对"的成因之一。

### AI 整理

- `sidepanel.js` 发送 `aiOrganizeEntries` 给 background；
- background 使用同一套 provider 选择、API Key、模型配置；
- prompt 要求只返回 `{ entries: [...] }`，每条包含 `category`、`canonicalKey`、`aliases`、`signals`、`value`；
- side panel 收到结果后先作为 pending suggestion 展示，用户点击「确认保存」才替换当前联系人资料。

## 7. 编码约定

- 纯 vanilla JS（ES2020+），无 npm、无打包、无框架；改完直接在 `chrome://extensions` 点刷新即可生效；
- 中文 UI 与注释；注释只写"为什么"，不写"做了什么"；
- 新增 popup↔content↔background 消息时，在本文件 §4 的表里同步登记。

## 8. 已知限制（按修复优先级排序）

1. closed shadow root 穿不透（open 的已支持）；
2. 弹层日期框走的是"临时解除 readonly 直写 + change 事件"，多数组件接受；严格校验"必须点日历"的组件可能不认；
3. custom-select 的弹层选项匹配依赖 `[role="option"]` 和主流库的 class/id 形态（见 `POPUP_OPTION_SELECTOR`），完全自绘的下拉可能匹配不到；
4. AI 填充只作用于字段最多的那个 frame（scan 挑单帧）；
5. API Key 明文存 storage.local（本机风险低，但可加密）。

已解决（2026-07-09）：open shadow DOM 穿透、contenteditable 富文本、React 受控组件（_valueTracker）、iframe（popup 端 allFrames 注入）、**弹层式下拉框**（combobox 检测 + 打开→打字过滤→等渲染→选中的异步交互）、**readonly 日期框**（临时解除直写）、**AI 往返 index 错位**（保留扫描时的元素引用，元素失联时按特征指纹重扫找回）、**同义词典**（token 切分 + 中文包含 + autocomplete 映射）。

### 冒烟测试方法（已验证 14/14 全对）

`python3 -m http.server 8642` 开在项目根（或用 `.claude/launch.json` 的 fixture 配置），打开 `/test/fixture.html`，控制台里注入：

```js
window.chrome = { runtime: { onMessage: { addListener: (fn) => { window.__handler = fn; } } } };
// 依次加载 /fieldOrganizer.js 和 /content.js（记得加 ?v=N 破缓存！http.server 无 no-cache 头）
// 然后 window.__handler({action:"scan"}, null, console.log) / {action:"fill", entries} 直接驱动
```

fixture 覆盖：label 三种写法、就近文本题目、表格 th、note 格式要求、select 语义匹配、radio 完整问题、自定义按钮组、可搜索弹层下拉、readonly 日期框、contenteditable、React 受控组件、shadow DOM。页面底部 #log 实时打印事件，可确认框架事件真的触发了。

## 9. 测试方案

- **自动化**：`node --test test/background.test.js` 覆盖 AI provider 注册、OpenAI 兼容请求构造、Gemini 请求构造与响应文本抽取；
- **字段整理**：`node --test test/fieldOrganizer.test.js` 覆盖中英文同义字段合并、未知字段归到「其他」；
- **语法/配置检查**：`node --check background.js && node --check popup.js && node --check content.js`，`python3 -m json.tool manifest.json`；
- **手动冒烟**：写一个 `test/fixture.html`（含 text/email/tel/select/radio/checkbox/textarea、label 的三种写法、一个 React 受控组件模拟），本地开 `python3 -m http.server` 验证三个按钮全流程；
- **自动化（可选）**：Puppeteer 带 `--load-extension` 启动，对 fixture 页断言扫描字段数、填充后各控件值、事件是否触发（监听 input 事件计数）；
- AI 部分用 mock：给 background 加一个 `settings.mockAssignments` 旁路，测试时跳过真实 API。

## 10. 路线图（每项含实现要点，可独立交付）

> 2026-07-11 起优先看 [docs/enhancements.md](docs/enhancements.md)：开源借力调研（Firefox 字段正则词典 / PDF 版面重建 / mammoth.js / tesseract.js，含许可证结论与集成要点）+ 七条产品级改进建议。其中"Firefox 词典"取代下面第 6 条同义词典的手写方案。
> 申根签证表格已适配（37 字段词典映射 + 选项值同义词），见 [docs/schengen.md](docs/schengen.md)。

### P0 — 让核心场景更可靠

1. **iframe 支持**
   - `chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["content.js"] })`；
   - `tabs.sendMessage` 改为不指定 frameId 广播、或对每个 frame 单独收发；`Field.index` 需要变成 `{frameId, index}` 复合键，`aiMap` 的 assignments 同步调整；popup 里汇总各 frame 的结果再显示。
2. **Shadow DOM 穿透**
   - 扫描时递归：遇到有 `shadowRoot`（open）的元素继续 `querySelectorAll`；封装 `deepQueryAll(root, selector)` 替换现有查询；label 查找也要限定在同一 root 内。
3. **测试基建**（§9 的 fixture + 冒烟清单）。
4. **图标**：16/48/128 png，manifest 加 `icons` 和 `action.default_icon`。

### P1 — 匹配质量

5. **按域名记住映射（site memory）**
   - 新增存储 `siteBindings: { [origin]: { [signalKey]: entryIndexOrEntryId } }`；
   - 填充成功（或 AI 填充成功）后写入绑定；下次同域名优先用绑定、跳过打分；
   - 需要给 entry 加稳定 `id`（uuid），不能再用数组下标。
6. **同义词/标准字段词典**
   - 内置一张小词典：`email: [邮箱, 电子邮件, e-mail, mail]`、`phone/tel/mobile/手机/电话/联系方式`、`name/姓名/full name`、`address/地址` 等 20~30 组；
   - 打分时若双方信号命中同一组，加固定分（建议 +6，等效强匹配）；
   - autocomplete 标准值（[HTML spec](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)）直接映射到词典组。
7. **AI 结果回灌**：AI 填充返回的 `(字段 signals, value)` 若 value 来自某条目，自动写 site memory，下次本地就能匹配 —— AI 只需要每个网站调用一次。

### P2 — 体验

8. **页内浮动提示**：content script 检测到 ≥3 个可填字段且当前联系人有资料时，页面右下角显示小气泡"检测到表单，一键填充？"（需要把 content script 改为 manifest `content_scripts` 常驻 + `<all_urls>` 权限，或保持 activeTab 只在点过图标的页面出现——建议后者，权限提示更友好）。
9. **右键菜单**：`contextMenus` 权限，"用 CatFill 填充此表单"、"保存此表单到 …（子菜单列联系人）"。
10. **导入/导出**：JSON 下载/上传按钮（`URL.createObjectURL` + `<input type=file>`），方便备份和换机。
11. **填充预览/撤销**：填充前高亮将要写入的字段（outline），气泡确认；记录旧值以支持一键撤销。
12. **快捷键**：manifest `commands`，默认 `Ctrl/Cmd+Shift+F` 触发一键填充（background 收 command → 对 active tab 走 fill 流程）。

### P3 — 安全与发布

13. **API Key 加密**：用 WebCrypto AES-GCM，密钥材料存 `chrome.storage.session` + 首次解锁口令（可选，成本高收益一般，排后）。
14. **敏感字段确认**：value 形如身份证/银行卡（正则检测）时，保存与填充前弹确认。
15. **Chrome Web Store 发布**：隐私政策页（说明 AI 模式的数据流向）、截图、打 zip；`activeTab` + 按需注入的设计正是为了过审时权限说明简单。
16. **Firefox 移植**（可选）：MV3 兼容层，主要差异是 `browser.*` namespace 和 service worker → event page。

## 11. 快速上手（接手者 checklist）

1. `chrome://extensions` → 开发者模式 → 加载 `catfill/` 目录；
2. 找任意注册页手填几个字段 → 点扩展 → 「扫描并保存」→ 面板里应出现条目；
3. 刷新页面 → 「一键填充」→ 字段应恢复；
4. ⚙️ 填 API Key → 换个不同写法的表单 → 「AI 智能填充」；
5. 改代码后回到 `chrome://extensions` 点该扩展的刷新按钮（popup/背景页都会重载；content script 因为是按需注入，刷新目标网页即可）。
