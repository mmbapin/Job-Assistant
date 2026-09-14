import test from "node:test";
import assert from "node:assert/strict";
import {
  collectCareerSearch,
  matchesSeniorDhaka,
  parseCareerSearch,
} from "./collect";
import { detectSource, validateSource } from "./sources";
const base = "https://careers.optimizely.com";
const source = validateSource({
  company: "Optimizely",
  url:
    base +
    "/search/?q=Senior+Software+Engineer&locationsearch=Dhaka&title=Senior",
});
function page(title: string, location: string, total = 1) {
  return `<span class="paginationLabel"><b>1 – 1</b> of <b>${total}</b></span><table id="searchresults"><tr class="data-row"><td><a class="jobTitle-link" href="/job/Dhaka-Role/123/">${title}</a><a class="jobTitle-link" href="/job/Dhaka-Role/123/">${title}</a></td><td class="colLocation"><span class="jobLocation">${location}</span></td><td><span class="jobDate">Sep 9, 2026</span></td></tr></table>`;
}
test("Optimizely registration recognizes and canonicalizes the supplied filtered URL", async () => {
  const s = await detectSource(source);
  assert.equal(s.board, "optimizely-senior-dhaka");
  assert.equal(s.category, "Bangladesh");
  assert.match(s.detection || "", /Dhaka only/);
});
test("search matching excludes customer success and non-Dhaka engineering roles", () => {
  assert.equal(
    matchesSeniorDhaka({
      title: "Senior Customer Success Manager",
      location: "Dhaka, BD",
    }),
    false,
  );
  assert.equal(
    matchesSeniorDhaka({
      title: "Senior Software Engineer",
      location: "London",
    }),
    false,
  );
  assert.equal(
    matchesSeniorDhaka({
      title: "Senior Software Engineer - Full Stack",
      location: "Dhaka, BD",
    }),
    true,
  );
});
test("responsive duplicate links produce one result per row", () => {
  const result = parseCareerSearch(
    page("Senior Software Engineer", "Dhaka, BD"),
    base,
  );
  assert.equal(result.jobs.length, 1);
  assert.equal(result.total, 1);
});
test("unrelated search results produce a successful empty collection", async () => {
  const s = await detectSource(source);
  const jobs = await collectCareerSearch(s, async () =>
    page("Senior Customer Success Manager", "Dhaka, BD"),
  );
  assert.deepEqual(jobs, []);
});
test("matching search results include full descriptions and original job URL", async () => {
  const s = await detectSource(source);
  const jobs = await collectCareerSearch(s, async (url) =>
    url.includes("/search/")
      ? page("Senior Software Engineer", "Dhaka, BD")
      : '<h1>Senior Software Engineer</h1><div itemprop="description">React and TypeScript</div>',
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].url, base + "/job/Dhaka-Role/123/");
  assert.ok(jobs[0].skills.includes("React"));
});
test("unexpected layout or off-domain job link fails visibly", () => {
  assert.throws(
    () => parseCareerSearch("<h1>Unavailable</h1>", base),
    /layout changed/,
  );
  assert.throws(
    () =>
      parseCareerSearch(
        page("Senior Software Engineer", "Dhaka").replaceAll(
          "/job/Dhaka-Role/123/",
          "https://other.example/job/123",
        ),
        base,
      ),
    /Unexpected/,
  );
});
test("detail location changes are respected", async () => {
  const s = await detectSource(source);
  const jobs = await collectCareerSearch(s, async (url) =>
    url.includes("/search/")
      ? page("Senior Software Engineer", "Dhaka, BD")
      : '<h1>Senior Software Engineer</h1><span class="jobGeoLocation">London</span><div itemprop="description">React</div>',
  );
  assert.equal(jobs.length, 0);
});
test("repeated pagination fails instead of claiming a complete collection", async () => {
  const s = await detectSource(source);
  await assert.rejects(
    () => collectCareerSearch(s, async () => page("Other role", "Dhaka", 2)),
    /pagination repeated/,
  );
});
