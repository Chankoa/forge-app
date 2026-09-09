"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Upload } from "lucide-react";
import type { CourseDetail } from "@/lib/courses/contracts";
import type { PublicationReadiness } from "@/lib/courses/publication";
import { publishCourseAction, unpublishCourseAction } from "@/app/app/create/actions";
import { Button } from "@/components/ui/Button";

export function PublicationPanel({ course, readiness }: { course: CourseDetail; readiness: PublicationReadiness }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [message, setMessage] = useState(""); const published = course.status === "published";
  const mutate = (action: () => Promise<void>, success: string) => startTransition(async () => { try { setMessage(""); await action(); router.refresh(); setMessage(success); } catch (error) { setMessage(error instanceof Error ? error.message : "La publication a échoué."); } });
  return <section className="publication-panel"><p className="eyebrow">Publication</p><h2>{published ? "Ce parcours est publié" : "Préparer la publication"}</h2><p>{published ? "Il est visible dans Explorer car sa visibilité est publique." : "La publication rend le même parcours discoverable dans Explorer."}</p><div className="publication-status"><strong>{published ? "Publié" : "Brouillon"}</strong><span>{published ? "Public" : "Privé"}</span></div><section className="publication-checklist"><h3>Checklist</h3>{readiness.blocking.length === 0 ? <p className="completion-state"><Check size={17} /> Les prérequis bloquants sont remplis.</p> : readiness.blocking.map((item) => <p className="form-error" key={item}>{item}</p>)}{readiness.recommended.map((item) => <p className="caption" key={item}>Recommandé : {item}</p>)}</section>{published ? <Button type="button" variant="secondary" onClick={() => mutate(() => unpublishCourseAction(course.id, course.slug), "Parcours dépublié. Les relations et progrès sont conservés.")}>{pending ? "Dépublication..." : "Dépublier"}</Button> : <Button type="button" onClick={() => mutate(() => publishCourseAction(course.id, course.slug), "Parcours publié. Il est maintenant visible dans Explorer.")} disabled={!readiness.ready || pending}><Upload size={17} /> {pending ? "Publication..." : "Publier"}</Button>}{message && <p className={message.includes("pu") || message.includes("Ajoutez") ? "form-error" : "completion-state"}>{message}</p>}</section>;
}