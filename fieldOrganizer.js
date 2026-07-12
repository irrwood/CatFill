// Shared field cleanup helpers for popup, side panel, background tests.
(() => {
  const CATEGORY_ORDER = ["身份信息", "证件", "联系方式", "地址", "教育", "公司/工作", "旅行", "其他"];

  const FIELD_DEFINITIONS = [
    {
      category: "身份信息",
      canonicalKey: "姓名",
      canonicalKeyEn: "Full name",
      aliases: ["姓名", "名字", "name", "full name", "fullname", "full_name", "contact name"],
    },
    {
      category: "身份信息",
      canonicalKey: "名",
      canonicalKeyEn: "First name",
      aliases: ["名", "first name", "firstname", "first_name", "given name", "given_name", "prénom", "prénoms", "nom usuel", "nombre", "nombres"],
    },
    {
      category: "身份信息",
      canonicalKey: "姓",
      canonicalKeyEn: "Last name",
      aliases: ["姓", "last name", "lastname", "last_name", "family name", "family_name", "surname", "nom de famille", "apellido", "apellidos"],
    },
    {
      category: "联系方式",
      canonicalKey: "邮箱",
      canonicalKeyEn: "Email",
      aliases: ["邮箱", "电子邮件", "邮件", "email", "e-mail", "mail", "email address", "email_address", "adresse électronique", "dirección de correo electrónico", "correo electrónico"],
    },
    {
      category: "联系方式",
      canonicalKey: "手机",
      canonicalKeyEn: "Phone",
      aliases: ["手机", "手机号", "电话", "联系电话", "phone", "mobile", "tel", "telephone", "phone number", "phone_number", "numéro de téléphone", "número de teléfono", "números de teléfono"],
    },
    {
      category: "地址",
      canonicalKey: "地址",
      canonicalKeyEn: "Address",
      aliases: ["地址", "详细地址", "address", "street address", "street_address", "addr", "adresse du domicile", "domicilio postal", "dirección del solicitante"],
    },
    {
      category: "地址",
      canonicalKey: "城市",
      canonicalKeyEn: "City",
      aliases: ["城市", "市", "city", "locality"],
    },
    {
      category: "地址",
      canonicalKey: "省/州",
      canonicalKeyEn: "State / Province",
      aliases: ["省", "州", "省份", "state", "province", "region"],
    },
    {
      category: "地址",
      canonicalKey: "邮编",
      canonicalKeyEn: "Postal code",
      aliases: ["邮编", "邮政编码", "postcode", "postal code", "postal_code", "zip", "zip code", "zipcode"],
    },
    {
      category: "地址",
      canonicalKey: "国家/地区",
      canonicalKeyEn: "Country / Region",
      aliases: ["国家", "地区", "country", "country name", "country_name"],
    },
    {
      category: "公司/工作",
      canonicalKey: "公司",
      canonicalKeyEn: "Company",
      aliases: ["公司", "单位", "组织", "company", "organization", "organisation", "employer"],
    },
    {
      category: "公司/工作",
      canonicalKey: "职位",
      canonicalKeyEn: "Job title",
      aliases: ["职位", "职务", "岗位", "title", "job title", "job_title", "position", "role"],
    },
    {
      category: "身份信息",
      canonicalKey: "出生日期",
      canonicalKeyEn: "Date of birth",
      aliases: ["出生日期", "生日", "出生年月", "出生年月日", "date of birth", "dob", "birth date", "birthdate", "birthday", "date de naissance", "fecha de nacimiento"],
    },
    {
      category: "身份信息",
      canonicalKey: "性别",
      canonicalKeyEn: "Gender",
      aliases: ["性别", "gender", "sex", "sexe", "sexo"],
    },
    {
      category: "身份信息",
      canonicalKey: "国籍",
      canonicalKeyEn: "Nationality",
      aliases: ["国籍", "nationality", "current nationality", "citizenship", "country of citizenship", "nationalité actuelle", "nacionalidad actual"],
    },
    {
      category: "身份信息",
      canonicalKey: "出生国籍",
      canonicalKeyEn: "Nationality at birth",
      aliases: ["出生国籍", "出生时国籍", "nationality at birth", "nationalité à la naissance", "nacionalidad de nacimiento"],
    },
    {
      // 申根表 5/6 是两个独立字段：出生地（城市）与出生国家，不能合并成一组
      category: "身份信息",
      canonicalKey: "出生地",
      canonicalKeyEn: "Place of birth",
      aliases: ["出生地", "place of birth", "birthplace", "city of birth", "出生城市", "lieu de naissance", "lugar de nacimiento"],
    },
    {
      category: "身份信息",
      canonicalKey: "出生国家",
      canonicalKeyEn: "Country of birth",
      aliases: ["出生国家", "country of birth", "pays de naissance", "país de nacimiento"],
    },
    {
      category: "身份信息",
      canonicalKey: "出生时姓氏",
      canonicalKeyEn: "Surname at birth",
      aliases: ["出生时姓氏", "曾用姓", "婚前姓", "surname at birth", "former family name", "former family names", "maiden name", "nom à la naissance", "nom de famille antérieur", "apellidos de nacimiento", "apellidos anteriores"],
    },
    {
      category: "身份信息",
      canonicalKey: "婚姻状况",
      canonicalKeyEn: "Marital status",
      aliases: ["婚姻状况", "婚姻", "marital status", "civil status", "état civil", "estado civil"],
    },
    {
      category: "身份信息",
      canonicalKey: "监护人",
      canonicalKeyEn: "Legal guardian",
      aliases: ["监护人", "法定监护人", "parental authority", "legal guardian", "autorité parentale", "tuteur légal", "patria potestad", "tutor legal"],
    },
    {
      category: "身份信息",
      canonicalKey: "民族",
      canonicalKeyEn: "Ethnicity",
      aliases: ["民族", "ethnicity", "ethnic group"],
    },
    {
      category: "身份信息",
      canonicalKey: "中间名",
      canonicalKeyEn: "Middle name",
      aliases: ["中间名", "middle name", "middle_name", "middlename"],
    },
    {
      category: "身份信息",
      canonicalKey: "称谓",
      canonicalKeyEn: "Salutation",
      aliases: ["称谓", "salutation", "name prefix", "honorific"],
    },
    {
      category: "证件",
      canonicalKey: "护照号码",
      canonicalKeyEn: "Passport number",
      aliases: ["护照号", "护照号码", "passport number", "passport no", "passport_number", "travel document number", "旅行证件号码", "numéro du document de voyage", "número de documento de viaje"],
    },
    {
      category: "证件",
      canonicalKey: "证件类型",
      canonicalKeyEn: "Document type",
      aliases: ["证件类型", "证件种类", "document type", "id type", "travel document type", "type of travel document", "type de document de voyage", "tipo de documento de viaje"],
    },
    {
      category: "证件",
      canonicalKey: "证件号码",
      canonicalKeyEn: "ID number",
      aliases: ["证件号码", "证件号", "id number", "document number", "identification number", "national id number", "身份证号", "身份证号码", "numéro national d’identité", "número de documento nacional de identidad"],
    },
    {
      category: "证件",
      canonicalKey: "签发日期",
      canonicalKeyEn: "Date of issue",
      aliases: ["签发日期", "颁发日期", "date of issue", "issue date", "issued on", "date de délivrance", "fecha de expedición"],
    },
    {
      category: "证件",
      canonicalKey: "证件有效期",
      canonicalKeyEn: "Date of expiry",
      aliases: ["有效期", "有效期至", "expiry date", "date of expiry", "expiration date", "valid until", "expires", "date d’expiration", "date d'expiration", "válido hasta"],
    },
    {
      category: "证件",
      canonicalKey: "签发地",
      canonicalKeyEn: "Place of issue",
      aliases: ["签发地", "签发机关", "发证机关", "place of issue", "issuing authority", "issued by", "délivré par", "expedido por"],
    },
    {
      category: "证件",
      canonicalKey: "签证类型",
      canonicalKeyEn: "Visa type",
      aliases: ["签证类型", "visa type", "type of visa", "visa category", "visa class"],
    },
    {
      category: "证件",
      canonicalKey: "居留许可",
      canonicalKeyEn: "Residence permit",
      aliases: ["居留许可", "居留许可号码", "residence permit", "residence permit or equivalent", "residence permit number", "titre de séjour", "document équivalent", "permiso de residencia", "documento equivalente"],
    },
    {
      category: "公司/工作",
      canonicalKey: "职业",
      canonicalKeyEn: "Occupation",
      aliases: ["职业", "当前职业", "current occupation", "occupation", "profession", "profession actuelle", "profesión actual"],
    },
    {
      category: "旅行",
      canonicalKey: "旅行目的",
      canonicalKeyEn: "Purpose of journey",
      aliases: ["旅行目的", "出行目的", "访问目的", "purpose of journey", "purpose of the journey", "purposes of the journey", "main purpose of the journey", "main purposes of the journey", "purpose of travel", "purpose of visit", "travel purpose", "journey purpose", "objet du voyage", "objets du voyage", "motivo del viaje", "motivos del viaje"],
    },
    {
      category: "旅行",
      canonicalKey: "目的地国家",
      canonicalKeyEn: "Destination country",
      aliases: ["目的地国家", "目的地", "主要目的地", "member state of destination", "member states of destination", "main destination", "country of destination", "destination country", "état membre de destination principale", "estado miembro de destino principal"],
    },
    {
      category: "旅行",
      canonicalKey: "首次入境国家",
      canonicalKeyEn: "Country of first entry",
      aliases: ["首次入境国家", "首次入境成员国", "member state of first entry", "country of first entry", "first entry", "état membre de première entrée", "estado miembro de la primera entrada"],
    },
    {
      category: "旅行",
      canonicalKey: "入境次数",
      canonicalKeyEn: "Number of entries",
      aliases: ["入境次数", "number of entries", "number of entries requested", "entries requested", "nombre d’entrées demandées", "nombre d'entrées demandées", "número de entradas que solicita"],
    },
    {
      category: "旅行",
      canonicalKey: "停留天数",
      canonicalKeyEn: "Duration of stay",
      aliases: ["停留天数", "停留时间", "duration of stay", "duration of the intended stay", "number of days", "intended stay"],
    },
    {
      category: "旅行",
      canonicalKey: "入境日期",
      canonicalKeyEn: "Date of arrival",
      aliases: ["入境日期", "抵达日期", "到达日期", "intended date of arrival", "date of arrival", "arrival date", "date d’arrivée prévue", "fecha prevista de llegada"],
    },
    {
      category: "旅行",
      canonicalKey: "离境日期",
      canonicalKeyEn: "Date of departure",
      aliases: ["离境日期", "intended date of departure", "date of departure", "departure date", "date de départ prévue", "fecha prevista de salida"],
    },
    {
      category: "旅行",
      canonicalKey: "邀请人/住宿",
      canonicalKeyEn: "Inviting person / accommodation",
      aliases: ["邀请人", "inviting person", "surname and first name of the inviting person", "name of hotel", "temporary accommodation", "酒店名称", "住宿地址", "accommodation", "personnes qui invitent", "hôtels", "hébergement temporaire", "persona que ha emitido la invitación", "alojamiento provisional"],
    },
    {
      category: "旅行",
      canonicalKey: "邀请单位",
      canonicalKeyEn: "Inviting company",
      aliases: ["邀请单位", "邀请公司", "邀请机构", "inviting company", "inviting organisation", "inviting company/organisation", "entreprise hôte", "organisation hôte", "empresa que ha emitido la invitación", "organización que ha emitido la invitación"],
    },
    {
      category: "旅行",
      canonicalKey: "费用承担",
      canonicalKeyEn: "Cost coverage",
      aliases: ["费用承担", "费用来源", "cost of travelling", "cost of travelling and living", "means of support", "frais de voyage et de subsistance", "moyens de subsistance", "gastos de viaje y subsistencia", "medios de subsistencia"],
    },
    {
      category: "旅行",
      canonicalKey: "旅行保险",
      canonicalKeyEn: "Travel insurance",
      aliases: ["旅行保险", "医疗保险", "travel insurance", "travel medical insurance"],
    },
    {
      category: "身份信息",
      canonicalKey: "其他国籍",
      canonicalKeyEn: "Other nationalities",
      aliases: ["其他国籍", "other nationalities", "other nationalies", "autres nationalités", "otras nacionalidades"],
    },
    {
      category: "身份信息",
      canonicalKey: "欧盟家庭成员关系",
      canonicalKeyEn: "Relationship to EU family member",
      aliases: ["欧盟家庭成员关系", "family relationship with an eu citizen", "family relationship with an eea citizen", "family relationship with a ch citizen", "lien de parenté avec un ressortissant de l’ue", "lien de parenté avec un ressortissant de l'ue", "relación de parentesco con un ciudadano de la ue"],
    },
    {
      category: "身份信息",
      canonicalKey: "是否居住在国籍国以外",
      canonicalKeyEn: "Residence outside country of nationality",
      aliases: ["是否居住在国籍国以外", "residence in a country other than the country of current nationality", "résidence dans un pays autre que celui de la nationalité actuelle", "residente en un país distinto del país de nacionalidad actual"],
    },
    {
      category: "旅行",
      canonicalKey: "旅行目的补充说明",
      canonicalKeyEn: "Additional purpose of stay",
      aliases: ["旅行目的补充说明", "additional information on purpose of stay", "additional information on purpose of the stay", "informations complémentaires sur l'objet du voyage", "informations complémentaires sur l’objet du voyage", "información adicional sobre el motivo de la estancia"],
    },
    {
      category: "证件",
      canonicalKey: "曾采集申根指纹",
      canonicalKeyEn: "Previous Schengen fingerprints",
      aliases: ["曾采集申根指纹", "fingerprints collected previously for the purpose of applying for a schengen visa", "previous schengen visa fingerprints", "empreintes digitales relevées précédemment aux fins d’une demande de visa schengen", "impresiones dactilares tomadas anteriormente para solicitudes de visados schengen"],
    },
    {
      category: "证件",
      canonicalKey: "以往申根签证号码",
      canonicalKeyEn: "Previous Schengen visa number",
      aliases: ["以往申根签证号码", "visa sticker number if known", "previous visa number", "numéro du visa s’il est connu", "numéro du visa s'il est connu", "número de visado si se conoce"],
    },
    {
      category: "旅行",
      canonicalKey: "最终目的地入境许可",
      canonicalKeyEn: "Final destination entry permit",
      aliases: ["最终目的地入境许可", "entry permit for the final country of destination", "entry permit for final country of destination", "autorisation d’entrée dans le pays de destination finale", "autorisation d'entrée dans le pays de destination finale", "permiso de entrada al país de destino final"],
    },
    {
      category: "身份信息",
      canonicalKey: "申请表代填人",
      canonicalKeyEn: "Person completing the application",
      aliases: ["申请表代填人", "person filling in the application form if different from the applicant", "person completing the application", "personne qui remplit le formulaire de demande si elle n’est pas le demandeur", "personne qui remplit le formulaire de demande si elle n'est pas le demandeur", "persona que cumplimenta el impreso de solicitud si no se trata del propio solicitante"],
    },
    {
      category: "教育",
      canonicalKey: "学校",
      canonicalKeyEn: "School",
      aliases: ["学校", "毕业院校", "院校", "university", "school", "college", "institution", "alma mater"],
    },
    {
      category: "教育",
      canonicalKey: "专业",
      canonicalKeyEn: "Major",
      aliases: ["专业", "所学专业", "major", "field of study", "discipline"],
    },
    {
      category: "教育",
      canonicalKey: "学历",
      canonicalKeyEn: "Education level",
      aliases: ["学历", "最高学历", "学位", "education level", "degree", "highest degree", "qualification"],
    },
    {
      category: "教育",
      canonicalKey: "毕业时间",
      canonicalKeyEn: "Graduation date",
      aliases: ["毕业时间", "毕业日期", "毕业年份", "graduation date", "graduation year", "date of graduation"],
    },
    {
      category: "联系方式",
      canonicalKey: "微信",
      canonicalKeyEn: "WeChat",
      aliases: ["微信", "微信号", "wechat", "weixin", "wechat id"],
    },
    {
      category: "联系方式",
      canonicalKey: "QQ",
      canonicalKeyEn: "QQ",
      aliases: ["qq", "qq号"],
    },
    {
      category: "联系方式",
      canonicalKey: "LinkedIn",
      canonicalKeyEn: "LinkedIn",
      aliases: ["linkedin", "领英", "linkedin url", "linkedin profile"],
    },
    {
      category: "联系方式",
      canonicalKey: "GitHub",
      canonicalKeyEn: "GitHub",
      aliases: ["github", "github url"],
    },
    {
      category: "联系方式",
      canonicalKey: "个人网站",
      canonicalKeyEn: "Website",
      aliases: ["个人网站", "个人主页", "网站", "website", "personal website", "portfolio", "homepage"],
    },
    {
      category: "联系方式",
      canonicalKey: "紧急联系人",
      canonicalKeyEn: "Emergency contact",
      aliases: ["紧急联系人", "emergency contact", "emergency contact name"],
    },
    {
      category: "地址",
      canonicalKey: "区县",
      canonicalKeyEn: "District",
      aliases: ["区县", "district", "county"],
    },
    {
      category: "公司/工作",
      canonicalKey: "部门",
      canonicalKeyEn: "Department",
      aliases: ["部门", "department", "division"],
    },
    {
      category: "公司/工作",
      canonicalKey: "工作年限",
      canonicalKeyEn: "Years of experience",
      aliases: ["工作年限", "工作经验年限", "years of experience"],
    },
    {
      category: "公司/工作",
      canonicalKey: "期望薪资",
      canonicalKeyEn: "Expected salary",
      aliases: ["期望薪资", "薪资要求", "expected salary", "salary expectation", "desired salary", "desired compensation"],
    },
    {
      category: "公司/工作",
      canonicalKey: "到岗时间",
      canonicalKeyEn: "Available start date",
      aliases: ["到岗时间", "入职时间", "start date", "available start date", "earliest start date", "date available", "availability"],
    },
  ];

  function norm(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[\s:*：、（）()\[\]\-\/.]+/g, "")
      .replace(/_/g, "")
      .trim();
  }

  // 选项值同义词：解决"资料存的是「护照」、页面选项写的是 Ordinary Passport / Travel Document"。
  // 每组必须在填表意图上严格等价，宁缺勿滥——错误合并会导致选错项。
  const VALUE_SYNONYM_GROUPS = [
    ["护照", "普通护照", "ordinary passport", "travel document", "旅行证件", "passeport ordinaire", "pasaporte ordinario"],
    ["身份证", "居民身份证", "id card", "national id", "identity card", "resident identity card"],
    ["中国", "中华人民共和国", "china", "people's republic of china", "prc", "中国大陆", "mainland china", "china mainland"],
    ["男", "男性", "male", "m", "masculin", "varón"],
    ["女", "女性", "female", "f", "féminin", "mujer"],
    ["是", "yes", "true", "oui", "sí", "si"],
    ["否", "no", "false", "non"],
    ["已婚", "married", "marié", "mariée", "casado", "casada"],
    ["未婚", "单身", "single", "unmarried", "célibataire", "soltero", "soltera"],
    ["本科", "学士", "bachelor", "bachelors", "bachelor's degree", "bachelor degree", "undergraduate degree"],
    ["硕士", "硕士研究生", "研究生", "master", "masters", "master's degree", "master degree", "postgraduate"],
    ["博士", "博士研究生", "phd", "doctorate", "doctoral degree", "doctor of philosophy"],
    ["大专", "专科", "associate degree", "associate", "diploma"],
    ["高中", "high school", "senior high school"],
    ["汉族", "han", "han chinese"],
    // —— 申根签证表（欧盟统一格式）选项原文 ——
    // 婚姻状况（字段 9）
    ["注册伴侣", "registered partnership", "partenariat enregistré", "pareja de hecho registrada"],
    ["分居", "separated", "séparé", "séparée", "separado", "separada"],
    ["离异", "离婚", "divorced", "divorcé", "divorcée", "divorciado", "divorciada"],
    ["丧偶", "widowed", "widow", "widower", "widow(er)", "veuf", "veuve", "viudo", "viuda"],
    // 护照类型（字段 12）
    ["外交护照", "diplomatic passport", "passeport diplomatique", "pasaporte diplomático"],
    ["公务护照", "service passport", "passeport de service", "pasaporte de servicio"],
    ["因公护照", "official passport", "passeport officiel", "pasaporte oficial"],
    ["特殊护照", "special passport", "passeport spécial", "pasaporte especial"],
    // 旅行目的（字段 21）
    ["旅游", "观光", "tourism", "tourist", "tourisme", "turismo"],
    ["商务", "出差", "business", "affaires", "negocios"],
    ["探亲访友", "探亲", "访友", "visiting family or friends", "family visit", "visit family or friends", "visiting relatives", "visite à la famille ou à des amis", "visita a familiares o amigos"],
    ["文化", "文化活动", "cultural", "culture", "cultura"],
    ["体育", "sports", "sport", "deportivo"],
    ["官方访问", "official visit", "visite officielle", "visita oficial"],
    ["医疗", "就医", "medical reasons", "medical treatment", "medical", "raisons médicales", "motivos médicos"],
    ["学习", "留学", "study", "études", "estudios"],
    ["过境", "transit", "tránsito"],
    ["机场过境", "airport transit", "transit aéroportuaire", "tránsito aeroportuario"],
    // 入境次数（字段 24）
    ["一次", "单次", "一次入境", "single entry", "single", "one entry", "1", "une entrée", "una"],
    ["两次", "两次入境", "two entries", "double entry", "2", "deux entrées", "dos"],
    ["多次", "多次入境", "multiple entries", "multiple", "mult", "entrées multiples", "múltiples"],
    // 费用承担与支付方式（字段 33）
    ["本人承担", "本人", "by the applicant himself/herself", "by the applicant", "self", "myself", "par le demandeur", "por el solicitante"],
    ["担保人承担", "担保人", "by a sponsor", "sponsor", "par un garant", "por un patrocinador"],
    ["现金", "cash", "argent liquide", "efectivo"],
    ["信用卡", "credit card", "carte de crédit", "tarjeta de crédito"],
    ["旅行支票", "traveller's cheques", "travelers cheques", "traveler's checks", "chèques de voyage", "cheques de viaje"],
    ["预付住宿", "pre-paid accommodation", "prepaid accommodation", "hébergement prépayé", "alojamiento ya pagado"],
    ["预付交通", "pre-paid transport", "prepaid transport", "transport prépayé", "transporte ya pagado"],
    ["提供住宿", "accommodation provided", "hébergement fourni", "alojamiento facilitado"],
    ["全部费用已承担", "all expenses covered", "all expenses covered during the stay", "tous les frais sont financés pendant le séjour", "todos los gastos de estancia cubiertos"],
    // 常用国家名（目的地/首次入境/国籍选择）
    ["法国", "france"],
    ["德国", "germany"],
    ["意大利", "italy"],
    ["西班牙", "spain"],
    ["荷兰", "netherlands", "the netherlands", "holland"],
    ["瑞士", "switzerland"],
    ["希腊", "greece"],
    ["葡萄牙", "portugal"],
    ["奥地利", "austria"],
    ["比利时", "belgium"],
    ["丹麦", "denmark"],
    ["瑞典", "sweden"],
    ["挪威", "norway"],
    ["芬兰", "finland"],
    ["波兰", "poland"],
    ["捷克", "czech republic", "czechia"],
    ["匈牙利", "hungary"],
    ["美国", "united states", "united states of america", "usa"],
    ["英国", "united kingdom", "uk", "great britain", "britain"],
    ["日本", "japan"],
  ];
  let normalizedValueSynonyms = null;

  // 输入输出都是 norm() 后的文本；返回同组的其他写法
  function valueSynonyms(normalizedValue) {
    if (!normalizedValue) return [];
    normalizedValueSynonyms ??= VALUE_SYNONYM_GROUPS.map((group) => group.map(norm));
    const out = [];
    for (const group of normalizedValueSynonyms) {
      if (!group.includes(normalizedValue)) continue;
      for (const item of group) {
        if (item !== normalizedValue && !out.includes(item)) out.push(item);
      }
    }
    return out;
  }

  function isMachineSignal(text) {
    const value = String(text || "").trim();
    if (!value) return true;
    const compact = value.toLowerCase();
    const uuidPattern = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
    if (["on", "off", "true", "false", "yes", "no", "checked", "unchecked"].includes(compact)) return true;
    if (["please select", "please select...", "select", "选择", "请选择", "问题-选择", "问题选择"].includes(compact)) return true;
    if (new RegExp(`^${uuidPattern}(_${uuidPattern})?(-[a-z]+-[a-z]+-\\d+)?$`, "i").test(compact)) return true;
    if (new RegExp(uuidPattern, "i").test(compact) && compact.length > 24) return true;
    if (/^(select|radio|checkbox)[_-]?(question|field|input|answer|response|item|option)[_-]?\d{4,}$/i.test(compact)) return true;
    if (/^(question|field|input|answer|response|item|option)[_-]?\d{4,}$/i.test(compact)) return true;
    if (/^(question|field|input|answer|response|item|option)[_-]?[a-f0-9]{8,}$/i.test(compact)) return true;
    if (/^[a-z0-9_-]{24,}-(labeled|labelled)?-?(radio|checkbox|select|option)-\d+$/i.test(compact)) return true;
    if (/^[a-f0-9]{12,}$/i.test(compact)) return true;
    if (/^\d{4,}$/.test(compact)) return true;
    return false;
  }

  function humanSignal(text) {
    const value = String(text || "").trim();
    return isMachineSignal(value) ? "" : value;
  }

  function looksLikeOptionDump(text, options = []) {
    const compact = norm(text);
    if (!compact || options.length < 2) return false;
    const optionText = options.map((option) => norm(option.text || option.value)).filter(Boolean).join("");
    return optionText && (compact === optionText || compact.includes(optionText));
  }

  function cleanAlias(alias, entry) {
    const value = humanSignal(alias);
    if (!value) return "";
    if (looksLikeOptionDump(value, entry?.options || [])) return "";
    if (entry?.choice && [entry.choice.value, entry.choice.text, entry.value].some((choiceValue) => norm(choiceValue) === norm(value))) return "";
    return value;
  }

  function signalsFor(entry) {
    const signals = entry?.signals || {};
    return ["question", "label", "name", "placeholder", "ariaLabel", "id", "autocomplete"]
      .map((key) => humanSignal(signals[key]))
      .filter(Boolean);
  }

  function entryDisplayKey(entry) {
    return (
      humanSignal(entry?.canonicalKey) ||
      humanSignal(entry?.signals?.question) ||
      humanSignal(entry?.signals?.label) ||
      humanSignal(entry?.signals?.placeholder) ||
      humanSignal(entry?.signals?.ariaLabel) ||
      humanSignal(entry?.signals?.name) ||
      humanSignal(entry?.signals?.id) ||
      humanSignal(entry?.signals?.autocomplete) ||
      "(未命名)"
    );
  }

  function isFullQuestionText(text) {
    const value = String(text || "").trim();
    const compact = norm(value);
    if (!compact) return false;
    if (/[?？]/.test(value)) return true;
    if (/^(will|would|do|does|did|are|is|can|could|may|have|has|what|which|when|where|why|how)\b/i.test(value)) return true;
    if (/^(是否|您是否|你是否|请选择|请问|哪一|什么|何时|为什么|如何)/.test(value)) return true;
    return compact.length >= 18 && /(consent|permission|sponsorship|authorization|authorized|identity|preference|community|gender|voluntary|acknowledge)/.test(compact);
  }

  function choiceQuestionDefinition(entry) {
    if (!entry?.choice) return null;
    const question = humanSignal(entry.signals?.question);
    if (isFullQuestionText(question)) {
      return {
        category: "其他",
        canonicalKey: question,
        aliases: [],
      };
    }
    return null;
  }

  function matchDefinition(entry, language = "zh") {
    const choiceDefinition = choiceQuestionDefinition(entry);
    if (choiceDefinition) return choiceDefinition;

    const texts = signalsFor(entry);
    const normalizedTexts = texts.map(norm).filter(Boolean);
    let best = null;
    let bestScore = 0;
    for (const definition of FIELD_DEFINITIONS) {
      const normalizedAliases = definition.aliases.map(norm);
      let score = 0;
      for (const text of normalizedTexts) {
        for (const alias of normalizedAliases) {
          if (!text || !alias) continue;
          if (text === alias) score = Math.max(score, 100 + alias.length);
          else if (text.includes(alias) && alias.length >= 4) score = Math.max(score, 40 + alias.length);
          else if (alias.includes(text) && text.length >= 4) score = Math.max(score, 30 + text.length);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = definition;
      }
    }
    if (best) {
      return {
        ...best,
        canonicalKey: language === "en" ? (best.canonicalKeyEn || best.canonicalKey) : best.canonicalKey,
      };
    }
    return {
      category: "其他",
      canonicalKey: entryDisplayKey(entry),
      aliases: [],
    };
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function mergeSignals(baseSignals = {}, nextSignals = {}) {
    const merged = { ...baseSignals };
    for (const [key, value] of Object.entries(nextSignals)) {
      if (!merged[key] && value) merged[key] = value;
    }
    return merged;
  }

  function organizeEntries(entries = [], options = {}) {
    const language = options.language || "zh";
    const byKey = new Map();
    for (const entry of entries) {
      if (!entry || !entry.value) continue;
      const definition = matchDefinition(entry, language);
      const mapKey = `${definition.category}|${definition.canonicalKey}|${entry.value}`;
      const aliases = unique([...signalsFor(entry), ...(entry.aliases || []).map((alias) => cleanAlias(alias, entry))]);
      const existing = byKey.get(mapKey);
      if (existing) {
        existing.aliases = unique([...existing.aliases, ...aliases]);
        existing.signals = mergeSignals(existing.signals, entry.signals);
        if (!existing.choice && entry.choice) existing.choice = { ...entry.choice };
        if (!existing.options && entry.options) existing.options = [...entry.options];
        if (!existing.file && entry.file) existing.file = { ...entry.file };
      } else {
        byKey.set(mapKey, {
          ...(entry.type ? { type: entry.type } : {}),
          category: definition.category,
          canonicalKey: definition.canonicalKey,
          aliases,
          signals: { ...(entry.signals || {}) },
          ...(entry.choice ? { choice: { ...entry.choice } } : {}),
          ...(entry.options ? { options: [...entry.options] } : {}),
          ...(entry.file ? { file: { ...entry.file } } : {}),
          value: entry.value,
        });
      }
    }

    return [...byKey.values()].sort((a, b) => {
      const categoryDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      if (categoryDiff) return categoryDiff;
      return a.canonicalKey.localeCompare(b.canonicalKey, "zh-CN");
    });
  }

  function groupOrganizedEntries(entries = []) {
    const groups = new Map();
    for (const entry of entries) {
      const category = entry.category || "其他";
      if (!groups.has(category)) groups.set(category, { category, entries: [] });
      groups.get(category).entries.push(entry);
    }
    return [...groups.values()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    );
  }

  function aliasesFromText(text) {
    return unique(
      String(text || "")
        .split(/[,，\n]/)
        .map((item) => item.trim()),
    );
  }

  function updateEntryAt(entries = [], index, patch = {}) {
    return entries.map((entry, currentIndex) => {
      if (currentIndex !== index) return entry;
      const canonicalKey = (patch.canonicalKey || entry.canonicalKey || entryDisplayKey(entry)).trim();
      const displayValue = patch.value !== undefined ? String(patch.value).trim() : (entry.choice?.text || entry.value);
      const selectedOption = entry.options?.find((option) =>
        norm(option.text) === norm(displayValue) || norm(option.value) === norm(displayValue));
      const choiceValue = selectedOption?.value || displayValue;
      const value = entry.choice ? choiceValue : displayValue;
      const aliases = patch.aliasesText !== undefined ? aliasesFromText(patch.aliasesText) : entry.aliases || [];
      return {
        ...entry,
        category: patch.category || entry.category || "其他",
        canonicalKey,
        aliases,
        signals: {
          ...(entry.signals || {}),
          question: canonicalKey,
          label: canonicalKey,
        },
        ...(entry.choice ? { choice: { ...entry.choice, value: choiceValue, text: displayValue } } : {}),
        value,
      };
    });
  }

  function deleteEntryAt(entries = [], index) {
    return entries.filter((_, currentIndex) => currentIndex !== index);
  }

  // 逐个信号判断，中文用精确匹配。
  // 千万不要在拼接后的长串上跑 /名/ 这类单字正则——"公司名""职位名称""用户名"全会误中。
  function signalValues(signals = {}) {
    return [
      signals.question,
      signals.label,
      signals.name,
      signals.placeholder,
      signals.ariaLabel,
      signals.id,
      signals.autocomplete,
    ].map(norm).filter(Boolean);
  }

  function isFirstNameField(signals = {}) {
    const parts = signalValues(signals);
    if (parts.some((p) => /firstname|givenname/.test(p))) return true;
    return parts.some((p) => p === "名" || p === "名字");
  }

  function isLastNameField(signals = {}) {
    const parts = signalValues(signals);
    if (parts.some((p) => /lastname|familyname|surname/.test(p))) return true;
    return parts.some((p) => p === "姓" || p === "姓氏");
  }

  function isFullNameField(signals = {}) {
    const parts = signalValues(signals);
    if (parts.some((p) => /fullname|contactname/.test(p))) return true;
    if (parts.some((p) => p === "姓名" || p === "全名" || p === "name" || p === "yourname")) return true;
    return false;
  }

  function splitName(value = "") {
    const parts = String(value).trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { first: value, last: "" };
    return {
      first: parts.slice(0, -1).join(" "),
      last: parts[parts.length - 1],
    };
  }

  function findEntry(entries, predicate) {
    return entries.find((entry) => predicate(entry.signals || {}, entry));
  }

  function resolveEntryValueForField(fieldSignals = {}, entry = {}, allEntries = []) {
    if (!entry || entry.choice || entry.file) return entry?.value || "";
    const currentValue = entry.value || "";
    const fullNameEntry = findEntry(allEntries, (signals) => isFullNameField(signals));
    const firstNameEntry = findEntry(allEntries, (signals) => isFirstNameField(signals));
    const lastNameEntry = findEntry(allEntries, (signals) => isLastNameField(signals));

    if (isFirstNameField(fieldSignals)) {
      if (firstNameEntry) return firstNameEntry.value;
      if (fullNameEntry) return splitName(fullNameEntry.value).first;
      if (isFullNameField(entry.signals)) return splitName(currentValue).first;
    }
    if (isLastNameField(fieldSignals)) {
      if (lastNameEntry) return lastNameEntry.value;
      if (fullNameEntry) return splitName(fullNameEntry.value).last;
      if (isFullNameField(entry.signals)) return splitName(currentValue).last;
    }
    if (isFullNameField(fieldSignals)) {
      if (fullNameEntry) return fullNameEntry.value;
      if (firstNameEntry || lastNameEntry) {
        return [firstNameEntry?.value, lastNameEntry?.value].filter(Boolean).join(" ");
      }
    }
    return currentValue;
  }

  globalThis.CatFillFieldOrganizer = {
    CATEGORY_ORDER,
    FIELD_DEFINITIONS,
    VALUE_SYNONYM_GROUPS,
    deleteEntryAt,
    entryDisplayKey,
    groupOrganizedEntries,
    isMachineSignal,
    organizeEntries,
    resolveEntryValueForField,
    updateEntryAt,
    valueSynonyms,
  };
})();
