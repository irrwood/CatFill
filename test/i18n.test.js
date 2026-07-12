const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadI18n(browserLanguage = "zh-CN") {
  const code = fs.readFileSync(path.join(__dirname, "..", "i18n.js"), "utf8");
  const context = {
    navigator: { language: browserLanguage },
    document: {
      documentElement: { dataset: {}, style: {} },
      querySelectorAll: () => [],
    },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.CatFillI18n;
}

test("interface translations switch between Chinese and English", () => {
  const i18n = loadI18n("en-GB");
  i18n.setLocale();
  assert.equal(i18n.locale, "en");
  assert.equal(i18n.t("organizerTab"), "Fields");
  assert.equal(i18n.category("联系方式"), "Contact");
  assert.equal(i18n.category("旅行"), "Travel");
  assert.equal(i18n.t("setupProviderStep", { provider: "OpenAI" }), "Use OpenAI");
  assert.equal(i18n.t("manualMode"), "Enter manually");
  assert.equal(i18n.t("fileDropTitle"), "Choose a file or drop it here");

  i18n.setLocale("zh");
  assert.equal(i18n.t("organizerTab"), "字段整理");
  assert.equal(i18n.category("联系方式"), "联系方式");
  assert.equal(i18n.category("旅行"), "旅行");
  assert.equal(i18n.t("setupProviderStep", { provider: "OpenAI" }), "使用 OpenAI");
  assert.equal(i18n.t("manualMode"), "手动录入");
  assert.equal(i18n.t("fileDropTitle"), "选择文件，或拖到这里");
});

test("theme preference resolves system and explicit dark mode", () => {
  const i18n = loadI18n("en-GB");
  i18n.setTheme("dark");
  assert.equal(i18n.theme, "dark");
  i18n.setTheme("system");
  assert.equal(i18n.theme, "system");
});
