import assert from "node:assert/strict";
import test from "node:test";
import { resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";
test("enrollment can learn but cannot edit", () => { const result = resolveCourseCapabilities({ isOwner: false, isEnrolled: true }); assert.equal(result.canLearn, true); assert.equal(result.canEdit, false); });
test("owner can edit and publish", () => { const result = resolveCourseCapabilities({ isOwner: true, isEnrolled: false }); assert.equal(result.canEdit, true); assert.equal(result.canPublish, true); });
test("owner enrollment has learning and editing capabilities", () => { const result = resolveCourseCapabilities({ isOwner: true, isEnrolled: true }); assert.equal(result.canLearn, true); assert.equal(result.canEdit, true); });