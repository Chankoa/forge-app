import { BookOpen, Clock3, Layers3, TrendingUp } from "lucide-react";
import { clampProgress } from "@/lib/courses/presentation";

export function CourseMetrics({ modules, lessons, durationMinutes, progress, publication }: {
  modules: number; lessons: number; durationMinutes: number | null; progress?: number; publication?: string;
}) {
  const value = progress === undefined ? undefined : clampProgress(progress);
  return <dl className="course-metrics" aria-label="Résumé du parcours">
    <div><Layers3 size={17} aria-hidden="true" /><dt>Modules</dt><dd>{modules}</dd></div>
    <div><BookOpen size={17} aria-hidden="true" /><dt>Leçons</dt><dd>{lessons}</dd></div>
    {durationMinutes !== null && <div><Clock3 size={17} aria-hidden="true" /><dt>Durée estimée</dt><dd>{durationMinutes} min</dd></div>}
    {publication && <div><dt>Publication</dt><dd>{publication}</dd></div>}
    {value !== undefined && <div className="course-metrics__progress"><TrendingUp size={17} aria-hidden="true" /><dt>Progression</dt><dd>{value} %</dd><progress value={value} max={100} aria-label="Progression du parcours" /></div>}
  </dl>;
}
