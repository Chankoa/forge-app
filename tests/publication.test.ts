import assert from "node:assert/strict";
import test from "node:test";
import { resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";
import { getPublicationReadiness } from "../lib/courses/publication";

const baseCourse = { id: "course-1", slug: "forge", title: "Forge", subtitle: null, description: "A published-ready course.", domain: "Product", status: "draft", visibility: "private", durationMinutes: null, outline: [] };
const lesson = { id: "lesson-1", slug: "start", title: "Start", description: null, content: "# Start", objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "draft", status: "not-started" as const };

test("a course without lessons is not publication-ready", () => { const readiness = getPublicationReadiness(baseCourse); assert.equal(readiness.ready, false); assert.equal(readiness.blocking.length, 1); });
test("a course with a lesson is publication-ready", () => { const readiness = getPublicationReadiness({ ...baseCourse, outline: [{ id: "module-1", moduleTitle: "Start", lessons: [lesson] }] }); assert.equal(readiness.ready, true); });
test("enrollment does not grant publish capability", () => { const capabilities = resolveCourseCapabilities({ isOwner: false, isEnrolled: true }); assert.equal(capabilities.canPublish, false); });
test("owner keeps publish without automatic learning", () => { const capabilities = resolveCourseCapabilities({ isOwner: true, isEnrolled: false }); assert.equal(capabilities.canPublish, true); assert.equal(capabilities.canLearn, false); });
test("owner enrollment aggregates publishing, editing, and learning", () => { const capabilities = resolveCourseCapabilities({ isOwner: true, isEnrolled: true }); assert.equal(capabilities.canPublish, true); assert.equal(capabilities.canEdit, true); assert.equal(capabilities.canLearn, true); });