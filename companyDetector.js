// Detect the employer behind a job page without sending page data anywhere.
globalThis.CatFillCompanyDetector = (() => {
  const PLATFORM_NAMES = new Set([
    "ashby", "glassdoor", "greenhouse", "indeed", "lever", "linkedin",
    "smartrecruiters", "workable", "workday",
  ]);

  function humanizeSlug(value = "") {
    return decodeURIComponent(value)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim();
  }

  function cleanName(value = "") {
    const name = String(value)
      .replace(/\s+/g, " ")
      .replace(/\s*[|·•]\s*(careers?|jobs?|vacancies|open positions?).*$/i, "")
      .replace(/^jobs? (at|with)\s+/i, "")
      .replace(/\s+(careers?|jobs?)$/i, "")
      .trim()
      .replace(/^[\s:–—-]+|[\s:–—-]+$/g, "");
    if (name.length < 2 || name.length > 90 || PLATFORM_NAMES.has(name.toLowerCase())) return "";
    return name;
  }

  function atsCandidate(urlValue = "") {
    let url;
    try { url = new URL(urlValue); } catch { return null; }
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    let slug = "";
    let score = 58;

    if (/^(boards|job-boards(?:\.eu)?)\.greenhouse\.io$/.test(host)) slug = parts[0];
    else if (host === "jobs.lever.co") slug = parts[0];
    else if (host === "jobs.ashbyhq.com") slug = parts[0];
    else if (host === "apply.workable.com") slug = parts[0];
    else if (host === "jobs.smartrecruiters.com") {
      const companyIndex = parts.findIndex((part) => part.toLowerCase() === "company");
      slug = url.searchParams.get("dcr_ci") || (companyIndex >= 0 ? parts[companyIndex + 1] : "") || parts[0];
      if (url.searchParams.get("dcr_ci") || companyIndex >= 0) score = 86;
    }
    else if (/\.myworkdayjobs\.com$/.test(host)) slug = host.split(".")[0];

    const name = cleanName(humanizeSlug(slug));
    return name ? { name, score, source: "ats" } : null;
  }

  function titleCandidates(title = "") {
    const parts = String(title).split(/\s+[|·•–—]\s+|\s+-\s+/).map(cleanName).filter(Boolean);
    if (parts.length < 2) return [];
    return [
      { name: parts.at(-1), score: 44, source: "title" },
      { name: parts[0], score: 30, source: "title" },
    ];
  }

  function detectFromSignals(signals = {}) {
    const candidates = [];
    const add = (name, score, source) => {
      const cleaned = cleanName(name);
      if (cleaned) candidates.push({ name: cleaned, score, source });
    };

    (signals.structured || []).forEach((name) => add(name, 100, "structured"));
    (signals.explicit || []).forEach((name) => add(name, 82, "page"));
    add(signals.siteName, 64, "siteName");
    const ats = atsCandidate(signals.url);
    if (ats) candidates.push(ats);
    candidates.push(...titleCandidates(signals.title));

    const merged = new Map();
    for (const candidate of candidates) {
      const key = candidate.name.toLowerCase().replace(/[^a-z0-9\p{L}]+/gu, "");
      const existing = merged.get(key);
      if (!existing || candidate.score > existing.score) merged.set(key, candidate);
      else if (existing) existing.score += 8;
    }
    const best = [...merged.values()].sort((a, b) => b.score - a.score)[0];
    if (!best || best.score < 44) return null;
    return { ...best, confidence: best.score >= 80 ? "high" : "medium" };
  }

  function extractStructuredNames(doc) {
    const names = [];
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const root = JSON.parse(script.textContent || "null");
        const queue = Array.isArray(root) ? [...root] : [root];
        while (queue.length) {
          const item = queue.shift();
          if (!item || typeof item !== "object") continue;
          if (item["@graph"]) queue.push(...item["@graph"]);
          const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          if (types.includes("JobPosting")) {
            const organization = item.hiringOrganization;
            if (typeof organization === "string") names.push(organization);
            else if (organization?.name) names.push(organization.name);
          }
        }
      } catch { /* Ignore malformed publisher JSON-LD. */ }
    }
    return names;
  }

  function detectDocument(doc = document, url = location.href) {
    const selectors = [
      '[itemprop="hiringOrganization"] [itemprop="name"]',
      '[itemprop="hiringOrganization"]',
      '[data-testid*="company-name" i]',
      '[data-testid="companyName"]',
      '[class*="company-name" i]',
      '[class*="companyName"]',
    ];
    const explicit = selectors.flatMap((selector) =>
      [...doc.querySelectorAll(selector)].slice(0, 3).map((node) => node.textContent || ""));
    const siteName = doc.querySelector('meta[property="og:site_name"]')?.content || "";
    return detectFromSignals({
      url,
      title: doc.title || "",
      structured: extractStructuredNames(doc),
      explicit,
      siteName,
    });
  }

  function glassdoorResearchUrl(companyName, locale = "") {
    const name = cleanName(companyName);
    if (!name) return "";
    const region = /^(en-GB|cy-GB)/i.test(locale) ? "glassdoor.co.uk" : "glassdoor.com";
    const query = `site:${region}/Overview/Working-at- "${name}"`;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  return { cleanName, atsCandidate, detectFromSignals, detectDocument, glassdoorResearchUrl };
})();

if (typeof module !== "undefined") module.exports = globalThis.CatFillCompanyDetector;
