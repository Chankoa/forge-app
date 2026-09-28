export function DomainMetadata({ domain, subdomain }: { domain?: string | null; subdomain?: string | null }) {
  const primary = domain?.trim();
  const secondary = subdomain?.trim();
  if (!primary && !secondary) return null;
  return <p className="domain-metadata">
    {primary && <span><span className="domain-metadata__label">Domaine</span><span>{primary}</span></span>}
    {secondary && <span><span className="domain-metadata__label">Sous-domaine</span><span>{secondary}</span></span>}
  </p>;
}
