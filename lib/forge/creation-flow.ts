import type { PublicCoursePreview } from "./public-contracts";
import { forgeProposalStates } from "./authoring-ux";

export type CreationDomain = { id: string; name: string };
export type CreationProposalState = "generated" | "adjusted" | "confirmed";

export const creationProposalLabels: Record<CreationProposalState, string> = {
  generated: `${forgeProposalStates.generated} · ${forgeProposalStates.review}`,
  adjusted: `${forgeProposalStates.adjusted} · ${forgeProposalStates.review}`,
  confirmed: forgeProposalStates.confirmed,
};

export function selectedCreationDomain(domains: CreationDomain[], domainId: string): CreationDomain | null {
  return domains.find((domain) => domain.id === domainId) ?? null;
}

export function canGenerateCourseProposal(intent: string, domains: CreationDomain[], domainId: string): boolean {
  return intent.trim().length >= 12 && Boolean(selectedCreationDomain(domains, domainId));
}

export function canCreateCourseFromProposal(proposal: PublicCoursePreview | undefined, domains: CreationDomain[], domainId: string): boolean {
  return Boolean(proposal && selectedCreationDomain(domains, domainId));
}

export function canStartCourseCreation(isCreating: boolean, proposal: PublicCoursePreview | undefined, domains: CreationDomain[], domainId: string): boolean {
  return !isCreating && canCreateCourseFromProposal(proposal, domains, domainId);
}

export function draftCourseCreationAttributes(domainId: string) {
  return { domain_id: domainId, status: "draft" as const, visibility: "private" as const, availability: "preview" as const };
}

export function ownerEditorRedirect(courseSlug: string): string {
  return `/app/courses/${courseSlug}?mode=edit`;
}