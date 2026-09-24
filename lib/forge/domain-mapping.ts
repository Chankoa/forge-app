export function matchExistingDomain(label: string, domains: Array<{ id: string; name: string }>): string {
  const normalized = label.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s+/g, " ");
  if (!normalized) return "";
  const matches = domains.filter((domain) => domain.id === label || domain.name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s+/g, " ") === normalized);
  return matches.length === 1 ? matches[0].id : "";
}

const genericDomainLabels = new Set(["domaine suggere", "domaine", "suggested domain", "domain suggested"]);
export function businessDomainLabel(value: string | null): string | null {
  const label = value?.trim() ?? "";
  const normalized = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s+/g, " ");
  return !label || genericDomainLabels.has(normalized) ? null : label;
}

export function parseDomainSelection(value: unknown): string | null {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Le domaine sélectionné est invalide.");
  return id;
}

export function courseDomainUpdate(id: string | null | undefined) {
  return id === undefined ? {} : { domain_id: id };
}
