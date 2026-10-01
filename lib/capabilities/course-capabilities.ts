export type CourseMembershipRole = "viewer" | "participant" | "contributor" | "editor" | "owner";
export type CourseMembershipStatus = "invited" | "active" | "suspended" | "revoked";
export type CourseCapabilities = { canView: boolean; canLearn: boolean; canPreview: boolean; canEdit: boolean; canPublish: boolean; canArchive: boolean; canRestore: boolean; canManageParticipants: boolean; membershipRole: CourseMembershipRole | null; membershipStatus: CourseMembershipStatus | null; };
export type CourseRelationship = { isOwner: boolean; isEnrolled: boolean; courseStatus?: string | null; membershipRole?: CourseMembershipRole | null; membershipStatus?: CourseMembershipStatus | null; canManageParticipants?: boolean; };
export function resolveCourseCapabilities(relationship: CourseRelationship): CourseCapabilities {
	const isOwner = relationship.isOwner;
	const isArchived = relationship.courseStatus === "archived";
	const membershipRole = relationship.membershipRole ?? null;
	const membershipStatus = relationship.membershipStatus ?? null;
	return {
		canView: isOwner || (relationship.isEnrolled && !isArchived),
		canLearn: relationship.isEnrolled && !isArchived,
		canPreview: isOwner,
		canEdit: isOwner,
		canPublish: isOwner && !isArchived,
		canArchive: isOwner && !isArchived,
		canRestore: isOwner && isArchived,
		canManageParticipants: isOwner && Boolean(relationship.canManageParticipants),
		membershipRole,
		membershipStatus,
	};
}
export function canAccessLessonMode(capabilities: CourseCapabilities, mode: string | undefined) { return mode === "edit" ? capabilities.canEdit : mode === "preview" ? capabilities.canPreview : capabilities.canLearn; }
