"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { completeLessonAction, enrollCourseAction } from "@/app/app/courses/actions";

export function EnrollButton({ courseId, courseSlug }: { courseId: string; courseSlug: string }) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState(""); const router = useRouter();
  return <div><Button type="button" onClick={() => startTransition(async () => { try { setError(""); await enrollCourseAction(courseId, courseSlug); router.push(`/app/courses/${courseSlug}`); } catch (reason) { setError(reason instanceof Error ? reason.message : "L'inscription a échoué."); } })}>{pending ? "Inscription..." : "S'inscrire"}</Button>{error && <p className="form-error">{error}</p>}</div>;
}

export function CompleteLessonButton({ courseId, lessonId, courseSlug, completed }: { courseId: string; lessonId: string; courseSlug: string; completed: boolean }) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState("");
  if (completed) return <p className="completion-state"><Check size={17} /> Leçon terminée</p>;
  return <div><Button type="button" onClick={() => startTransition(async () => { try { setError(""); await completeLessonAction(courseId, lessonId, courseSlug); } catch (reason) { setError(reason instanceof Error ? reason.message : "La progression n'a pas pu être enregistrée."); } })}>{pending ? "Enregistrement..." : <><Check size={17} /> Marquer comme terminée</>}</Button>{error && <p className="form-error">{error}</p>}</div>;
}

export function StartCourseLink({ href, label }: { href: string; label: string }) { return <Button href={href}><Play size={17} /> {label}</Button>; }