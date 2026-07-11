// CatFill 内容脚本：扫描页面表单字段 + 填充。
// 由 popup 通过 chrome.scripting 按需注入，用 __catfillLoaded 防止重复注册。
(() => {
  if (window.__catfillLoaded) return;
  window.__catfillLoaded = true;

  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[\s:*：、（）()\[\]_\-\/.]+/g, "")
      .trim();

  function isVisible(el) {
    if (!el.getClientRects().length) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  }

  // 递归穿透 open shadow root 查询（web components 页面的表单在 shadow DOM 里）
  function deepQueryAll(selector, root = document) {
    const out = [...root.querySelectorAll(selector)];
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot) out.push(...deepQueryAll(selector, el.shadowRoot));
    }
    return out;
  }

  // 元素可能在 shadow root 里，label/id 引用要在它自己的根上找
  function rootOf(el) {
    const root = el.getRootNode();
    return root.querySelector ? root : document;
  }

  function labelText(el) {
    const root = rootOf(el);
    if (el.id) {
      const lab = root.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab) return lab.textContent.trim();
    }
    const wrap = el.closest("label");
    if (wrap) return wrap.textContent.trim();
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const ref = root.getElementById?.(labelledBy.split(/\s+/)[0]);
      if (ref) return ref.textContent.trim();
    }
    return "";
  }

  function directText(el) {
    if (!el) return "";
    return [...el.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  // 通用「就近文本」：沿祖先向上，找控件前面最近的一段可见纯文本。
  // 大多数表单（div 布局、问卷类页面）都把问题文字放在控件前面的兄弟节点里，
  // 这比枚举 .form-group 之类的 class 覆盖面广得多。
  function nearestPrecedingText(el) {
    let node = el;
    for (let depth = 0; depth < 6 && node && node !== document.body; depth++) {
      let sib = node.previousElementSibling;
      let steps = 0;
      while (sib && steps < 4) {
        if (
          isVisible(sib) &&
          !sib.matches("script, style") &&
          !sib.querySelector("input, textarea, select, button")
        ) {
          const text = cleanText(sib.innerText || sib.textContent || "");
          if (text.length >= 2 && text.length <= 300) return text;
        }
        sib = sib.previousElementSibling;
        steps++;
      }
      node = node.parentElement;
    }
    return "";
  }

  // 表格布局：本单元格前面的 th / 首格文字；定义列表：dd 前面的 dt
  function tableOrDlText(el) {
    const cell = el.closest("td");
    if (cell) {
      const row = cell.closest("tr");
      const head = row?.querySelector("th") || row?.cells?.[0];
      if (head && head !== cell) {
        const text = cleanText(head.textContent);
        if (text) return text;
      }
    }
    const dd = el.closest("dd");
    let dt = dd?.previousElementSibling;
    while (dt && dt.tagName !== "DT") dt = dt.previousElementSibling;
    if (dt) return cleanText(dt.textContent);
    return "";
  }

  function questionText(el, type) {
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => rootOf(el).getElementById?.(id)?.textContent.trim())
        .filter(Boolean)
        .join(" ");
      if (text) return text.slice(0, 200);
    }

    const fieldset = el.closest("fieldset");
    const legend = fieldset?.querySelector("legend");
    if (legend?.textContent.trim()) return legend.textContent.trim().slice(0, 200);

    const group = el.closest('[role="radiogroup"], [role="group"], .form-group, .field, .form-field, .question');
    const heading = group?.querySelector("legend, [data-question], [data-label], h1, h2, h3, h4, h5, h6");
    if (heading?.textContent.trim()) return heading.textContent.trim().slice(0, 200);

    const tabular = tableOrDlText(el);
    if (tabular) return tabular.slice(0, 200);

    if (["radio", "checkbox"].includes(type)) {
      const parentText = directText(el.closest("label")?.parentElement);
      if (parentText) return parentText.slice(0, 200);
    }

    return nearestPrecedingText(el).slice(0, 200);
  }

  function textFromIds(ids = "", el = null) {
    const root = el ? rootOf(el) : document;
    return ids
      .split(/\s+/)
      .map((id) => root.getElementById?.(id)?.textContent.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function noteText(el) {
    const describedBy = textFromIds(el.getAttribute("aria-describedby") || "", el);
    if (describedBy) return describedBy.slice(0, 240);

    const labelledBy = textFromIds(el.getAttribute("aria-labelledby") || "", el);
    const container = el.closest(".form-group, .field, .form-field, .question, label, fieldset, [role='group']");
    const noteSelectors = [
      ".note",
      ".hint",
      ".help",
      ".helper",
      ".description",
      ".field-note",
      ".form-text",
      ".help-text",
      "[data-note]",
      "[data-help]",
      "[data-description]",
      "[aria-live]",
    ];
    const notes = container
      ? noteSelectors
          .flatMap((selector) => [...container.querySelectorAll(selector)])
          .map((node) => node.textContent.trim())
          .filter(Boolean)
      : [];
    const title = el.getAttribute("title") || "";
    return [...new Set([labelledBy, ...notes, title])]
      .filter((text) => text && text !== labelText(el))
      .join(" ")
      .slice(0, 240);
  }

  function choiceFor(el, type) {
    if (el.tagName === "SELECT") {
      const option = el.selectedOptions?.[0];
      if (!option) return null;
      return {
        value: option.value || "",
        text: option.textContent.trim(),
        index: el.selectedIndex,
      };
    }
    if (type === "radio" && el.checked) {
      return {
        value: el.value || "",
        text: labelText(el),
      };
    }
    if (type === "checkbox") {
      return {
        value: el.checked ? "true" : "false",
        text: labelText(el),
      };
    }
    return null;
  }

  function cleanText(text = "") {
    return String(text).replace(/\s+/g, " ").trim();
  }

  function optionText(el) {
    return cleanText(el.getAttribute("aria-label") || el.textContent || "");
  }

  function isNativeFormEl(el) {
    return el.matches("input, textarea, select");
  }

  function isActionButtonText(text) {
    return /^(submit|save|add|delete|remove|edit|refresh|next|previous|back|continue|cancel|close|apply|upload|browse|search|提交|保存|添加|删除|修改|刷新|下一步|上一步|继续|取消|关闭|搜索)$/i.test(text);
  }

  // 弹层式下拉框（react-select/antd/element-ui/headlessui 等）：
  // 选项要点开才渲染，走"打开弹层→等渲染→选中"的多步交互
  function isCustomSelectTarget(el) {
    if (el.getAttribute("role") === "combobox") return true;
    if (el.getAttribute("aria-haspopup") === "listbox") return true;
    if (el.matches("input") && el.getAttribute("aria-autocomplete") === "list") return true;
    if (el.matches("input") && el.readOnly && el.closest('[class*="select" i], [class*="picker" i], [class*="dropdown" i]')) return true;
    return false;
  }

  function isCustomOption(el) {
    if (!isVisible(el) || isNativeFormEl(el)) return false;
    if (isCustomSelectTarget(el) || el.closest('[role="combobox"], [aria-haspopup="listbox"]')) return false;
    if (el.matches("button") && ["submit", "reset"].includes((el.getAttribute("type") || "").toLowerCase())) return false;
    const text = optionText(el);
    if (!text || text.length > 64 || isActionButtonText(text)) return false;
    if (el.matches("label") && el.querySelector('input[type="radio"], input[type="checkbox"]')) return true;
    return el.matches('button, [role="button"], [role="radio"], [aria-pressed], [aria-checked]');
  }

  function selectedCustomOption(el) {
    const ariaChecked = el.getAttribute("aria-checked");
    const ariaPressed = el.getAttribute("aria-pressed");
    if (ariaChecked === "true" || ariaPressed === "true") return true;
    const input = el.matches("label") ? el.querySelector('input[type="radio"], input[type="checkbox"]') : null;
    if (input?.checked) return true;
    return /\b(selected|active|checked|is-selected|is-active)\b/i.test(el.className || "");
  }

  function textWithoutOptions(container, options) {
    let text = cleanText(container.innerText || container.textContent || "");
    for (const option of options) {
      const optionLabel = optionText(option);
      if (optionLabel) text = cleanText(text.replace(optionLabel, " "));
    }
    return text;
  }

  function looksLikeQuestionText(text = "") {
    const value = cleanText(text);
    if (!value || value.length < 8 || value.length > 260) return false;
    if (/[?？。.]$/.test(value)) return true;
    if (/^(i am|i have|i understand|i agree|i acknowledge|will|would|do|does|are|is|can|could|may|have|what|which|when|where|why|how)\b/i.test(value)) return true;
    if (/^(是否|您是否|你是否|我已|我同意|我确认|请选择|请问|哪一|什么|何时|为什么|如何)/.test(value)) return true;
    return value.split(/\s+/).length >= 6;
  }

  function previousQuestionText(container) {
    let node = container.previousElementSibling;
    let steps = 0;
    while (node && steps < 5) {
      if (isVisible(node) && !node.matches("script, style")) {
        const text = cleanText(node.innerText || node.textContent || "");
        if (looksLikeQuestionText(text)) return text.slice(0, 180);
      }
      node = node.previousElementSibling;
      steps++;
    }
    return "";
  }

  function questionForCustomGroup(container, options) {
    const labelledBy = textFromIds(container.getAttribute("aria-labelledby") || "", container);
    if (labelledBy) return labelledBy.slice(0, 160);

    // 组内自己的标题优先于前置兄弟文本，否则会把上一题的文字当成本组题目
    const heading = container.querySelector("legend, [data-question], [data-label], h1, h2, h3, h4, h5, h6, label");
    const headingText = heading ? textWithoutOptions(heading, options) : "";
    if (headingText && headingText.length <= 180) return headingText;

    const previousQuestion = previousQuestionText(container);
    if (previousQuestion) return previousQuestion;

    const ownText = textWithoutOptions(container, options);
    if (ownText && ownText.length <= 220) return ownText.slice(0, 160);

    return "";
  }

  function customChoiceGroups() {
    const selector = 'button, [role="button"], [role="radio"], [aria-pressed], [aria-checked], label';
    const allOptions = deepQueryAll(selector).filter(isCustomOption);
    const groups = [];
    const seen = new Set();

    for (const option of allOptions) {
      let node = option.parentElement;
      let depth = 0;
      while (node && node !== document.body && depth < 6) {
        const options = allOptions.filter((candidate) => node.contains(candidate));
        const labels = [...new Set(options.map(optionText).filter(Boolean))];
        if (labels.length >= 2 && labels.length <= 8) {
          const question = questionForCustomGroup(node, options);
          if (question) {
            const key = `${question}|${labels.join("|")}`;
            if (!seen.has(key)) {
              seen.add(key);
              groups.push({ container: node, options, question });
            }
            break;
          }
        }
        node = node.parentElement;
        depth++;
      }
    }
    return groups;
  }

  function nativeField(el, index) {
    const tag = el.tagName.toLowerCase();
    const type = tag === "input" ? (el.type || "text").toLowerCase() : tag;
    let value = "";
    if (type === "checkbox") value = el.checked ? "true" : "false";
    else if (type === "radio") value = el.checked ? el.value : "";
    else if (type === "file") value = el.files?.[0]?.name || "";
    else value = el.value || "";

    const field = {
      index,
      type,
      signals: {
        autocomplete: el.getAttribute("autocomplete") || "",
        name: el.name || "",
        id: el.id || "",
        placeholder: el.getAttribute("placeholder") || "",
        question: questionText(el, type),
        label: labelText(el).slice(0, 120),
        ariaLabel: el.getAttribute("aria-label") || "",
        note: noteText(el),
      },
      value: value.slice(0, 500),
    };
    if (tag === "select") {
      field.options = [...el.options]
        .slice(0, 50)
        .map((o) => ({ value: o.value, text: o.textContent.trim() }));
    }
    if (type === "file" && el.files?.[0]) {
      const file = el.files[0];
      field.file = {
        name: file.name,
        type: file.type || "",
        size: file.size,
        lastModified: file.lastModified,
      };
    }
    const choice = choiceFor(el, type);
    if (choice) field.choice = choice;
    return field;
  }

  function customChoiceField(group, index) {
    const selectedIndex = group.options.findIndex(selectedCustomOption);
    const selected = selectedIndex >= 0 ? group.options[selectedIndex] : null;
    const selectedText = selected ? optionText(selected) : "";
    const field = {
      index,
      type: "custom-choice",
      signals: {
        autocomplete: "",
        name: group.container.getAttribute("name") || group.container.getAttribute("data-field-name") || "",
        id: group.container.id || "",
        placeholder: "",
        question: group.question,
        label: "",
        ariaLabel: group.container.getAttribute("aria-label") || "",
        note: noteText(group.container),
      },
      options: group.options.map((option) => {
        const text = optionText(option);
        return { value: text, text };
      }),
      value: selectedText,
    };
    if (selected) field.choice = { value: selectedText, text: selectedText, index: selectedIndex };
    return field;
  }

  function customSelectField(el, index) {
    const isInput = el.matches("input");
    const container = el.closest('[class*="select" i], [role="combobox"]') || el;
    return {
      index,
      type: "custom-select",
      signals: {
        autocomplete: el.getAttribute("autocomplete") || "",
        name: el.getAttribute("name") || container.getAttribute("data-field-name") || "",
        id: el.id || container.id || "",
        placeholder: el.getAttribute("placeholder") || "",
        question: questionText(el, "custom-select"),
        label: labelText(el).slice(0, 120),
        ariaLabel: el.getAttribute("aria-label") || container.getAttribute("aria-label") || "",
        note: noteText(el),
      },
      // 弹层没打开，选项未知；value 是当前显示的已选文本
      value: (isInput ? el.value : cleanText(el.innerText || "")).slice(0, 100),
    };
  }

  function richTextField(el, index) {
    return {
      index,
      type: "richtext",
      signals: {
        autocomplete: "",
        name: el.getAttribute("name") || el.getAttribute("data-field-name") || "",
        id: el.id || "",
        placeholder: el.getAttribute("data-placeholder") || el.getAttribute("placeholder") || "",
        question: questionText(el, "richtext"),
        label: labelText(el).slice(0, 120),
        ariaLabel: el.getAttribute("aria-label") || "",
        note: noteText(el),
      },
      value: cleanText(el.innerText || "").slice(0, 500),
    };
  }

  // 收集页面上可填的字段，附带用于匹配的特征信号。
  // lastElements / lastFields 与返回的字段数组按 index 一一对应。
  let lastElements = [];
  let lastFields = [];
  function scan() {
    // readonly 不再直接排除：可能是弹层日期框（可尝试临时解除 readonly 写入）
    const nativeCandidates = deepQueryAll("input, textarea, select").filter((el) => {
      if (el.disabled) return false;
      const type = (el.type || "").toLowerCase();
      if (["hidden", "password", "submit", "button", "reset", "image"].includes(type)) return false;
      return isVisible(el);
    });
    const customSelectInputs = nativeCandidates.filter(isCustomSelectTarget);
    const nativeElements = nativeCandidates.filter((el) => !isCustomSelectTarget(el));

    // 非 input 的 combobox 容器（headlessui Listbox 的 button、div 型控件）
    const customSelectContainers = deepQueryAll('[role="combobox"], [aria-haspopup="listbox"]')
      .filter((el) =>
        !isNativeFormEl(el) &&
        isVisible(el) &&
        !el.querySelector("select") &&
        !customSelectInputs.some((input) => el.contains(input)));

    // 富文本编辑框（求职网站的 cover letter、备注等常用 contenteditable）
    const richTextElements = deepQueryAll(
      '[contenteditable=""], [contenteditable="true"], [role="textbox"]:not(input):not(textarea)',
    ).filter((el) => isVisible(el) && !isNativeFormEl(el) && !el.closest("[contenteditable] [contenteditable]"));

    const customGroups = customChoiceGroups()
      .filter((group) =>
        // 选项里包着"可见的"原生 radio/checkbox 时，原生路径已经覆盖，跳过避免重复；
        // 隐藏 input 的美化单选组（opacity:0 那种）不受影响，因为 input 不在 nativeElements 里
        !group.options.some((option) => nativeElements.some((el) => option.contains(el))) &&
        !nativeElements.some((el) =>
          group.options.includes(el) || (group.container.contains(el) && !["radio", "checkbox"].includes((el.type || "").toLowerCase())),
        ));

    lastElements = [
      ...nativeElements,
      ...[...customSelectInputs, ...customSelectContainers].map((el) => ({ kind: "custom-select", el })),
      ...richTextElements.map((el) => ({ kind: "richtext", el })),
      ...customGroups.map((group) => ({ kind: "custom-choice", ...group })),
    ];

    lastFields = lastElements.map((target, index) => {
      if (target.kind === "custom-select") return customSelectField(target.el, index);
      if (target.kind === "custom-choice") return customChoiceField(target, index);
      if (target.kind === "richtext") return richTextField(target.el, index);
      return nativeField(target, index);
    });
    return lastFields;
  }

  // 页面级上下文，给 AI 审题用
  function pageContext() {
    return {
      url: location.href.slice(0, 300),
      title: (document.title || "").slice(0, 150),
      heading: cleanText(document.querySelector("h1")?.innerText || "").slice(0, 150),
    };
  }

  function setNativeValue(el, value, { blur = true } = {}) {
    el.focus?.();
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : el instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    // React 受控组件：让内部 value tracker 失效，input 事件才会触发 onChange
    el._valueTracker?.setValue?.("");
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: String(value) }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    if (blur) el.blur?.();
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function pressKey(el, key) {
    for (const type of ["keydown", "keyup"]) {
      el.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
    }
  }

  function clickLikeUser(el) {
    // react-select 等库监听 mousedown 而不是 click
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    el.click?.();
  }

  // 弹层里的选项：role=option 是标准；再兜底几个主流组件库的 class/id 形态
  const POPUP_OPTION_SELECTOR =
    '[role="option"], .ant-select-item-option, .el-select-dropdown__item, [id*="-option-"], [class*="__option"]';

  function visiblePopupOptions() {
    return deepQueryAll(POPUP_OPTION_SELECTOR)
      .filter((el) => isVisible(el) && cleanText(el.textContent));
  }

  function bestOptionMatch(options, candidates) {
    const normCandidates = candidates.map(norm).filter(Boolean);
    let partial = null;
    for (const option of options) {
      const text = norm(cleanText(option.textContent));
      if (!text) continue;
      if (normCandidates.some((c) => text === c)) return option;
      if (!partial && normCandidates.some((c) => text.includes(c) || c.includes(text))) partial = option;
    }
    return partial;
  }

  async function applyCustomSelect(el, valueOrEntry) {
    const candidates = valueCandidates(valueOrEntry).map(String).filter(Boolean);
    if (!candidates.length) return false;

    el.focus?.();
    clickLikeUser(el);
    // 可搜索型：往内部 input 打字让弹层过滤（不 blur，否则弹层会关掉）
    const input = el.matches("input") ? el : el.querySelector("input");
    if (input && !input.readOnly) setNativeValue(input, candidates[0], { blur: false });

    for (let attempt = 0; attempt < 10; attempt++) {
      await wait(120);
      const target = bestOptionMatch(visiblePopupOptions(), candidates);
      if (target) {
        clickLikeUser(target);
        return true;
      }
    }
    // 搜索型输入已把列表过滤到最接近项时，Enter 通常能选中第一项
    if (input && !input.readOnly && input.value) {
      pressKey(input, "Enter");
      await wait(100);
      if (!visiblePopupOptions().length) return true;
    }
    pressKey(input || el, "Escape");
    return false;
  }

  function applyRichText(el, value) {
    el.focus();
    // execCommand 会走浏览器原生输入路径，多数富文本编辑器（ProseMirror/Quill/Slate）都认
    let ok = false;
    try {
      document.execCommand("selectAll", false, null);
      ok = document.execCommand("insertText", false, String(value));
    } catch (_e) { /* execCommand 在个别编辑器上会抛错，走兜底 */ }
    if (!ok) {
      el.textContent = String(value);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: String(value) }));
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
    return true;
  }

  // 注意：entry.aliases 是字段名（如 "email"），不是值，绝不能拿去匹配选项
  function valueCandidates(valueOrEntry) {
    if (!valueOrEntry || typeof valueOrEntry !== "object") return [String(valueOrEntry || "")];
    return [
      valueOrEntry.value,
      valueOrEntry.choice?.value,
      valueOrEntry.choice?.text,
    ].filter((value) => value !== undefined && value !== null && value !== "");
  }

  function resolvedEntryForField(field, entry, entries) {
    const resolver = globalThis.CatFillFieldOrganizer?.resolveEntryValueForField;
    if (!resolver || !entry || entry.choice || entry.file) return entry;
    return {
      ...entry,
      value: resolver(field.signals, entry, entries),
    };
  }

  function applyCustomChoice(group, valueOrEntry) {
    const candidates = valueCandidates(valueOrEntry).map(norm).filter(Boolean);
    if (!candidates.length) return false;
    const target = group.options.find((option) => {
      const text = norm(optionText(option));
      return candidates.some((candidate) => text === candidate || text.includes(candidate) || candidate.includes(text));
    });
    if (!target) return false;
    target.click();
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  async function applyValue(el, valueOrEntry) {
    if (el?.kind === "custom-choice") return applyCustomChoice(el, valueOrEntry);
    if (el?.kind === "custom-select") return applyCustomSelect(el.el, valueOrEntry);
    if (el?.kind === "richtext") return applyRichText(el.el, valueCandidates(valueOrEntry)[0] || "");
    const candidates = valueCandidates(valueOrEntry);
    const value = candidates[0] || "";
    const type = (el.type || el.tagName).toLowerCase();
    if (type === "checkbox") {
      const want = ["true", "1", "yes", "是", "on"].includes(String(value).toLowerCase());
      if (el.checked !== want) el.click();
      return true;
    }
    if (type === "file") return false;
    if (type === "radio") {
      const group = el.name
        ? rootOf(el).querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)
        : [el];
      for (const r of group) {
        if (candidates.some((candidate) => norm(r.value) === norm(candidate) || norm(labelText(r)) === norm(candidate))) {
          if (!r.checked) r.click();
          return true;
        }
      }
      return false;
    }
    if (el.tagName === "SELECT") {
      const target = [...el.options].find(
        (o) => candidates.some((candidate) => norm(o.value) === norm(candidate) || norm(o.textContent) === norm(candidate))
      );
      if (!target) return false;
      setNativeValue(el, target.value);
      return true;
    }
    if (el.readOnly) {
      // 弹层日期框常把 input 设为 readonly；临时解除写入，多数组件接受直接赋值
      el.readOnly = false;
      setNativeValue(el, String(value));
      el.readOnly = true;
      return true;
    }
    setNativeValue(el, String(value));
    return true;
  }

  function valuesMatch(actual, candidates, { partial = false } = {}) {
    const value = norm(actual);
    if (!value) return false;
    return candidates.some((candidate) => {
      const expected = norm(candidate);
      if (!expected) return false;
      return value === expected || (partial && (value.includes(expected) || expected.includes(value)));
    });
  }

  function selectedCustomText(group) {
    const selected = group.options.find(selectedCustomOption);
    return selected ? optionText(selected) : "";
  }

  // 只把网页实际保留的结果计入成功，避免受控组件回滚时仍显示“已填充”。
  function valueWasApplied(el, valueOrEntry) {
    const candidates = valueCandidates(valueOrEntry);
    if (!candidates.length || !isAlive(el)) return false;
    if (el?.kind === "custom-choice") {
      return valuesMatch(selectedCustomText(el), candidates, { partial: true });
    }
    if (el?.kind === "custom-select") {
      const target = el.el;
      const input = target.matches("input") ? target : target.querySelector("input");
      const actual = input?.value || target.getAttribute("aria-valuetext") || cleanText(target.innerText || "");
      return valuesMatch(actual, candidates, { partial: true });
    }
    if (el?.kind === "richtext") {
      return valuesMatch(cleanText(el.el.innerText || ""), candidates);
    }

    const type = (el.type || el.tagName).toLowerCase();
    if (type === "checkbox") {
      const want = ["true", "1", "yes", "是", "on"].includes(String(candidates[0]).toLowerCase());
      return el.checked === want;
    }
    if (type === "radio") {
      const group = el.name
        ? rootOf(el).querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)
        : [el];
      return [...group].some((radio) => radio.checked && valuesMatch(radio.value || labelText(radio), candidates, { partial: true }));
    }
    if (el.tagName === "SELECT") {
      const selected = el.selectedOptions?.[0];
      return Boolean(selected) && valuesMatch(selected.value || selected.textContent, candidates, { partial: true });
    }
    return valuesMatch(el.value, candidates);
  }

  async function applyAndVerify(el, valueOrEntry) {
    if (!(await applyValue(el, valueOrEntry))) return false;
    // 给 React/Vue 等受控组件一次提交状态并重新渲染的机会。
    await wait(120);
    return valueWasApplied(el, valueOrEntry);
  }

  // 特征匹配打分：autocomplete/name/id 权重高，label/question 次之
  const WEIGHTS = { autocomplete: 5, name: 4, id: 3, label: 3, question: 3, placeholder: 2, ariaLabel: 2, note: 1 };

  // 条目侧参与比较的文本：原始 signals + AI 整理出的标题和别名
  function entryTexts(entry) {
    const signals = entry.signals || {};
    return [
      ...Object.entries(WEIGHTS).map(([k, w]) => [signals[k], w]),
      [entry.canonicalKey, 4],
      ...(entry.aliases || []).map((alias) => [alias, 3]),
    ].filter(([text]) => text);
  }

  function score(fieldSignals, entry) {
    let total = 0;
    const entrySide = entryTexts(entry).map(([text, w]) => [norm(text), w]);
    for (const [k, w] of Object.entries(WEIGHTS)) {
      const a = norm(fieldSignals[k]);
      if (!a) continue;
      for (const [b, w2] of entrySide) {
        if (!b) continue;
        const weight = Math.min(w, w2);
        if (a === b) total += weight * 2;
        // 长文本（≥6 字符）的包含视同精确：题目原文之间的包含关系是强信号
        else if (a.includes(b)) total += b.length >= 6 ? weight * 2 : weight;
        else if (b.includes(a)) total += a.length >= 6 ? weight * 2 : weight;
      }
    }
    return total;
  }

  // 同义词组：来自 fieldOrganizer 的词典（popup 会先注入它）。
  // 双方文本命中同一组（归一化后精确相等，避免子串误伤）→ 强加分。
  const AUTOCOMPLETE_TO_KEY = {
    email: "邮箱", tel: "手机", "tel-national": "手机", name: "姓名",
    "given-name": "名", "family-name": "姓",
    "street-address": "地址", "address-line1": "地址",
    "postal-code": "邮编", country: "国家/地区", "country-name": "国家/地区",
    organization: "公司", "organization-title": "职位",
    "address-level1": "省/州", "address-level2": "城市",
  };

  function synonymDefs() {
    const defs = globalThis.CatFillFieldOrganizer?.FIELD_DEFINITIONS || [];
    return defs.map((d) => {
      const aliases = [d.canonicalKey, ...d.aliases].map(norm).filter(Boolean);
      return {
        set: new Set(aliases),
        // 中文别名（≥2 字）允许包含匹配："所在城市"包含"城市"、"您的电子邮箱"包含"邮箱"。
        // 英文别名不做包含（"name" ⊂ "companyname" 会误伤），靠 token 切分覆盖。
        cjkAliases: aliases.filter((a) => a.length >= 2 && /[一-龥]/.test(a)),
      };
    });
  }

  // user_email / tbl_city / companyName → [user, email] [tbl, city] [company, name]
  function tokensOf(rawText) {
    return String(rawText || "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .split(/[\s_\-\/:：.\[\]]+/)
      .map(norm)
      .filter(Boolean);
  }

  function groupsForTexts(texts, autocomplete, defs) {
    const groups = new Set();
    const acKey = AUTOCOMPLETE_TO_KEY[(autocomplete || "").toLowerCase()];
    const wholes = texts.map(norm).filter(Boolean);
    const all = new Set([...wholes, ...texts.flatMap(tokensOf)]);
    if (acKey) all.add(norm(acKey));
    defs.forEach((def, g) => {
      if ([...all].some((t) => def.set.has(t))) {
        groups.add(g);
        return;
      }
      if (def.cjkAliases.some((alias) => wholes.some((w) => w.includes(alias)))) groups.add(g);
    });
    return groups;
  }

  function fieldGroups(signals, defs) {
    return groupsForTexts(
      [signals.name, signals.id, signals.label, signals.question, signals.placeholder, signals.ariaLabel],
      signals.autocomplete, defs,
    );
  }

  function entryGroups(entry, defs) {
    return groupsForTexts(entryTexts(entry).map(([text]) => text), entry.signals?.autocomplete, defs);
  }

  function intersects(a, b) {
    for (const x of a) if (b.has(x)) return true;
    return false;
  }

  async function heuristicFill(entries) {
    const fields = scan();
    const defs = synonymDefs();
    const entryGroupCache = new Map();
    let filled = 0;
    for (let i = 0; i < fields.length; i++) {
      const fg = fieldGroups(fields[i].signals, defs);
      let best = null;
      let bestScore = 0;
      for (const entry of entries) {
        if (!entryGroupCache.has(entry)) entryGroupCache.set(entry, entryGroups(entry, defs));
        let s = score(fields[i].signals, entry);
        if (fg.size && intersects(fg, entryGroupCache.get(entry))) s += 6;
        if (s > bestScore) {
          bestScore = s;
          best = entry;
        }
      }
      if (best && bestScore >= 4) {
        if (await applyAndVerify(lastElements[i], resolvedEntryForField(fields[i], best, entries))) filled++;
      }
    }
    return { filled, total: fields.length };
  }

  function fingerprint(signals = {}) {
    return ["autocomplete", "name", "id", "question", "label", "placeholder", "ariaLabel"]
      .map((k) => norm(signals[k]))
      .join("|");
  }

  function isAlive(target) {
    if (!target) return false;
    if (target.kind === "custom-choice") return target.container?.isConnected ?? false;
    if (target.kind === "custom-select" || target.kind === "richtext") return target.el?.isConnected ?? false;
    return target.isConnected;
  }

  // 用扫描时留下的元素引用填充；页面重渲染导致元素失联时，
  // 重扫一次并按特征指纹找回同一字段（解决 AI 往返期间 index 错位）
  async function applyAssignments(assignments) {
    if (!lastElements.length) scan();
    const elements = lastElements;
    const fields = lastFields;
    let rescanned = null;
    let filled = 0;
    for (const { index, value } of assignments) {
      let el = elements[index];
      if (!isAlive(el)) {
        if (!rescanned) rescanned = { fields: scan(), elements: lastElements };
        const fp = fingerprint(fields[index]?.signals);
        const j = rescanned.fields.findIndex((f) => fingerprint(f.signals) === fp);
        el = j >= 0 ? rescanned.elements[j] : null;
      }
      if (el && value !== "" && (await applyAndVerify(el, value))) filled++;
    }
    return { filled, total: assignments.length };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        if (msg.action === "scan") {
          sendResponse({ ok: true, fields: scan(), page: pageContext() });
        } else if (msg.action === "fill") {
          sendResponse({ ok: true, ...(await heuristicFill(msg.entries)) });
        } else if (msg.action === "applyAssignments") {
          sendResponse({ ok: true, ...(await applyAssignments(msg.assignments)) });
        } else {
          sendResponse({ ok: false, error: `未知 action: ${msg.action}` });
        }
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true; // 异步 sendResponse
  });
})();
