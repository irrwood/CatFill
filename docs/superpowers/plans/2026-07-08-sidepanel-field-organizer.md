# Side Panel Field Organizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Chrome Side Panel workspace for organizing saved CatFill fields with local synonym grouping and AI cleanup.

**Architecture:** Add a shared `fieldOrganizer.js` module that exposes pure functions on `globalThis` for tests, side panel rendering, and background validation. Add `sidepanel.html/css/js` for the management UI. Extend `background.js` with an `aiOrganizeEntries` message that reuses the existing provider infrastructure.

**Tech Stack:** Manifest V3, vanilla JavaScript, Chrome Side Panel API, `chrome.storage.local`, Node test runner.

---

### Task 1: Field Organizer Core

**Files:**
- Create: `fieldOrganizer.js`
- Create: `test/fieldOrganizer.test.js`

- [ ] Write failing tests for synonym grouping and duplicate merge.
- [ ] Run `node --test test/fieldOrganizer.test.js` and verify it fails because `organizeEntries` is missing.
- [ ] Implement `organizeEntries`, `entryDisplayKey`, and `groupOrganizedEntries`.
- [ ] Re-run the field organizer test and verify it passes.

### Task 2: Side Panel Shell

**Files:**
- Create: `sidepanel.html`
- Create: `sidepanel.css`
- Create: `sidepanel.js`
- Modify: `manifest.json`
- Modify: `popup.html`
- Modify: `popup.js`

- [ ] Add `side_panel.default_path` and `sidePanel` permission.
- [ ] Add a popup button that opens `chrome.sidePanel.open({ windowId })`.
- [ ] Render active profile entries in the side panel grouped by category.
- [ ] Add empty, loading, success, and error states.

### Task 3: AI Organization

**Files:**
- Modify: `background.js`
- Modify: `test/background.test.js`
- Modify: `sidepanel.js`

- [ ] Add tests for parsing organized entries from provider JSON.
- [ ] Add `aiOrganizeEntries(entries)` with a JSON-only prompt.
- [ ] Add a side panel `AI 整理` button that previews suggestions.
- [ ] Add `确认保存` to replace the active profile entries.

### Task 4: Documentation and Verification

**Files:**
- Modify: `README.md`
- Modify: `PLAN.md`

- [ ] Document the side panel workflow.
- [ ] Run `node --test test/*.test.js`.
- [ ] Run `node --check background.js popup.js content.js sidepanel.js fieldOrganizer.js`.
- [ ] Run `python3 -m json.tool manifest.json >/dev/null`.
