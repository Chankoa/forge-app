import { getForgeAvailability } from "@/lib/forge/provider";
import type { ReactNode } from "react";
import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";
import type { CourseDetail, CourseOutline } from "@/lib/courses/contracts";
import { CourseOutlineRail } from "./CourseOutlineRail";
import { ForgeRail } from "@/components/forge/ForgeRail";
import { ForgeProposalProvider } from "@/components/forge/ForgeProposalContext";
import { CourseContextNavigation } from "./CourseContextNavigation";
import { WorkspacePanels } from "./WorkspacePanels";
import { CourseIdentityHeader } from "./CourseIdentityHeader";
export function CourseWorkspace({ course, mode, capabilities, outline, content, forgeContext, selectedLesson, learnLesson, overview = false, primaryLearningAction }: { course: CourseDetail; mode: "view" | "learn" | "preview" | "edit" | "publication" | "classroom"; capabilities: CourseCapabilities; outline: CourseOutline; content: ReactNode; forgeContext: { mode: "learn" | "edit"; courseTitle: string; lessonTitle?: string }; selectedLesson?: string; learnLesson?: string; overview?: boolean; primaryLearningAction?: ReactNode }) {
  const modules = outline.map((module) => {
    const knownDurations = module.lessons.map((lesson) => lesson.durationMinutes);
    return { module, duration: knownDurations.length > 0 && knownDurations.every((minutes) => minutes != null) ? knownDurations.reduce<number>((total, minutes) => total + (minutes ?? 0), 0) : null };
  });
  const totalKnownDuration = modules.every(({ duration }) => duration != null) ? modules.reduce((total, { duration }) => total + (duration ?? 0), 0) : null;
  const currentModule = modules.find(({ module }) => module.lessons.some((lesson) => lesson.slug === selectedLesson));
  const longestModule = modules.reduce<typeof modules[number] | null>((longest, item) => item.duration != null && (longest?.duration == null || item.duration > longest.duration) ? item : longest, null);
  const currentLesson = outline.flatMap((module) => module.lessons).find((lesson) => lesson.slug === selectedLesson);
  const currentLessonWords = currentLesson?.content?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const insightModule = currentModule ?? longestModule;
  const moduleDurationShare = insightModule?.duration != null && totalKnownDuration ? insightModule.duration / totalKnownDuration : null;
  return <section className={`course-workspace course-workspace--${mode}${overview ? " course-workspace--overview" : ""}`}><header className="course-context">
    <CourseIdentityHeader course={course} capabilities={capabilities} overview={overview} />
    <CourseContextNavigation courseId={course.id} courseSlug={course.slug} enrollable={course.status === "published"} capabilities={capabilities} lessonSlug={selectedLesson} learnLessonSlug={learnLesson} activeMode={mode} overview={overview} primaryLearningAction={primaryLearningAction} />
  </header><ForgeProposalProvider><WorkspacePanels key={`${course.slug}:${selectedLesson ?? ''}:${mode}`} initialStructureOpen={!overview} structure={<CourseOutlineRail courseSlug={course.slug} outline={outline} selectedLesson={selectedLesson} mode={mode === "edit" ? "edit" : mode === "classroom" || mode === "preview" || (mode === "view" && capabilities.canPreview && !capabilities.canLearn) ? "preview" : "learn"} />} forge={mode === "preview" ? <p className="caption">Prévisualisation en lecture seule.</p> : <ForgeRail course={capabilities.canEdit ? { ...course, outline } : undefined} lessonResources={currentLesson ? Object.values(currentLesson.mediaResources ?? {}).filter((resource) => currentLesson.content?.includes(`resource=${resource.id}`)).map(({ id, kind, title, altText, caption, status }) => ({ id, kind, title, altText, caption, status })) : []} context={{ ...forgeContext, courseSlug: course.slug, courseDescription: course.description, lessonSlug: selectedLesson, lessonId: currentLesson?.id, level: course.level, hasLessonContent: Boolean(currentLesson?.content?.trim()), lessonWordCount: currentLessonWords, hasLessonObjectives: Boolean(currentLesson?.objectives.length), moduleTitle: insightModule?.module.moduleTitle, moduleDurationShare }} availability={getForgeAvailability()} />}>{content}</WorkspacePanels></ForgeProposalProvider></section>;
}
