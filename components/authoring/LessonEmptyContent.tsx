"use client";

import { forgeLessonContentEvent } from "@/lib/forge/lesson-content-event";

export function LessonEmptyContent({ onStartWriting }: { onStartWriting: () => void }) {
  return <div className="lesson-editor__empty-content"><p>Commencez le contenu de cette leçon.</p><div><button type="button" className="button" onClick={() => window.dispatchEvent(new Event(forgeLessonContentEvent))}>Générer avec Forge</button><button type="button" className="button button--secondary" onClick={onStartWriting}>Commencer à rédiger</button></div></div>;
}
