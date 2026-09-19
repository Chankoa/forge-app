import assert from "node:assert/strict";
import test from "node:test";
import { adjacentTab, expandForgeRail, toggleForgeRail } from "../lib/courses/workspace-layout";

test("Forge rail cycles between collapsed, default, and expanded states", () => {
  assert.equal(toggleForgeRail("default"), "collapsed");
  assert.equal(toggleForgeRail("collapsed"), "default");
  assert.equal(expandForgeRail("default"), "expanded");
  assert.equal(expandForgeRail("expanded"), "default");
});

test("editor tab keyboard navigation wraps predictably", () => {
  assert.equal(adjacentTab(0, "ArrowLeft", 3), 2);
  assert.equal(adjacentTab(2, "ArrowRight", 3), 0);
  assert.equal(adjacentTab(1, "Home", 3), 0);
  assert.equal(adjacentTab(1, "End", 3), 2);
});