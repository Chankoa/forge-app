import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("components/shell/AppShell.tsx", "utf8");
const css = readFileSync("styles/globals.css", "utf8");

test("mobile keeps theme and logout only in the dark Forge rail", () => {
  assert.match(shell, /mobile-header-actions[\s\S]{0,180}<ThemeToggle \/><IconButton label="Se déconnecter"/);
  assert.match(css, /\.mobile-header-actions\s*\{\s*display: flex/);
  assert.match(css, /\.app-shell \.workspace-topbar \.header-actions\s*\{\s*display: none/);
});
