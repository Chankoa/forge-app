"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { domainLabel } from "@/lib/courses/presentation";

function FallbackCover({ domain, compact }: { domain?: string | null; compact: boolean }) {
  return <div className={`course-cover${compact ? " course-cover--compact" : ""}`} aria-label={`Illustration Forge : ${domainLabel(domain)}`} role="img"><span><Sparkles size={compact ? 18 : 23} /></span><small>{domainLabel(domain)}</small></div>;
}

function CoverImage({ url, compact, domain }: { url: string; compact: boolean; domain?: string | null }) {
  const [unavailable, setUnavailable] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setUnavailable(true);
  }, [url]);

  if (unavailable) return <FallbackCover domain={domain} compact={compact} />;
  return <div className={`course-cover course-cover--image${compact ? " course-cover--compact" : ""}`} aria-hidden="true"><img ref={imageRef} className="course-cover__image" src={url} alt="" loading="lazy" decoding="async" onError={() => setUnavailable(true)} /></div>;
}

export function CourseCover({ domain, compact = false, image }: { domain?: string | null; compact?: boolean; image?: { url: string } | null }) {
  // The image is decorative because the course title is always rendered nearby.
  return image?.url
    ? <CoverImage key={image.url} url={image.url} compact={compact} domain={domain} />
    : <FallbackCover domain={domain} compact={compact} />;
}
