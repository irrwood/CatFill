# Side Panel Field Organizer Design

## Goal

Build a Chrome Side Panel workspace for CatFill that organizes saved form fields into readable groups, merges Chinese/English aliases, and lets the user apply AI-suggested cleanup to the active profile.

## Product Split

- Popup remains the fast surface: scan, local fill, AI fill, settings, and opening the side panel.
- Side Panel becomes the management surface: review grouped fields, inspect aliases, run AI organization, and confirm saved cleanup.

## Data Model

Existing entries stay compatible. Organized entries may add:

```js
{
  category: "联系方式",
  canonicalKey: "邮箱",
  aliases: ["email", "电子邮件", "e-mail"],
  signals: { label: "邮箱", name: "email" },
  value: "hello@example.com"
}
```

Older entries without these properties render normally and can be grouped by deterministic local synonyms.

## UI Direction

Use the supplied Family style reference at Chrome extension density: cream canvas, white inset-border cards, black pill primary action, orange/blue/green category accents, and minimal shadows.

## Behavior

1. Side panel loads `profiles` and `activeProfileId` from `chrome.storage.local`.
2. Entries are grouped locally using a built-in synonym dictionary.
3. `AI 整理` sends active profile entries to the configured AI provider through the service worker.
4. AI returns organized entries, displayed as a pending suggestion.
5. User clicks `确认保存` to replace active profile entries with the organized entries.

## Error Handling

- Missing API key uses the existing provider-specific settings error.
- Invalid AI JSON returns a status message and leaves stored entries unchanged.
- Empty profiles show an empty state.

## Testing

- Node tests cover deterministic synonym grouping and duplicate merge behavior.
- Existing background tests continue to cover provider request construction.
- Syntax checks cover all extension scripts.
