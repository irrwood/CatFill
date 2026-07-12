const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadOrganizer() {
  const code = fs.readFileSync(path.join(__dirname, "..", "fieldOrganizer.js"), "utf8");
  const context = { console };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.CatFillFieldOrganizer;
}

test("organizeEntries groups Chinese and English aliases into canonical fields", () => {
  const organizer = loadOrganizer();
  const entries = [
    { signals: { label: "姓名", name: "" }, value: "张三" },
    { signals: { label: "", name: "full_name" }, value: "张三" },
    { signals: { label: "Email", name: "email" }, value: "hi@example.com" },
    { signals: { label: "电子邮件", name: "" }, value: "hi@example.com" },
  ];

  const organized = organizer.organizeEntries(entries);

  assert.equal(organized.length, 2);
  assert.equal(
    JSON.stringify(organized.map((entry) => [entry.category, entry.canonicalKey, entry.value])),
    JSON.stringify([
      ["身份信息", "姓名", "张三"],
      ["联系方式", "邮箱", "hi@example.com"],
    ]),
  );
  assert.equal(JSON.stringify(organized[0].aliases.sort()), JSON.stringify(["full_name", "姓名"].sort()));
  assert.equal(JSON.stringify(organized[1].aliases.sort()), JSON.stringify(["Email", "email", "电子邮件"].sort()));
});

test("organizeEntries uses English standard titles when the interface language is English", () => {
  const organizer = loadOrganizer();
  const entries = organizer.organizeEntries([{
    signals: { label: "Email", name: "email" },
    value: "qian@example.com",
  }], { language: "en" });

  assert.equal(entries[0].category, "联系方式");
  assert.equal(entries[0].canonicalKey, "Email");
});

test("groupOrganizedEntries keeps unknown fields under other", () => {
  const organizer = loadOrganizer();
  const organized = organizer.organizeEntries([
    { signals: { label: "Membership Code", name: "member_code" }, value: "A-42" },
  ]);
  const groups = organizer.groupOrganizedEntries(organized);

  assert.equal(organized[0].category, "其他");
  assert.equal(organized[0].canonicalKey, "Membership Code");
  assert.equal(groups[0].category, "其他");
  assert.equal(groups[0].entries[0].value, "A-42");
});

test("organizeEntries preserves selected choice metadata when merging aliases", () => {
  const organizer = loadOrganizer();
  const organized = organizer.organizeEntries([
    {
      signals: { label: "国家", name: "country" },
      value: "CN",
      choice: { value: "CN", text: "中国", index: 2 },
      options: [
        { value: "US", text: "美国" },
        { value: "CN", text: "中国" },
      ],
    },
    {
      signals: { label: "Country", name: "country_name" },
      value: "CN",
      choice: { value: "CN", text: "China", index: 2 },
    },
  ]);

  assert.equal(organized.length, 1);
  assert.equal(organized[0].canonicalKey, "国家/地区");
  assert.equal(organized[0].choice.text, "中国");
  assert.equal(organized[0].options[1].text, "中国");
});

test("entryDisplayKey prefers choice question titles for choice fields", () => {
  const organizer = loadOrganizer();
  const entry = {
    signals: {
      label: "电子邮件",
      name: "contact_method_email",
      question: "首选联系方式",
    },
    choice: { value: "email", text: "电子邮件" },
    value: "email",
  };

  assert.equal(organizer.entryDisplayKey(entry), "首选联系方式");
});

test("organizeEntries keeps contact-consent choice questions as preferences", () => {
  const organizer = loadOrganizer();
  const organized = organizer.organizeEntries([
    {
      signals: {
        question: "是否愿意被联系",
        name: "contact_consent",
        label: "Yes",
      },
      choice: { value: "yes", text: "Yes", index: 1 },
      value: "yes",
    },
  ]);

  assert.equal(organized.length, 1);
  assert.equal(organized[0].category, "其他");
  assert.equal(organized[0].canonicalKey, "是否愿意被联系");
  assert.equal(organized[0].choice.text, "Yes");
});

test("organizeEntries does not confuse visa sponsorship with contact consent", () => {
  const organizer = loadOrganizer();
  const question = "Will you now or in the future require visa sponsorship for employment with Miro?";
  const organized = organizer.organizeEntries([
    {
      signals: {
        question,
        name: "visa_sponsorship",
        label: "Yes",
      },
      choice: { value: "yes", text: "Yes", index: 1 },
      value: "yes",
    },
  ]);

  assert.equal(organized.length, 1);
  assert.equal(organized[0].category, "其他");
  assert.equal(organized[0].canonicalKey, question);
  assert.equal(organized[0].choice.text, "Yes");
});

test("organizeEntries preserves full semantic choice questions", () => {
  const organizer = loadOrganizer();
  const question = "Do you identify as a member of the LGBTQ+ community?";
  const organized = organizer.organizeEntries([
    {
      signals: {
        question,
        name: "demographic_lgbtq",
        label: "No",
      },
      choice: { value: "no", text: "No", index: 2 },
      value: "no",
    },
  ]);

  assert.equal(organized.length, 1);
  assert.equal(organized[0].category, "其他");
  assert.equal(organized[0].canonicalKey, question);
  assert.equal(organized[0].choice.text, "No");
});

test("updateEntryAt edits category, title, value, and aliases", () => {
  const organizer = loadOrganizer();
  const entries = [
    {
      category: "其他",
      canonicalKey: "Membership Code",
      aliases: ["member_code"],
      signals: { label: "Membership Code", name: "member_code" },
      value: "A-42",
    },
  ];

  const updated = organizer.updateEntryAt(entries, 0, {
    category: "身份信息",
    canonicalKey: "会员编号",
    value: "B-88",
    aliasesText: "member_code, 会员号",
  });

  assert.equal(updated[0].category, "身份信息");
  assert.equal(updated[0].canonicalKey, "会员编号");
  assert.equal(updated[0].signals.question, "会员编号");
  assert.equal(updated[0].signals.label, "会员编号");
  assert.equal(updated[0].value, "B-88");
  assert.equal(JSON.stringify(updated[0].aliases), JSON.stringify(["member_code", "会员号"]));
});

test("updateEntryAt updates the actual choice value when its visible option changes", () => {
  const organizer = loadOrganizer();
  const entries = [
    {
      category: "其他",
      canonicalKey: "是否需要签证赞助",
      signals: { question: "Will you require visa sponsorship?" },
      value: "yes",
      choice: { value: "yes", text: "Yes", index: 0 },
      options: [
        { value: "yes", text: "Yes" },
        { value: "no", text: "No" },
      ],
    },
  ];

  const updated = organizer.updateEntryAt(entries, 0, { value: "No" });

  assert.equal(updated[0].value, "no");
  assert.equal(updated[0].choice.value, "no");
  assert.equal(updated[0].choice.text, "No");
});

test("deleteEntryAt removes only the selected entry", () => {
  const organizer = loadOrganizer();
  const entries = [
    { signals: { label: "姓名" }, value: "张三" },
    { signals: { label: "邮箱" }, value: "hi@example.com" },
  ];

  const updated = organizer.deleteEntryAt(entries, 0);

  assert.equal(updated.length, 1);
  assert.equal(updated[0].value, "hi@example.com");
});

test("organizeEntries keeps uploaded file metadata", () => {
  const organizer = loadOrganizer();
  const organized = organizer.organizeEntries([
    {
      type: "file",
      signals: { label: "简历", name: "resume" },
      value: "resume.pdf",
      file: {
        name: "resume.pdf",
        type: "application/pdf",
        size: 1024,
        lastModified: 1783540000000,
      },
    },
  ]);

  assert.equal(organized.length, 1);
  assert.equal(organized[0].canonicalKey, "简历");
  assert.equal(organized[0].value, "resume.pdf");
  assert.equal(organized[0].file.type, "application/pdf");
});

test("entryDisplayKey hides machine-generated question ids", () => {
  const organizer = loadOrganizer();
  const entry = {
    signals: {
      name: "question_35380312002",
      id: "field_8f3a91c2",
    },
    value: "yes",
  };

  assert.equal(organizer.entryDisplayKey(entry), "(未命名)");
});

test("organizeEntries does not promote machine-generated ids to canonical titles", () => {
  const organizer = loadOrganizer();
  const organized = organizer.organizeEntries([
    {
      signals: {
        name: "question_35380312002",
      },
      value: "yes",
    },
  ]);

  assert.equal(organized[0].canonicalKey, "(未命名)");
  assert.equal(organized[0].aliases.length, 0);
});

test("organizeEntries hides browser control values like off from titles and aliases", () => {
  const organizer = loadOrganizer();
  const organized = organizer.organizeEntries([
    {
      signals: {
        autocomplete: "off",
      },
      aliases: ["off"],
      value: "true",
    },
  ]);

  assert.equal(organized[0].canonicalKey, "(未命名)");
  assert.equal(organized[0].aliases.length, 0);
});

test("organizeEntries cleans noisy select fallback labels and option dumps", () => {
  const organizer = loadOrganizer();
  const organized = organizer.organizeEntries([
    {
      type: "select",
      category: "其他",
      canonicalKey: "问题-选择",
      signals: {
        name: "select-question_35380313002",
        placeholder: "Please select...",
      },
      aliases: ["Please select...YesNo", "select-question_35380313002"],
      value: "Yes",
      choice: { value: "yes", text: "Yes", index: 1 },
      options: [
        { value: "", text: "Please select..." },
        { value: "yes", text: "Yes" },
        { value: "no", text: "No" },
      ],
    },
  ]);

  assert.equal(organized[0].canonicalKey, "(未命名)");
  assert.equal(organized[0].value, "Yes");
  assert.equal(organized[0].choice.text, "Yes");
  assert.equal(organized[0].aliases.length, 0);
});

test("organizeEntries removes UUID radio ids from aliases", () => {
  const organizer = loadOrganizer();
  const noisyId = "eee140ab-048c-4992-8499-6ec95b650bda_cf0f1bc7-7ce6-4eb3-aebc-b6562141cb68";
  const organized = organizer.organizeEntries([
    {
      type: "custom-choice",
      signals: {
        question: "年龄段",
        id: noisyId,
        name: `${noisyId}-labeled-radio-1`,
      },
      aliases: ["30-39", noisyId, `${noisyId}-labeled-radio-1`],
      value: "30-39",
      choice: { value: "30-39", text: "30-39", index: 1 },
    },
  ]);

  assert.equal(organized[0].canonicalKey, "年龄段");
  assert.equal(JSON.stringify(organized[0].aliases), JSON.stringify(["年龄段"]));
});

test("resolveEntryValueForField splits and joins names based on target field", () => {
  const organizer = loadOrganizer();
  const entries = [
    {
      signals: { label: "姓名" },
      value: "Qian Zhao",
    },
  ];

  assert.equal(
    organizer.resolveEntryValueForField({ label: "First name", name: "first_name" }, entries[0], entries),
    "Qian",
  );
  assert.equal(
    organizer.resolveEntryValueForField({ label: "Last name", name: "last_name" }, entries[0], entries),
    "Zhao",
  );
  assert.equal(
    organizer.resolveEntryValueForField({ label: "Full name", name: "full_name" }, entries[0], entries),
    "Qian Zhao",
  );
});

test("resolveEntryValueForField joins separate first and last name entries for full-name fields", () => {
  const organizer = loadOrganizer();
  const entries = [
    { signals: { label: "名" }, value: "Qian" },
    { signals: { label: "姓" }, value: "Zhao" },
  ];

  assert.equal(
    organizer.resolveEntryValueForField({ label: "姓名", name: "full_name" }, entries[0], entries),
    "Qian Zhao",
  );
});

test("passport fields group into 证件 category with travel document aliases", () => {
  const organizer = loadOrganizer();
  const entries = organizer.organizeEntries([
    { signals: { label: "Travel Document Number", name: "", id: "", placeholder: "", ariaLabel: "", autocomplete: "" }, value: "E12345678" },
    { signals: { label: "护照号码", name: "", id: "", placeholder: "", ariaLabel: "", autocomplete: "" }, value: "E12345678" },
  ]);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].category, "证件");
  assert.equal(entries[0].canonicalKey, "护照号码");
});

test("valueSynonyms maps passport across Chinese and English option wordings", () => {
  const organizer = loadOrganizer();
  const synonyms = organizer.valueSynonyms("护照");

  assert.ok(synonyms.includes("ordinarypassport"));
  assert.ok(synonyms.includes("traveldocument"));
  assert.ok(!synonyms.includes("passport"));
  assert.ok(!synonyms.includes("diplomaticpassport"));
  assert.ok(!synonyms.includes("护照"));
  assert.equal(organizer.valueSynonyms("不存在的值").length, 0);
});

test("Schengen form fields group into travel and identity categories", () => {
  const organizer = loadOrganizer();
  const blank = { name: "", id: "", placeholder: "", ariaLabel: "", autocomplete: "" };
  const entries = organizer.organizeEntries([
    { signals: { ...blank, label: "Main purpose(s) of the journey" }, value: "旅游" },
    { signals: { ...blank, label: "Number of entries requested" }, value: "多次" },
    { signals: { ...blank, label: "Surname at birth (Former family name(s))" }, value: "王" },
    { signals: { ...blank, label: "Member State of first entry" }, value: "法国" },
    { signals: { ...blank, label: "Current occupation" }, value: "工程师" },
  ]);

  const byKey = Object.fromEntries(entries.map((e) => [e.canonicalKey, e.category]));
  assert.equal(byKey["旅行目的"], "旅行");
  assert.equal(byKey["入境次数"], "旅行");
  assert.equal(byKey["出生时姓氏"], "身份信息");
  assert.equal(byKey["首次入境国家"], "旅行");
  assert.equal(byKey["职业"], "公司/工作");
});

test("valueSynonyms cover Schengen option wordings", () => {
  const organizer = loadOrganizer();
  assert.ok(organizer.valueSynonyms("旅游").includes("tourism"));
  assert.ok(organizer.valueSynonyms("多次").includes("multipleentries"));
  assert.ok(organizer.valueSynonyms("本人承担").includes("bytheapplicanthimselfherself"));
  assert.ok(organizer.valueSynonyms("法国").includes("france"));
  assert.ok(organizer.valueSynonyms("丧偶").includes("widower"));
});
