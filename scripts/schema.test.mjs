import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { validatePortfolio, isPublicUrl, isLocalImage } from "./schema.mjs";
const sample = JSON.parse(fs.readFileSync(new URL("../content/portfolio.json", import.meta.url), "utf8"));
test("template and an empty project list remain usable without invented records", () => {
  assert.deepEqual(validatePortfolio(sample), []);
  const empty = structuredClone(sample); empty.projects = [];
  assert.deepEqual(validatePortfolio(empty), []);
});
test("rejects unsafe or incomplete public links", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,hi", "//example.com", "http://example.com", "https://user:password@example.com", "mailto:bad", "https://example.com/\npath"]) assert.equal(isPublicUrl(url), false, url);
  assert.equal(isPublicUrl("https://example.com/project"), true);
  assert.equal(isPublicUrl("mailto:hello@example.com"), true);
});
test("phone contacts accept numbers while writing links require HTTPS", () => {
  for (const url of ["tel:01012345678", "tel:+821012345678"]) {
    assert.equal(isPublicUrl(url), true, url);
    assert.equal(isPublicUrl(url, false), false, url);
  }
  for (const url of ["tel:12345", "tel:1234567890123456", "tel:abc123456", "tel://01012345678", "tel:01012345678?dial=1", "tel:01012345678#extra", "tel:010 1234 5678"]) assert.equal(isPublicUrl(url), false, url);
  const draft = structuredClone(sample);
  draft.profile.links = [{ label: "전화", url: "tel:01012345678" }];
  assert.deepEqual(validatePortfolio(draft), []);
  draft.writing = [{ title: "글", summary: "설명", url: "tel:01012345678" }];
  assert.ok(validatePortfolio(draft).some((error) => error.startsWith("writing[0].url:")));
});
test("images stay under public/images with a documented filename", () => {
  for (const value of ["/images/../secret.png", "/images/%2e%2e/secret.png", "//images/a.png", "https://example.com/a.png", "/images/a.png?token=x"]) assert.equal(isLocalImage(value), false);
  assert.equal(isLocalImage("/images/my-project/cover.webp"), true);
});
test("reports duplicate IDs, invalid graph choice, missing alt and schema typos regardless of portfolio size", () => {
  const draft = structuredClone(sample);
  const project = { id: "test-project", name: "검사용 프로젝트", category: "검사용", period: "2024", role: "검사용", title: "검사용 제목", accent: "", summary: "검사용 설명", stack: [], links: [], image: "", imageAlt: "", art: "none", artLabels: ["입력", "처리", "결과"], sections: [] };
  draft.projects = [project, structuredClone(project)];
  draft.projects[0].art = "unknown";
  draft.projects[0].image = "/images/demo.png";
  draft.projects[0].artLabels = [];
  draft.profile.proficency = 100;
  const errors = validatePortfolio(draft).join("\n");
  for (const key of ["id", "art", "imageAlt", "artLabels", "proficency"]) assert.ok(errors.includes(key), key);
});
test("partial objects and malformed arrays produce readable errors", () => {
  assert.ok(validatePortfolio(null).length);
  assert.ok(validatePortfolio({ site: null, profile: null, projects: {}, skills: null, writing: 4 }).length >= 5);
});
