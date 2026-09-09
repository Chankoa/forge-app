import type { CourseLesson } from "@/lib/courses/contracts";

export function LessonContent({ lesson }: { lesson: CourseLesson }) {
  const blocks = (lesson.content ?? lesson.description ?? "Le contenu de cette leçon n'est pas encore disponible.").split(/\n{2,}/);
  return <div className="lesson-content">{lesson.objectives.length > 0 && <section className="lesson-objectives"><h3>Objectifs</h3><ul>{lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></section>}{blocks.map((block, index) => block.startsWith("# ") ? <h2 key={index}>{block.slice(2)}</h2> : block.startsWith("## ") ? <h3 key={index}>{block.slice(3)}</h3> : block.startsWith("- ") ? <ul key={index}>{block.split("\n").map((item) => <li key={item}>{item.replace(/^- /, "")}</li>)}</ul> : <p key={index}>{block}</p>)}</div>;
}