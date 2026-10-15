"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { DiscussionContextLabel } from "@/components/course/DiscussionContextLabel";
import { Button } from "@/components/ui/Button";
import { dispatchToast } from "@/lib/ui/toast";
import { canDeleteDiscussionMessage, canEditDiscussionMessage, discussionBodyLimit, type CourseDiscussionAccess, type CourseDiscussionMessage, type DiscussionContext, type DiscussionContextType } from "@/lib/courses/discussion";
import { createCourseDiscussionMessageAction, deleteCourseDiscussionMessageAction, updateCourseDiscussionMessageAction } from "@/app/app/courses/discussion-actions";

type OutlineItem = { id: string; moduleTitle: string; lessons: Array<{ id: string; slug: string; title: string }> };
type Filter = "all" | DiscussionContextType;

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function DiscussionFilter({ value, onChange }: { value: Filter; onChange: (value: Filter) => void }) {
  const filters: Array<{ value: Filter; label: string }> = [{ value: "all", label: "Tout" }, { value: "course", label: "Parcours" }, { value: "module", label: "Modules" }, { value: "lesson", label: "Leçons" }];
  return <div className="discussion-filter" role="tablist" aria-label="Filtrer les messages">{filters.map((filter) => <button type="button" key={filter.value} role="tab" aria-selected={filter.value === value} onClick={() => onChange(filter.value)}>{filter.label}</button>)}</div>;
}

export function DiscussionMessage({ message, access, outline, courseSlug, onEdit, onDelete }: { message: CourseDiscussionMessage; access: CourseDiscussionAccess; outline: OutlineItem[]; courseSlug: string; onEdit: (message: CourseDiscussionMessage) => void; onDelete: (messageId: string) => void }) {
  const deleted = Boolean(message.deletedAt);
  return <article className={"discussion-message" + (deleted ? " discussion-message--deleted" : "")}>
    <ProfileAvatar name={message.author.displayName} url={message.author.avatarUrl} size="sm" />
    <div className="discussion-message__content">
      <header><strong>{message.author.displayName}</strong><time dateTime={message.createdAt} title={formatTime(message.createdAt)}>{formatTime(message.createdAt)}</time></header>
      <DiscussionContextLabel context={message.context} outline={outline} courseSlug={courseSlug} />
      <p>{deleted ? "Message supprimé" : message.body}</p>
      {!deleted && message.updatedAt !== message.createdAt && <small>modifié</small>}
      {!deleted && (canEditDiscussionMessage(access, message) || canDeleteDiscussionMessage(access, message)) && <div className="discussion-message__actions">
        {canEditDiscussionMessage(access, message) && <button type="button" onClick={() => onEdit(message)}><Pencil size={14} /> Modifier</button>}
        {canDeleteDiscussionMessage(access, message) && <button type="button" onClick={() => onDelete(message.id)}><Trash2 size={14} /> Supprimer</button>}
      </div>}
    </div>
  </article>;
}

export function DiscussionMessageList({ messages, access, outline, courseSlug, onEdit, onDelete }: { messages: CourseDiscussionMessage[]; access: CourseDiscussionAccess; outline: OutlineItem[]; courseSlug: string; onEdit: (message: CourseDiscussionMessage) => void; onDelete: (messageId: string) => void }) {
  return <div className="discussion-list" aria-live="polite">{messages.map((message) => <DiscussionMessage key={message.id} message={message} access={access} outline={outline} courseSlug={courseSlug} onEdit={onEdit} onDelete={onDelete} />)}</div>;
}

function DiscussionComposer({ courseId, courseSlug, outline, initialContext, onComplete }: { courseId: string; courseSlug: string; outline: OutlineItem[]; initialContext: DiscussionContext; onComplete: () => void }) {
  const [body, setBody] = useState("");
  const [selection, setSelection] = useState(initialContext.type + ":" + (initialContext.moduleId ?? initialContext.lessonId ?? ""));
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const options = [{ value: "course:", label: "Parcours" }, ...outline.map((module) => ({ value: "module:" + module.id, label: "Module · " + module.moduleTitle })), ...outline.flatMap((module) => module.lessons.map((lesson) => ({ value: "lesson:" + lesson.id, label: "Leçon · " + lesson.title })))];
  const context = useMemo<DiscussionContext>(() => {
    const [type, id] = selection.split(":", 2) as [DiscussionContextType, string];
    return type === "module" ? { type, moduleId: id, lessonId: null } : type === "lesson" ? { type, moduleId: null, lessonId: id } : { type: "course", moduleId: null, lessonId: null };
  }, [selection]);
  const submit = () => {
    if (!body.trim() || pending) return;
    startTransition(async () => {
      const result = await createCourseDiscussionMessageAction({ courseId, courseSlug, context, body });
      if (!result.ok) { setMessage(result.error); return; }
      setBody(""); setMessage(""); dispatchToast("Message envoyé"); onComplete();
    });
  };
  return <form className="discussion-composer" action={submit}>
    <label htmlFor="discussion-body">Écrire un message à l’équipe…</label>
    <textarea id="discussion-body" value={body} maxLength={discussionBodyLimit} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); submit(); } }} placeholder="Écrire un message à l’équipe…" />
    <div className="discussion-composer__footer"><label>Contexte<select value={selection} onChange={(event) => setSelection(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><span aria-live="polite">{body.length}/{discussionBodyLimit}</span><Button type="submit" disabled={pending || !body.trim()}><Send size={16} />{pending ? "Envoi…" : "Envoyer"}</Button></div>
    {message && <p className="form-error" role="alert">{message}</p>}
  </form>;
}

export function CourseDiscussion({ courseId, courseSlug, courseTitle, messages, access, outline, initialContext }: { courseId: string; courseSlug: string; courseTitle: string; messages: CourseDiscussionMessage[]; access: CourseDiscussionAccess; outline: OutlineItem[]; initialContext: DiscussionContext }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<CourseDiscussionMessage | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const visible = filter === "all" ? messages : messages.filter((message) => message.context.type === filter);
  const startEdit = (message: CourseDiscussionMessage) => { setEditing(message); setDraft(message.body); setError(""); };
  const saveEdit = () => {
    if (!editing || !draft.trim()) return;
    startTransition(async () => {
      const result = await updateCourseDiscussionMessageAction({ courseId, courseSlug, messageId: editing.id, body: draft });
      if (!result.ok) { setError(result.error); return; }
      setEditing(null); setError(""); dispatchToast("Message modifié"); router.refresh();
    });
  };
  const remove = (messageId: string) => startTransition(async () => {
    const result = await deleteCourseDiscussionMessageAction({ courseId, courseSlug, messageId });
    if (!result.ok) { setError(result.error); return; }
    dispatchToast("Message supprimé"); router.refresh();
  });
  return <section className="course-discussion" aria-labelledby="discussion-title">
    <header className="course-discussion__header"><div><p className="eyebrow">Collaboration interne</p><h1 id="discussion-title">Discussion</h1><p>Échanges autour de {courseTitle}.</p></div><MessageCircle size={24} aria-hidden="true" /></header>
    <DiscussionFilter value={filter} onChange={setFilter} />
    {editing && <section className="discussion-edit" aria-label="Modifier le message"><label htmlFor="discussion-edit-body">Modifier le message</label><textarea id="discussion-edit-body" value={draft} maxLength={discussionBodyLimit} onChange={(event) => setDraft(event.target.value)} /><div><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Annuler</Button><Button type="button" onClick={saveEdit} disabled={pending || !draft.trim()}>Enregistrer</Button></div></section>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {visible.length ? <DiscussionMessageList messages={visible} access={access} outline={outline} courseSlug={courseSlug} onEdit={startEdit} onDelete={remove} /> : <div className="discussion-empty"><MessageCircle size={22} aria-hidden="true" /><p><strong>Aucun message pour le moment.</strong><br />Utilisez cet espace pour échanger autour du parcours, de ses modules et de ses leçons.</p></div>}
    {access.canPost ? <DiscussionComposer courseId={courseId} courseSlug={courseSlug} outline={outline} initialContext={initialContext} onComplete={router.refresh} /> : <p className="discussion-readonly" role="status">Vous pouvez consulter les échanges de l’équipe.</p>}
  </section>;
}
