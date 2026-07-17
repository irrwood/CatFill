const assert = require("node:assert/strict");
const test = require("node:test");

const detector = require("../companyDetector.js");

test("prefers JobPosting hiring organization over ATS and title guesses", () => {
  const result = detector.detectFromSignals({
    url: "https://jobs.smartrecruiters.com/ExamplePlatform/123",
    title: "Product Designer - Wrong Title Company",
    structured: ["Miro"],
  });
  assert.equal(result.name, "Miro");
  assert.equal(result.confidence, "high");
  assert.equal(result.source, "structured");
});

test("recognizes company slugs on common recruiting systems", () => {
  const cases = [
    ["https://boards.greenhouse.io/acme-labs/jobs/123", "Acme Labs"],
    ["https://jobs.lever.co/north-star/abc", "North Star"],
    ["https://jobs.ashbyhq.com/paper-plane/abc", "Paper Plane"],
    ["https://apply.workable.com/bright-future/j/ABC", "Bright Future"],
    ["https://jobs.smartrecruiters.com/Experian/123", "Experian"],
    ["https://example.wd3.myworkdayjobs.com/en-US/jobs/job/123", "Example"],
  ];
  for (const [url, expected] of cases) assert.equal(detector.atsCandidate(url).name, expected);
});

test("detects an employer from an ATS URL without page content", () => {
  const result = detector.detectFromSignals({
    url: "https://jobs.lever.co/acme-cloud/43de9c",
  });
  assert.equal(result.name, "Acme Cloud");
  assert.equal(result.source, "ats");
});

test("recognizes the employer inside SmartRecruiters one-click application URLs", () => {
  const url = "https://jobs.smartrecruiters.com/oneclick-ui/company/Experian/publication/442fd2a5?dcr_ci=Experian";
  const result = detector.detectFromSignals({
    url,
    title: "Easy apply - Senior Product Designer - AI Experiences - Experian",
  });
  assert.equal(result.name, "Experian");
  assert.equal(result.confidence, "high");
});

test("does not present recruiting platforms as employers", () => {
  assert.equal(detector.cleanName("Greenhouse"), "");
  assert.equal(detector.cleanName("LinkedIn Jobs"), "");
});

test("uses a branded page title as a medium-confidence fallback", () => {
  const result = detector.detectFromSignals({ title: "Senior Engineer | Example Robotics" });
  assert.equal(result.name, "Example Robotics");
  assert.equal(result.confidence, "medium");
});

test("builds a region-aware search limited to Glassdoor company overview pages", () => {
  const url = new URL(detector.glassdoorResearchUrl("Amazon", "en-GB"));
  assert.equal(url.hostname, "www.google.com");
  assert.equal(url.searchParams.get("q"), 'site:glassdoor.co.uk/Overview/Working-at- "Amazon"');

  const globalUrl = new URL(detector.glassdoorResearchUrl("Experian", "en-US"));
  assert.equal(globalUrl.searchParams.get("q"), 'site:glassdoor.com/Overview/Working-at- "Experian"');
});

test("builds the real Glassdoor overview URL from an employer ID", () => {
  assert.equal(
    detector.glassdoorCompanyUrl({ id: 6036, label: "Amazon" }, "en-GB"),
    "https://www.glassdoor.co.uk/Overview/Working-at-Amazon-EI_IE6036.11,17.htm",
  );
  assert.equal(
    detector.glassdoorCompanyUrl({ id: 42406, label: "Experian" }, "en-US"),
    "https://www.glassdoor.com/Overview/Working-at-Experian-EI_IE42406.11,19.htm",
  );
});

test("only auto-opens an exact Glassdoor company-name match", () => {
  const candidates = [
    { id: 6036, label: "Amazon" },
    { id: 7470741, label: "Amazon Web Services" },
  ];
  assert.equal(detector.exactGlassdoorCompany("Amazon", candidates).id, 6036);
  assert.equal(detector.exactGlassdoorCompany("Amazon UK", candidates), null);
});
