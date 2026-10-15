export type DiscussionContextType = "course" | "module" | "lesson";

export type DiscussionContext = {
  type: DiscussionContextType;
  moduleId?: string | null;
  lessonId?: string | null;
};

export type CourseDiscussionMessage = {
  id: string;
  courseId: string;
  authorId: string | null;
  context: Required<DiscussionContext>;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: { displayName: string; avatarUrl: string | null };
};

export type CourseDiscussionAccess = {
  canRead: boolean;
  canPost: boolean;
  isOwner: boolean;
  userId: string | null;
};

export const discussionBodyLimit = 4000;

export function normalizeDiscussionBody(value: unknown) {
  if (typeof value !== "string") return null;
  const body = value.trim();
  return body.length > 0 && body.length <= discussionBodyLimit ? body : null;
}

export function normalizeDiscussionContext(value: unknown): DiscussionContext | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const type = record.type;
  const moduleId = typeof record.moduleId === "string" ? record.moduleId : null;
  const lessonId = typeof record.lessonId === "string" ? record.lessonId : null;
  if (type === "course" && !moduleId && !lessonId) return { type, moduleId: null, lessonId: null };
  if (type === "module" && moduleId && !lessonId) return { type, moduleId, lessonId: null };
  if (type === "lesson" && lessonId && !moduleId) return { type, moduleId: null, lessonId };
  return null;
}

export function normalizePersistedDiscussionContext(value: unknown): DiscussionContext | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const type = record.type;
  const moduleId = record.moduleId;
  const lessonId = record.lessonId;
  if (type === "course" && moduleId === null && lessonId === null) {
    return { type, moduleId: null, lessonId: null };
  }
  if (type === "module" && lessonId === null) {
    if (moduleId === null) return { type, moduleId: null, lessonId: null };
    if (typeof moduleId === "string" && moduleId.length > 0) return { type, moduleId, lessonId: null };
  }
  if (type === "lesson" && moduleId === null) {
    if (lessonId === null) return { type, moduleId: null, lessonId: null };
    if (typeof lessonId === "string" && lessonId.length > 0) return { type, moduleId: null, lessonId };
  }
  return null;
}

export function discussionAccess({ isOwner, membershipRole, membershipStatus, userId }: { isOwner: boolean; membershipRole: string | null; membershipStatus: string | null; userId: string | null }): CourseDiscussionAccess {
  const editor = !isOwner && membershipStatus === "active" && membershipRole === "editor";
  const viewer = !isOwner && membershipStatus === "active" && membershipRole === "viewer";
  return { canRead: isOwner || editor || viewer, canPost: isOwner || editor, isOwner, userId };
}

export function canEditDiscussionMessage(access: CourseDiscussionAccess, message: Pick<CourseDiscussionMessage, "authorId" | "deletedAt">) {
  return message.deletedAt === null && access.canPost && message.authorId === access.userId;
}

export function canDeleteDiscussionMessage(access: CourseDiscussionAccess, message: Pick<CourseDiscussionMessage, "authorId" | "deletedAt">) {
  return message.deletedAt === null && (access.isOwner || (access.canPost && message.authorId === access.userId));
}
