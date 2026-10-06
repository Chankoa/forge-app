"use client";

import { forgeLessonContentEvent } from "@/lib/forge/lesson-content-event";

export function LessonEmptyContent() {
  return <div className="lesson-editor__empty-content"><p>Cette leçon n’a pas encore de contenu.</p><div><button type="button" className="button" onClick={() => window.dispatchEvent(new Event(forgeLessonContentEvent))}>Générer le contenu avec Forge</button><button type="button" className="button button--secondary" onClick={() => document.getElementById("lesson-content-editor")?.focus()}>Rédiger manuellement</button></div></div>;
}
