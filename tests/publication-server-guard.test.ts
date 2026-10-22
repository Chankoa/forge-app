import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync(new URL("../app/app/create/actions.ts", import.meta.url), "utf8");

test("publication and unpublication enforce canonical owner and lifecycle state on the server", () => {
  assert.match(actions, /publishCourseAction[\s\S]*requireOwner\(courseId\)[\s\S]*ownedCourse\.status !== "draft"/);
  assert.match(actions, /publishCourseUpdate\(ownedCourse\.visibility, now\)[\s\S]*\.eq\("status", "draft"\)/);
  assert.match(actions, /unpublishCourseAction[\s\S]*requireOwner\(courseId\)[\s\S]*course\.status !== "published"/);
  assert.match(actions, /unpublishCourseUpdate\(\)[\s\S]*\.eq\("status", "published"\)/);
});
