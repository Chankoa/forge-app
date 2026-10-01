export type CourseMembershipRole = "viewer" | "participant" | "contributor" | "editor" | "owner";
export type CourseMembershipStatus = "invited" | "active" | "suspended" | "revoked";
export type CourseCapabilities = { canView: boolean; canViewPrivate: boolean; canLearn: boolean; canPreview: boolean; canEdit: boolean; canEditMetadata: boolean; canEditStructure: boolean; canEditLessons: boolean; canUseForge: boolean; canManageSources: boolean; canManageResources: boolean; canViewClassroom: boolean; canPublish: boolean; canArchive: boolean; canRestore: boolean; canManageParticipants: boolean; membershipRole: CourseMembershipRole | null; membershipStatus: CourseMembershipStatus | null; };
export type CourseRelationship = { isOwner: boolean; isEnrolled: boolean; courseStatus?: string | null; membershipRole?: CourseMembershipRole | null; membershipStatus?: CourseMembershipStatus | null; canManageParticipants?: boolean; };
export function resolveCourseCapabilities(relationship: CourseRelationship): CourseCapabilities {
	const isOwner = relationship.isOwner;
	const isArchived = relationship.courseStatus === "archived";
	const membershipRole = relationship.membershipRole ?? null;
	const membershipStatus = relationship.membershipStatus ?? null;
	const isActiveEditor = !isOwner && membershipStatus === "active" && membershipRole === "editor";
	const isActiveViewer = !isOwner && membershipStatus === "active" && membershipRole === "viewer";
	const canAuthor = isOwner || isActiveEditor;
	const canViewPrivate = isOwner || isActiveEditor || isActiveViewer;
	return {
		canView: canViewPrivate || (relationship.isEnrolled && !isArchived),
		canViewPrivate,
		canLearn: relationship.isEnrolled && !isArchived,
		canPreview: canViewPrivate,
		canEdit: canAuthor,
		canEditMetadata: canAuthor,
		canEditStructure: canAuthor,
		canEditLessons: canAuthor,
		canUseForge: canAuthor,
		canManageSources: isOwner,
		canManageResources: isOwner,
		canViewClassroom: isOwner,
		canPublish: isOwner && !isArchived,
		canArchive: isOwner && !isArchived,
		canRestore: isOwner && isArchived,
		canManageParticipants: isOwner && Boolean(relationship.canManageParticipants),
		membershipRole,
		membershipStatus,
	};
}
export function canAccessLessonMode(capabilities: CourseCapabilities, mode: string | undefined) { return mode === "edit" ? capabilities.canEdit : mode === "preview" ? capabilities.canPreview : capabilities.canLearn; }
