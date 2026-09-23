export function matchExistingDomain(label: string, domains: Array<{ id: string; name: string }>): string {
  const normalized = label.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s+/g, " ");
  if (!normalized) return "";
  const matches = domains.filter((domain) => domain.id === label || domain.name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s+/g, " ") === normalized);
  return matches.length === 1 ? matches[0].id : "";
}
