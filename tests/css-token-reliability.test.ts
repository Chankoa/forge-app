import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tokenCss = readFileSync("styles/tokens.css", "utf8");
const themeCss = readFileSync("styles/themes.css", "utf8");
const activeStyleFiles = [
  "styles/globals.css",
  "styles/library.css",
  "styles/forge-course-plan.css",
  "styles/experiments/custom-styles.css",
];

function declarations(css: string) {
  return new Set([...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(^|[;{\s])(--[\w-]+)\s*:/gm)].map((match) => match[2]));
}

function noFallbackReferences(css: string) {
  const references: string[] = [];
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (let start = source.indexOf("var("); start >= 0; start = source.indexOf("var(", start)) {
    let depth = 0;
    let end = start;
    for (; end < source.length; end += 1) {
      if (source[end] === "(") depth += 1;
      if (source[end] === ")" && --depth === 0) break;
    }
    const value = source.slice(start + 4, end).trim();
    const name = value.match(/^(--[\w-]+)/)?.[1];
    if (name && !value.includes(",")) references.push(name);
    start = end + 1;
  }
  return references;
}

test("active CSS variables without fallbacks resolve through the token contract", () => {
  const declared = declarations([tokenCss, themeCss, ...activeStyleFiles.map((file) => readFileSync(file, "utf8"))].join("\n"));
  const unresolved = activeStyleFiles.flatMap((file) => noFallbackReferences(readFileSync(file, "utf8"))
    .filter((name) => !declared.has(name))
    .map((name) => `${file}: ${name}`));
  assert.deepEqual(unresolved, []);
});

test("light and dark themes define the semantic compatibility aliases used by active styles", () => {
  assert.match(tokenCss, /--space-5:\s*20px;/);
  for (const token of ["surface-muted", "text", "accent", "shadow-md"]) {
    assert.match(themeCss, new RegExp(`:root, \\[data-theme="light"\\][\\s\\S]*?--${token}:`));
    assert.match(themeCss, new RegExp(`\\[data-theme="dark"\\][\\s\\S]*?--${token}:`));
  }
});
