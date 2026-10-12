import { UserRound } from "lucide-react";
import { courseOwnerLabel, type PublicAuthorIdentity } from "@/lib/profiles/author-identity";

export function AuthorAttribution({ author }: { author?: PublicAuthorIdentity }) {
  return <p className="course-author"><span className="course-author__initials" aria-hidden="true">{author?.initials ?? "?"}</span><UserRound size={14} aria-hidden="true" /><span>{courseOwnerLabel(author?.displayName)}</span></p>;
}
