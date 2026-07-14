# CatFill: AI Form Autofill

扫描并保存网页表单里填过的内容，下次遇到类似表单一键填充。支持多个联系人资料，可选接入 DeepSeek、Claude、OpenAI、Gemini 等 API 做 AI 智能填充。

## 安装

1. 打开 `chrome://extensions`
2. 右上角打开「开发者模式」
3. 点「加载已解压的扩展程序」，选择本目录（`catfill/`）

## 使用

1. **保存资料**：在任意网页手动填好一份表单（先别提交），点插件图标 →「学习本页已填内容」。字段的 label / name / placeholder 等特征会和值一起存下来；下拉框、单选框、复选框会额外保存选中的那一项；文件上传框会保存文件名、类型、大小等元信息。
2. **一键填充**：以后遇到类似表单，点「⚡ 一键填充（本地匹配）」。按字段特征做模糊匹配，文本和选项选择都能一键完成，完全本地运行、不联网。内置中英双语词典：字段名同义（护照号 ↔ Passport No. ↔ Travel Document Number，覆盖证件/签证/教育/联系/工作约 40 组）和选项值同义（护照 ↔ Ordinary Passport ↔ Travel Document、男 ↔ Male、本科 ↔ Bachelor's degree）——资料存中文、表单是英文也能直接选中。
3. **AI 智能填充**：本地匹配搞不定的复杂表单（字段名不规则、需要拆分/转换格式、下拉框选项等），点「🤖 AI 智能填充」。会把页面字段特征 + 当前联系人资料发给你在设置里选择的 AI 供应商，由模型决定每个字段填什么。
4. **字段整理侧栏**：点「🗂 打开字段整理侧栏」，在 Chrome Side Panel 里查看按类别归好的资料。可以直接修改字段标题、分类、值、别名，也可以删除不需要的字段。点「AI 整理」可让模型合并 `姓名/name/full name`、`邮箱/email/e-mail`、`手机/phone/mobile` 这类中英文重复字段，确认后保存。
5. **从文件提取资料**：在侧栏「添加资料」中选择 PDF、Excel、图片或 TXT 文件，点「AI 分析」。CatFill 会先在本机提取文字和表格，或将图片交给支持视觉输入的 AI，生成字段建议；结果会先出现在字段整理中，确认后才保存。支持带文字层的 PDF；扫描版 PDF 需要先做 OCR。Excel 支持 `.xlsx`、`.xls`、`.xlsm`、`.xlsb`、`.csv`，只读取单元格内容，不会执行宏。图片支持 JPG、PNG、WebP，需使用 Claude、OpenAI、Gemini 或其他视觉模型。
6. **多联系人**：顶部下拉切换，`＋` 新建（比如「自己」「公司」「家人」），每个联系人一套独立资料。
7. **中英文界面**：在字段整理侧栏的「设置 → 界面语言」选择中文或 English。首次使用时会跟随浏览器语言；切换不会翻译或改写已保存的资料值。
8. **夜间模式**：在字段整理侧栏的「设置 → 外观」选择跟随系统、浅色或夜间；选择会同时应用到 popup 和侧边栏。猫 logo 使用白底黑线的高对比固定图标，在深浅背景下都清晰可见。
9. **公司信息入口**：在招聘页面打开 popup 时，CatFill 会在本机根据招聘页的结构化数据、页面品牌和常见 ATS 地址识别招聘公司，并提供 LinkedIn 公司搜索与 Glassdoor 评价搜索入口。只有点击链接时才会打开对应网站；识别过程不上传页面内容。

## AI 填充配置

点右上角 ⚙️ 打开字段整理侧栏，在「AI 设置」里填写：

- **AI 供应商**：支持 Anthropic Claude、DeepSeek、OpenAI、Google Gemini、OpenRouter、Groq、Mistral AI。
- **API Key**：按所选供应商填写，只保存在本机 `chrome.storage.local`；不同供应商会分别保存。
- **模型**：每个供应商都有默认模型和候选模型，也可以手动输入兼容的模型名。
- **学习已填内容时使用 AI**：开启后，点「学习本页已填内容」会先扫描页面，再用 AI 提取更清楚的字段标题、合并中英文同义字段，并整理后保存。

隐私说明：AI 填充时，当前页面的表单字段特征（label、name 等）和所选联系人的全部资料会发送到你选择的 AI API；AI 整理时会发送当前联系人的已保存资料。PDF 与表格分析会在本机用 PDF.js 或 SheetJS 提取文字，只有提取出的文字会在你点「AI 分析」后发送给所选 AI API，原始文件不会上传。图片分析会把你主动选择的 JPG、PNG 或 WebP 图片发送给所选 AI API。本地匹配和本地侧栏分组则完全不联网。密码框（`type=password`）永远不会被扫描或填充。浏览器不允许扩展自动重新选择本地文件，所以文件上传框只能保存元信息并提示你手动选择对应文件。

## 目录结构

- `manifest.json` — MV3 配置
- `content.js` — 页面内扫描/填充（按需注入，activeTab 权限，不常驻）
- `companyDetector.js` — 本地识别招聘页面对应的公司
- `popup.html/css/js` — 面板 UI 与联系人管理
- `sidepanel.html/css/js` — Chrome Side Panel 字段整理工作台
- `fieldOrganizer.js` — 本地字段归类与中英文同义词合并
- `background.js` — 多供应商 AI API 调用（返回 字段→值 映射）
- `icons/` — 深浅背景通用的固定高对比图标，高清源图为 `icon-source.png`

## 开源与发布

CatFill 使用 Apache-2.0 许可证。第三方组件声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，隐私政策见 [PRIVACY.md](PRIVACY.md)，Chrome Web Store 发布材料见 [store/STORE_LISTING.md](store/STORE_LISTING.md)。
