import { UserRound } from "lucide-react";
import type { PublicAuthorIdentity } from "@/lib/profiles/author-identity";

export function AuthorAttribution({ author }: { author?: PublicAuthorIdentity }) {
  if (!author) return null;
  return <p className="course-author"><span className="course-author__initials" aria-hidden="true">{author.initials}</span><UserRound size={14} aria-hidden="true" /><span>Par {author.displayName}</span></p>;
}