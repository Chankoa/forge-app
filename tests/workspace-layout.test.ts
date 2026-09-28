import assert from "node:assert/strict";
import test from "node:test";
import { adjacentTab, focusForgeRail, toggleForgeRail } from "../lib/courses/workspace-layout";

test("Forge rail cycles between collapsed, docked, and focus states", () => {
  assert.equal(toggleForgeRail("docked"), "collapsed");
  assert.equal(toggleForgeRail("collapsed"), "docked");
  assert.equal(focusForgeRail("docked"), "focus");
  assert.equal(focusForgeRail("focus"), "docked");
});

test("editor tab keyboard navigation wraps predictably", () => {
  assert.equal(adjacentTab(0, "ArrowLeft", 3), 2);
  assert.equal(adjacentTab(2, "ArrowRight", 3), 0);
  assert.equal(adjacentTab(1, "Home", 3), 0);
  assert.equal(adjacentTab(1, "End", 3), 2);
});
