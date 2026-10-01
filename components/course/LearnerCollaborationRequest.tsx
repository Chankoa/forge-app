"use client";

import { useState, useTransition } from "react";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createCourseCollaborationRequestAction } from "@/app/app/courses/collaboration-request-actions";

export function LearnerCollaborationRequest({ courseId, canRequest, pending }: { courseId: string; canRequest: boolean; pending: boolean }) {
  const [open, setOpen] = useState(false); const [message, setMessage] = useState(""); const [feedback, setFeedback] = useState(""); const [error, setError] = useState(false); const [isPending, startTransition] = useTransition();
  if (pending) return <aside className="collaboration-request collaboration-request--pending"><Handshake size={17} aria-hidden="true" /><span>Demande de collaboration envoyée</span></aside>;
  if (!canRequest) return null;
  const submit = () => startTransition(async () => { try { await createCourseCollaborationRequestAction(courseId, message); setFeedback("Demande de collaboration envoyée"); setError(false); setOpen(false); } catch (reason) { setFeedback(reason instanceof Error ? reason.message : "La demande n'a pas pu être envoyée."); setError(true); } });
  return <aside className="collaboration-request" aria-labelledby="collaboration-request-title"><div><p className="eyebrow"><Handshake size={15} /> Collaboration</p><h2 id="collaboration-request-title">Contribuer au parcours</h2><p>Proposez votre aide au propriétaire du parcours.</p></div>{feedback && <p className={error ? "form-error" : "completion-state"} role="status">{feedback}</p>}{open ? <form onSubmit={(event) => { event.preventDefault(); submit(); }}><label>Message facultatif<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} placeholder="Expliquez brièvement votre intention." /></label><div><Button type="submit" variant="secondary" disabled={isPending}>{isPending ? "Envoi…" : "Envoyer la demande"}</Button><Button type="button" variant="ghost" disabled={isPending} onClick={() => setOpen(false)}>Annuler</Button></div></form> : <Button type="button" variant="secondary" onClick={() => setOpen(true)}>Demander à collaborer</Button>}</aside>;
}