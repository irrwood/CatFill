# CatFill Privacy Policy

Last updated: 2026-07-14

CatFill is a browser extension that helps users save form information and fill similar forms. This policy describes the data handled by the extension.

## Data Stored Locally

CatFill stores the following data in the user's Chrome extension storage on the user's device:

- Saved profiles and form values, including fields such as name, email, phone number, address, employment details, and answers the user chose to save.
- AI provider choice, model choice, and API keys entered by the user.
- File metadata for file inputs, such as a selected file name and size.

CatFill does not operate a developer-controlled server and does not transmit this locally stored data to the CatFill developer.

## Data Read From Web Pages

When the user explicitly clicks a CatFill action, the extension may read visible, fillable form fields and their labels, placeholders, options, and related instructions from the active tab. It does not read password fields. This information is used only to save a profile, match local data, or perform the user-requested fill action.

When the popup is opened on a recruitment page, CatFill may also read the page title, recruitment-page URL, site name, and published `JobPosting` organization data to identify the hiring company locally. This information is not uploaded. LinkedIn company search is opened only when the user clicks its research link. When the user clicks Glassdoor and grants the optional Glassdoor permission, CatFill sends the detected company name to Glassdoor's employer lookup endpoint to resolve its public employer ID and open the matching overview page. If no exact match is found, CatFill shows candidates or offers a Google search restricted to Glassdoor overview pages.

## Optional AI Features

AI features are optional. When the user configures an AI provider and explicitly starts AI fill, AI field organization, or AI file analysis, CatFill sends only the information required for that requested feature to the provider selected by the user:

- AI fill sends the current page's relevant form fields and the selected profile.
- AI organization sends the selected profile entries.
- PDF, text, and spreadsheet analysis first extracts text locally; only the extracted text is sent.
- Image analysis sends the user-selected image to the selected AI provider.

The applicable provider may be Anthropic, DeepSeek, OpenAI, Google Gemini, OpenRouter, Groq, or Mistral AI, depending on the user's settings. CatFill does not sell user data, use it for advertising, or allow CatFill staff to read it.

## Security And User Control

All AI API requests use HTTPS endpoints. Users can edit or delete saved fields in the CatFill side panel and can clear extension data through Chrome's extension settings. Users should avoid sending highly sensitive documents or images to an AI provider unless they understand that provider's data policy.

## Contact

Before public release, replace this section with a monitored project contact email or support URL.
