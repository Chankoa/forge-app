"use client";

import { useState, useTransition } from "react";
import { Search, UserPlus, UserRoundCheck, UserRoundX } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { addCourseCollaboratorAction, changeCourseCollaboratorRoleAction, searchCourseCollaboratorCandidatesAction, setCourseCollaboratorStatusAction } from "@/app/app/courses/collaborator-actions";
import type { CollaboratorCandidate, CollaboratorRole, CourseCollaborator } from "@/lib/courses/collaborators";
import type { CourseCollaborationRequest } from "@/lib/courses/collaboration-requests";
import { CourseCollaborationRequestsPanel } from "./CourseCollaborationRequestsPanel";

const statusLabel = { active: "Actif", invited: "Invité", suspended: "Suspendu", revoked: "Révoqué" } as const;

export function CourseCollaboratorManager({ courseId, courseTitle, initialCollaborators, available, collaborationRequestsEnabled, requests, requestsAvailable }: { courseId: string; courseTitle: string; initialCollaborators: CourseCollaborator[]; available: boolean; collaborationRequestsEnabled: boolean; requests: CourseCollaborationRequest[]; requestsAvailable: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState(""); const [candidates, setCandidates] = useState<CollaboratorCandidate[]>([]); const [selected, setSelected] = useState<CollaboratorCandidate | null>(null); const [role, setRole] = useState<CollaboratorRole>("viewer"); const [message, setMessage] = useState(""); const [error, setError] = useState(false); const [pending, startTransition] = useTransition();
  const run = (work: () => Promise<void>, success: string) => startTransition(async () => { try { await work(); setMessage(success); setError(false); router.refresh(); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "L'action a échoué."); setError(true); } });
  const search = () => run(async () => { const results = await searchCourseCollaboratorCandidatesAction(courseId, query); setCandidates(results); setSelected(null); }, "");
  return <section className="collaborator-manager" aria-labelledby="collaborator-manager-title">
    <header className="collaborator-manager__heading"><div><p className="eyebrow">Équipe du parcours</p><h2 id="collaborator-manager-title">Collaborateurs</h2><p>Ajoutez des membres Forge existants pour consulter ou modifier « {courseTitle} ».</p></div></header>
    {message && <p className={error ? "form-error" : "completion-state"} role="status">{message}</p>}
    <CourseCollaborationRequestsPanel courseId={courseId} enabled={collaborationRequestsEnabled} available={requestsAvailable} requests={requests} onFeedback={(text, hasError = false) => { setMessage(text); setError(hasError); router.refresh(); }} />
    {!available && <p className="env-note">La gestion des collaborateurs sera disponible après l&apos;application de la migration I.2.D.</p>}
    {available && <>
    <form className="collaborator-manager__add" onSubmit={(event) => { event.preventDefault(); search(); }}>
      <label>Rechercher un membre Forge<input value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={120} placeholder="Nom du membre" required /></label>
      <Button type="submit" disabled={pending}><Search size={16} /> Rechercher</Button>
    </form>
    {candidates.length > 0 && <div className="collaborator-manager__candidates" aria-label="Résultats de recherche">{candidates.map((candidate) => <button key={candidate.userId} type="button" className={selected?.userId === candidate.userId ? "is-selected" : ""} onClick={() => setSelected(candidate)}><span aria-hidden="true">{candidate.initials}</span>{candidate.displayName}</button>)}</div>}
    {selected && <div className="collaborator-manager__selection"><span><strong>{selected.displayName}</strong><small>{selected.initials}</small></span><label>Rôle<select value={role} onChange={(event) => setRole(event.target.value as CollaboratorRole)}><option value="viewer">Lecteur</option><option value="editor">Éditeur</option></select></label><Button type="button" disabled={pending} onClick={() => run(async () => { await addCourseCollaboratorAction(courseId, selected.userId, role); setSelected(null); setCandidates([]); }, `${selected.displayName} a été ajouté.`)}><UserPlus size={16} /> Ajouter</Button></div>}
    {initialCollaborators.length === 0 ? <div className="collaborator-manager__empty"><p>Aucun collaborateur pour le moment.</p><p>Recherchez un membre Forge existant pour l&apos;ajouter au parcours.</p></div> : <ul className="collaborator-manager__list">{initialCollaborators.map((collaborator) => <li key={collaborator.userId}><span className="collaborator-manager__initials" aria-hidden="true">{collaborator.initials}</span><div><strong>{collaborator.displayName}</strong><small>{statusLabel[collaborator.status]}</small></div><label>Rôle<select value={collaborator.role} disabled={pending || collaborator.status !== "active"} onChange={(event) => run(() => changeCourseCollaboratorRoleAction(courseId, collaborator.userId, event.target.value as CollaboratorRole), "Rôle mis à jour.")}><option value="viewer">Lecteur</option><option value="editor">Éditeur</option></select></label>{(collaborator.status === "active" || collaborator.status === "revoked") && <Button type="button" variant="secondary" disabled={pending} onClick={() => run(() => setCourseCollaboratorStatusAction(courseId, collaborator.userId, collaborator.status === "revoked" ? "active" : "revoked"), collaborator.status === "revoked" ? "Collaborateur réactivé." : "Collaborateur révoqué.")}>{collaborator.status === "revoked" ? <><UserRoundCheck size={16} /> Réactiver</> : <><UserRoundX size={16} /> Révoquer</>}</Button>}</li>)}</ul>}
    </>}
  </section>;
}