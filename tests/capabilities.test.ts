import assert from "node:assert/strict";
import test from "node:test";
import { resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";
test("enrollment can learn but cannot edit", () => { const result = resolveCourseCapabilities({ isOwner: false, isEnrolled: true }); assert.equal(result.canLearn, true); assert.equal(result.canEdit, false); });
test("owner can edit and publish", () => { const result = resolveCourseCapabilities({ isOwner: true, isEnrolled: false }); assert.equal(result.canEdit, true); assert.equal(result.canPublish, true); });
test("owner enrollment has learning and editing capabilities", () => { const result = resolveCourseCapabilities({ isOwner: true, isEnrolled: true }); assert.equal(result.canLearn, true); assert.equal(result.canEdit, true); });
test("archived courses retain canonical owner authoring but block publication and learning", () => {
	const owner = resolveCourseCapabilities({ isOwner: true, isEnrolled: true, courseStatus: "archived" });
	assert.equal(owner.canView, true); assert.equal(owner.canEdit, true); assert.equal(owner.canPublish, false); assert.equal(owner.canArchive, false); assert.equal(owner.canRestore, true); assert.equal(owner.canLearn, false);
	const learner = resolveCourseCapabilities({ isOwner: false, isEnrolled: true, courseStatus: "archived" });
	assert.equal(learner.canView, false); assert.equal(learner.canLearn, false); assert.equal(learner.canRestore, false);
});
test("membership context is retained without creating authority", () => {
	for (const membershipStatus of ["invited", "suspended", "revoked"] as const) {
		const result = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, membershipRole: "editor", membershipStatus });
		assert.equal(result.membershipRole, "editor"); assert.equal(result.membershipStatus, membershipStatus);
		assert.equal(result.canView, false); assert.equal(result.canEdit, false); assert.equal(result.canPublish, false); assert.equal(result.canArchive, false);
	}
	const memberOwner = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, membershipRole: "owner", membershipStatus: "active" });
	assert.equal(memberOwner.canEdit, false); assert.equal(memberOwner.canRestore, false);
});

test("only active editors receive the approved bounded authoring capabilities", () => {
	const editor = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, membershipRole: "editor", membershipStatus: "active", courseStatus: "archived" });
	assert.equal(editor.canViewPrivate, true); assert.equal(editor.canEditMetadata, true); assert.equal(editor.canEditStructure, true); assert.equal(editor.canEditLessons, true); assert.equal(editor.canUseForge, true);
	assert.equal(editor.canPublish, false); assert.equal(editor.canArchive, false); assert.equal(editor.canRestore, false); assert.equal(editor.canManageSources, false); assert.equal(editor.canManageResources, false);
	for (const membershipStatus of ["invited", "suspended", "revoked"] as const) assert.equal(resolveCourseCapabilities({ isOwner: false, isEnrolled: false, membershipRole: "editor", membershipStatus }).canEdit, false);
});

test("active viewers are private read-only collaborators while contributor and participant remain inactive", () => {
	const viewer = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, membershipRole: "viewer", membershipStatus: "active", courseStatus: "archived" });
	assert.equal(viewer.canViewPrivate, true); assert.equal(viewer.canPreview, true); assert.equal(viewer.canEdit, false); assert.equal(viewer.canUseForge, false);
	for (const membershipRole of ["contributor", "participant"] as const) {
		const result = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, membershipRole, membershipStatus: "active" });
		assert.equal(result.canViewPrivate, false); assert.equal(result.canEdit, false);
	}
});