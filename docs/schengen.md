# 申根签证表格适配（2026-07-11）

## 调研结论

申根短期签证使用**欧盟统一申请表**（《签证法典》Regulation (EC) No 810/2009 附件 I，"Harmonised application form"，共 37 个字段）。VFS Global、TLScontact、France-Visas、德国 VIDEX、荷兰、西班牙 BLS 等在线门户的字段措辞都直接沿用该表原文——**适配这份表 = 适配主流申根申请渠道**。调研以官方 PDF 原文为准（经 VFS Global 分发版核对）。

## 字段覆盖（37 项 → 词典组）

| # | 官方字段 | 词典组（分类） |
|---|---|---|
| 1 | Surname (Family name) | 姓（身份信息，原有） |
| 2 | Surname at birth (Former family name(s)) | **出生时姓氏**（新增） |
| 3 | First name(s) (Given name(s)) | 名（原有） |
| 4 | Date of birth | 出生日期（原有） |
| 5 | Place of birth | 出生地（**已拆分**：只含城市义项） |
| 6 | Country of birth | **出生国家**（新增，与出生地分组——两者是独立字段） |
| 7 | Current nationality / Nationality at birth | 国籍（+current nationality）；**出生国籍**（新增） |
| 8 | Sex | 性别（原有；值组 男/Male、女/Female） |
| 9 | Marital status | 婚姻状况（+civil status；值组新增 Separated/Divorced/Widow(er)） |
| 10 | Parental authority / legal guardian | **监护人**（新增） |
| 11 | National identity number | 证件号码（原有） |
| 12 | Type of travel document | 证件类型（原有；值组：护照/Ordinary passport/Travel document，新增外交护照、公务护照） |
| 13 | Number of travel document | 护照号码（原有，含 travel document number） |
| 14 | Date of issue | 签发日期（原有） |
| 15 | Valid until | 证件有效期（原有） |
| 16 | Issued by | 签发地/签发机关（原有） |
| 17 | Home address and e-mail address / Telephone | 地址、邮箱、手机（原有） |
| 18 | Residence permit or equivalent | **居留许可**（新增） |
| 19 | Current occupation | **职业**（新增） |
| 20 | Employer and employer's address | 公司（原有，employer 别名命中） |
| 21 | Main purpose(s) of the journey | **旅行目的**（新增；值组 10 项：旅游/Tourism、商务/Business、探亲访友/Visiting family or friends、文化、体育、官方访问、医疗、学习、过境、机场过境） |
| 22 | Member State(s) of destination | **目的地国家**（新增） |
| 23 | Member State of first entry | **首次入境国家**（新增） |
| 24 | Number of entries requested | **入境次数**（新增；值组：一次/Single entry、两次/Two entries、多次/Multiple entries） |
| 25 | Duration of the intended stay | **停留天数**（新增） |
| 26 | Schengen visas issued during the past three years | 完整问题，走 question 提取 + AI（是/否值组原有） |
| 27 | Fingerprints collected previously | 同上 |
| 28 | Entry permit for the final country of destination | 同上（签发/有效期子字段命中原有组） |
| 29 | Intended date of arrival | **入境日期**（新增） |
| 30 | Intended date of departure | **离境日期**（新增） |
| 31 | Inviting person(s) / hotel(s) | **邀请人/住宿**（新增） |
| 32 | Inviting company/organisation | **邀请单位**（新增） |
| 33 | Cost of travelling / Means of support | **费用承担**（新增；值组：本人承担/by the applicant himself/herself、担保人/sponsor、现金、信用卡、旅行支票、预付住宿、预付交通、提供住宿、全部费用已承担） |
| 34-35 | EU/EEA/CH family member | 子字段（姓名/出生日期/国籍/证件号）命中原有组；关系选择走 AI |
| 36-37 | Place and date / Signature | 不适配（签名类，不该自动填） |

另补充：**旅行保险**组（门户常见附加字段）、常用国家值组 20 个（申根 17 国 + 美英日，中文 ↔ 英文选项互认）、autocomplete 标准值 `bday`/`sex`/`honorific-prefix`/`additional-name` 映射。

新分类：`证件`、`教育`（上一轮）、`旅行`（本轮），已同步 `CATEGORY_ORDER`、AI 整理 prompt 的分类枚举。

## 验证

- 单元测试：字段归组（旅行目的/入境次数/出生时姓氏/首次入境国家/职业）+ 值同义（旅游→tourism、多次→multiple entries、本人承担、法国→france、丧偶→widower），37 个测试全绿；
- 浏览器端到端（`test/fixture.html` 申根节选，官方措辞）：中文资料 5/5 命中——出生时姓氏"王"、已婚→Married、旅游→Tourism、多次→Multiple entries 单选、法国→France。

## 已知边界

- 表内"完整问题"型字段（26/27/28：过往签证、指纹、最终目的地入境许可）字段名词典不覆盖语义判断，靠 question 提取 + AI 填充的语义门槛处理；
- 官方标签的 "(s)" 复数写法（如 "Main purpose(s) of the journey"）已按归一化后的原文收进别名——**新加官方表格别名时要放归一化后的完整原文**，不要只放单数形式；
- 法语/德语门户界面（法/德文标签）暂未收词，France-Visas 等有英文界面可用；后续引入 Firefox HeuristicsRegExp 词典（见 docs/enhancements.md）可覆盖多语言。
