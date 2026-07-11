// 仅做一件事：监听系统深浅色变化，回报给 background 切换工具栏图标。
const query = window.matchMedia("(prefers-color-scheme: dark)");

function report() {
  chrome.runtime.sendMessage({ action: "systemThemeChanged", dark: query.matches }).catch(() => {});
}

query.addEventListener("change", report);
report();
