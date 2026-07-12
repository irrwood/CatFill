# 能力增强调研：可借力的开源项目与改进建议

> 2026-07-11 调研。背景：各功能可用但质量"差点意思"，尤其文件分析。
> 本文列出可直接引入的开源项目（含许可证结论）和自研改进项，按性价比排序。
> 项目本体是 Apache-2.0，无构建步骤（vendor 单文件的模式见 `vendor/pdfjs`、`vendor/sheetjs`）。

## 一、推荐动手顺序（结论先行）

| 顺序 | 事项 | 来源/方式 | 许可证 | 成本 | 收益 |
|---|---|---|---|---|---|
| 1 | 字段识别正则词典 | Firefox `HeuristicsRegExp.sys.mjs`，单文件 vendor | MPL-2.0（文件级，保留版权头即可，不传染） | ~半天 | 本地匹配命中率、字段命名质量立竿见影 |
| 2 | PDF 版面重建 | 自研，借鉴 OpenResume 算法（**不可抄代码**） | 自己写 | ~1 天 | 文件分析质量的根因修复 |
| 3 | .docx 支持 | mammoth.js（`mammoth.browser.js` 单文件） | BSD-2 ✓ | ~半天 | 覆盖最常见的简历格式 |
| 4 | 本地 OCR | tesseract.js + WASM/语言包 vendor | Apache-2.0 ✓ | 1~2 天 | 扫描 PDF/图片本地化；无视觉能力的模型也能用图片资料；隐私更好 |

## 二、逐项集成要点

### 1. Firefox 字段识别正则（最高性价比）

- 源文件：<https://searchfox.org/mozilla-central/source/toolkit/components/formautofill/shared/HeuristicsRegExp.sys.mjs>
- 是什么：Firefox 表单自动填充的字段分类正则，**融合 Chromium 同款词库（BSD-3 同源）**，姓名/地址/电话/邮箱/公司/职位等类型的几百条多语言模式，经两个浏览器十余年实战打磨。
- 怎么接：
  - vendor 到 `vendor/mozilla/heuristicsRegExp.js`，保留 MPL-2.0 版权头，`THIRD_PARTY_NOTICES.md` 登记；
  - 把它的 `字段类型 → 正则` 表转换成 `fieldOrganizer.FIELD_DEFINITIONS` 的超集：每个类型对应一个同义词组，`content.js` 的 `groupsForTexts()` 从"别名精确/包含匹配"升级为"正则匹配"；
  - 注意它的正则用 `(?i)` 风格和长 alternation，直接 `new RegExp(pattern, "iu")` 即可；对 `signals` 的每个值单独跑，不要跑拼接串（见 PLAN §5 的姓名误判教训）。
- 同类参考（只可看思路，不可抄码）：Bitwarden、KeePassXC-browser 的表单探测均为 GPL-3。

### 2. PDF 版面重建（文件分析的根因）

- 现状问题：`pdf.js getTextContent()` 的 items 直接拼接 → 多栏简历乱序、表格错位、标题与内容分不开，LLM 拿到的是"打碎的文字"。
- 借鉴对象：OpenResume 的 parser（<https://github.com/xitanggg/open-resume>，**AGPL-3.0，不能复制代码**，算法思路可自己实现）：
  1. 每个 text item 自带 `x/y/width/字体名/字号`；
  2. 按 `y` 聚类成行（容差约半个行高），行内按 `x` 排序；
  3. `x` 直方图检测分栏，分栏内重排阅读顺序；
  4. 加粗字体/更大字号/全大写 → 识别为段落标题，输出成 markdown 风格的结构化文本（`## 教育经历` + 条目行）；
  5. 行距突变 → 段落分隔。
- 落点：`sidepanel.js` 的 PDF 提取路径（现在直接拼 `item.str` 的地方），输出改为结构化文本再进 LLM prompt。
- 顺手改 prompt：告诉模型"文本已按版面重排，`##` 是原文的段落标题"。

### 3. mammoth.js（.docx）

- 仓库：<https://github.com/mwilliamson/mammoth.js>，BSD-2，浏览器可用（`mammoth.browser.js` 自带依赖）。
- 怎么接：vendor 单文件 → 侧栏文件选择器 accept 加 `.docx` → `mammoth.extractRawText({ arrayBuffer })`（或 `convertToHtml` 保留标题/列表结构，配合第 2 项的"结构化文本进 LLM"更好）→ 走现有"AI 分析"管线。
- 注意：不支持老 `.doc`（二进制格式），提示用户另存为 .docx 即可。

### 4. tesseract.js（本地 OCR）

- 仓库：<https://github.com/naptha/tesseract.js>，Apache-2.0；v6 起内存/性能明显改善。
- 价值：扫描版 PDF（现在完全不支持）和图片在**本机**识别成文字——图片不再必须发给视觉模型，DeepSeek 等纯文本模型也能处理；隐私叙事更强（可写进 PRIVACY.md）。
- MV3 集成要点（有坑）：
  - vendor `tesseract.min.js` + `worker.min.js` + `tesseract-core*.wasm` + 语言包（`eng` + `chi_sim`，中文包约 10MB）；
  - `workerPath/corePath/langPath` 全部指向 `chrome.runtime.getURL(...)`，禁止走 CDN；
  - manifest `content_security_policy.extension_pages` 需要 `wasm-unsafe-eval`；
  - 在侧栏页（DOM 环境）跑，不要在 service worker 里跑；
  - 参考范例：<https://github.com/jeromewu/tesseract.js-chrome-extension>；CSP 讨论：<https://github.com/naptha/tesseract.js/issues/601>。
  - 更轻量替代：<https://github.com/robertknight/tesseract-wasm>（BSD，体积小，但社区小）。
- 判断"扫描版 PDF"：`getTextContent()` 文字量近零但页面有大图 → 走 pdf.js 渲染页面到 canvas → OCR。

### 不建议引入

- **Nanobrowser / Skyvern / browser-use** 这类浏览器 agent 框架：截图+逐步操作，慢、贵、重，和"一次结构化推理"的定位不符。AI 填充的瓶颈在输入质量（题目提取、版面重建），不在推理方式。

## 三、其他改进建议（调研时顺带发现）

按"用户可感知程度"排序：

1. **把 AI 的 `why` 展示出来**（成本极低，差异化强）：AI 填充的每个 assignment 已经带 `why`（模型对题意的理解），现在填完就扔了。建议：填充后在 popup/侧栏列出"每个字段填了什么、为什么"，并在页面上给已填字段一个短暂的高亮 outline。用户对 AI 填充的信任感会完全不同，填错时也能一眼定位。
2. **多步表单自动跟进**：向导式表单（step 1 → 下一步 → step 2）现在每步都要手动点填充。用 `MutationObserver` 监听填充后的 DOM 变化，发现新出现的可填字段 ≥N 个时在页面角落弹小气泡"检测到新字段，继续填充？"。
3. **站点记忆（site memory）**：PLAN §10 P1 里已有——AI 填充成功后把 `字段指纹 → 条目` 的映射按域名存下来，同一网站第二次起全走本地零成本。配合第 1 项的 Firefox 词典，AI 的调用频率会大幅下降。
4. **AI 填充覆盖所有 iframe**：现在只填字段最多的那个 frame（PLAN §8 已知限制 4）。把各 frame 的字段带 `frameId` 合并送 AI，回来按 frame 分发。
5. **Chrome 内置本地模型（实验性）**：Chrome 的 Prompt API（Gemini Nano，本地推理）已对扩展开放试用。作为"免 API Key 的默认档"很契合隐私定位——但模型能力有限，只适合做字段映射这类窄任务，建议做成第八个 provider 试水而不是主力。
6. **导入/导出与加密**（PLAN P2/P3 已有）：换机备份 JSON 导出；API Key 与资料用 WebCrypto + 口令加密是发布到商店前的加分项。
7. **E2E 测试补全**：Puppeteer `--load-extension` 对 `test/fixture.html` 跑三个按钮断言——现在的注入式冒烟已经验证了 content.js，但 popup↔content↔background 的全链路还没有自动化覆盖。

## 四、许可证速查

| 项目 | 许可证 | 能否进本仓库 |
|---|---|---|
| Firefox HeuristicsRegExp | MPL-2.0 | ✓ 单文件 vendor，保留头部声明 |
| Chromium autofill 正则 | BSD-3 | ✓ |
| mammoth.js | BSD-2 | ✓ |
| tesseract.js | Apache-2.0 | ✓ |
| tesseract-wasm | BSD-2 | ✓ |
| OpenResume | AGPL-3.0 | ✗ 只借鉴算法，重新实现 |
| Bitwarden / KeePassXC-browser | GPL-3 | ✗ 只借鉴思路 |
