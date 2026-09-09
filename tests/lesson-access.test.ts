import assert from "node:assert/strict";
import test from "node:test";
import { canAccessLessonMode, resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";

const owner = resolveCourseCapabilities({ isOwner: true, isEnrolled: false });
const enrolled = resolveCourseCapabilities({ isOwner: false, isEnrolled: true });
const dual = resolveCourseCapabilities({ isOwner: true, isEnrolled: true });

test("owner without enrollment can edit but cannot learn a lesson", () => { assert.equal(canAccessLessonMode(owner, "edit"), true); assert.equal(canAccessLessonMode(owner, "learn"), false); });
test("enrolled non-owner can learn but cannot edit a lesson", () => { assert.equal(canAccessLessonMode(enrolled, "learn"), true); assert.equal(canAccessLessonMode(enrolled, "edit"), false); });
test("owner enrollment can learn and edit the same lesson", () => { assert.equal(canAccessLessonMode(dual, "learn"), true); assert.equal(canAccessLessonMode(dual, "edit"), true); });