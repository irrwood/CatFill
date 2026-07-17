# Chrome Web Store Listing Draft

## Identity

- Name: CatFill: AI Form Autofill
- Version: 0.3.5
- Category: Productivity
- Single purpose: Save user-approved form information locally and fill similar web forms on the user's command.
- Privacy policy URL: Publish `PRIVACY.md` at a public HTTPS URL before submission. Replace this line with that final URL.

## Short Description

Autofill forms instantly using your saved information and optional AI. Your personal data stays private and stored locally.

## Detailed Description

CatFill 帮你把重复的网页填表工作留在自己的浏览器里。

- 学习当前网页中已填写的表单资料，并保存在本机。
- 在相似表单中一键本地匹配填充，支持文本、下拉、单选、多选和常见自定义控件。
- 用侧边栏整理字段，合并中英文同义字段，按联系人管理资料。
- 在招聘页面本地识别公司，并提供 LinkedIn 与 Glassdoor 查询入口。
- 可选连接你自己的 AI API，用于理解不规则字段、复杂选择题和格式要求。
- 可从 PDF、Excel、TXT 和图片中提取资料；PDF/Excel/TXT 先在本机解析，图片只会在你主动点击 AI 分析时发送给所选视觉模型。

CatFill 不要求账号，不运行开发者服务器。AI 功能完全可选，使用时由用户选择 API 提供商并输入自己的 API Key。

## Permission Justification

- `storage`: Store user-approved profiles and settings locally in Chrome.
- `activeTab`: Access only the tab where the user invokes CatFill to scan or fill a form.
- `scripting`: Inject the form scanner only after a user action.
- `sidePanel`: Provide the field-organizing workspace.
- Optional Glassdoor host access: Requested only after the user clicks Glassdoor, to resolve a company name to its public employer ID and overview page.
- AI host permissions: Send requests only to the AI provider endpoints selected and configured by the user.

## Privacy Practices Disclosure Draft

Complete the Chrome Web Store Privacy practices form accurately at submission time:

- Handles personal information and website content only to provide user-requested form saving, filling, organization, and AI features.
- Does not sell data, use data for advertising, or transfer data to the developer.
- Sends form/profile data, extracted file text, or user-selected images only to the AI provider selected by the user and only after a user action starts an AI feature.
- Stores user data locally in Chrome extension storage.

## Required Assets

- Store icon: `128 x 128` PNG (already in `icons/icon128.png`).
- At least one real product screenshot. Capture popup, side panel field organization, and an AI result preview with all personal data redacted.
- Promotional images and screenshots must show the actual extension, not mockups or unrelated marketing art.

## Submission Checklist

1. Replace the contact placeholder in `PRIVACY.md` and host it at a public HTTPS URL.
2. Resolve the API key and local-profile encryption release blocker in `RELEASE_CHECKLIST.md`.
3. Reload the extension and manually test learning, local fill, AI fill, AI organization, PDF, spreadsheet, and image analysis with a real configured API.
4. Run `scripts/package-extension.sh` and upload the generated ZIP in the Chrome Web Store Developer Dashboard.
5. Copy the listing text above, fill the privacy practices form accurately, upload redacted screenshots, then submit for review.
