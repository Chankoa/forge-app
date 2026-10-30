"use client";

import { forgeLessonContentEvent } from "@/lib/forge/lesson-content-event";

export function LessonEmptyContent({ onStartWriting, generationBlocked = false }: { onStartWriting: () => void; generationBlocked?: boolean }) {
  return <div className="lesson-editor__empty-content"><p>Commencez le contenu de cette leçon.</p>{generationBlocked && <p className="caption" role="status">Sauvegardez la leçon et attendez la confirmation avant de lancer Forge AI.</p>}<div><button type="button" className="button" disabled={generationBlocked} onClick={() => window.dispatchEvent(new Event(forgeLessonContentEvent))}>Générer avec Forge</button><button type="button" className="button button--secondary" onClick={onStartWriting}>Commencer à rédiger</button></div></div>;
}
