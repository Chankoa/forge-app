import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalsCss = readFileSync("styles/globals.css", "utf8");
const experimentsCss = readFileSync("styles/experiments/custom-styles.css", "utf8");

function topLevelSelectors(css: string) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      if (depth === 0) selectors.push(source.slice(start, index).trim().replace(/\s+/g, " "));
      depth += 1;
      start = index + 1;
    } else if (char === "}") {
      depth -= 1;
      start = index + 1;
    } else if (char === ";" && depth === 0) {
      start = index + 1;
    }
  }
  return selectors;
}

test("course mode switch links keep a single global base rule and a single shared active state rule", () => {
  const selectors = topLevelSelectors(globalsCss);
  assert.equal(selectors.filter((selector) => selector === ".mode-switch a").length, 1);
  assert.equal(selectors.filter((selector) => selector === ".mode-switch a:hover").length, 0);
  assert.equal(selectors.filter((selector) => selector === '.mode-switch a:hover, .mode-switch a[aria-current="page"]').length, 1);
  assert.match(globalsCss, /\.mode-switch a \{\s*padding: 6px 10px;\s*border: 1px solid var\(--border\);\s*border-radius: var\(--radius-sm\);\s*color: var\(--text-secondary\);\s*font: var\(--font-label\);\s*\}/);
});

test("experimental overrides do not redeclare the course mode switch base rule", () => {
  assert.doesNotMatch(experimentsCss.replace(/\/\*[\s\S]*?\*\//g, ""), /\.mode-switch a\s*[,{]/);
});
