import { courseOwnerLabel } from "@/lib/profiles/author-identity";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

export function AuthorAttribution({ author }: { author?: { displayName: string; avatarUrl?: string | null } }) {
  return <p className="course-author"><ProfileAvatar name={author?.displayName} url={author?.avatarUrl} size="sm" /><span>{courseOwnerLabel(author?.displayName)}</span></p>;
}
