import { courseOwnerLabel, type PublicAuthorIdentity } from "@/lib/profiles/author-identity";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

export function AuthorAttribution({ author }: { author?: PublicAuthorIdentity }) {
  return <p className="course-author"><ProfileAvatar name={author?.displayName} url={author?.avatarUrl} size="sm" /><span>{courseOwnerLabel(author?.displayName)}</span></p>;
}
