import { authorInitials } from "@/lib/profiles/author-identity";

type ProfileAvatarProps = { name: string | null | undefined; url?: string | null; size?: "sm" | "md" | "lg" };

// Initials fallback is always rendered when there is no image; the name stays the authoritative identity.
export function ProfileAvatar({ name, url, size = "md" }: ProfileAvatarProps) {
  const initials = authorInitials(name);
  return <span className={`profile-avatar profile-avatar--${size}`} data-has-image={url ? "true" : "false"} aria-hidden="true">{url ? <img src={url} alt="" decoding="async" /> : <strong>{initials}</strong>}</span>;
}
