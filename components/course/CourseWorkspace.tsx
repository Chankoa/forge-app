import { getForgeAvailability } from "@/lib/forge/provider";
import type { ReactNode } from "react";
import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";
import type { CourseOutline, CourseSummary } from "@/lib/courses/contracts";
import { CourseOutlineRail } from "./CourseOutlineRail";
import { ForgeRail } from "@/components/forge/ForgeRail";
import { ForgeProposalProvider } from "@/components/forge/ForgeProposalContext";
import { CourseContextNavigation } from "./CourseContextNavigation";
import { WorkspacePanels } from "./WorkspacePanels";
import { CourseIdentityHeader } from "./CourseIdentityHeader";
export function CourseWorkspace({ course, mode, capabilities, outline, content, forgeContext, selectedLesson, learnLesson, overview = false, primaryLearningAction }: { course: CourseSummary; mode: "view" | "learn" | "preview" | "edit" | "publication"; capabilities: CourseCapabilities; outline: CourseOutline; content: ReactNode; forgeContext: { mode: "learn" | "edit"; courseTitle: string; lessonTitle?: string }; selectedLesson?: string; learnLesson?: string; overview?: boolean; primaryLearningAction?: ReactNode }) {
  return <section className={`course-workspace course-workspace--${mode}${overview ? " course-workspace--overview" : ""}`}><header className="course-context">
    <CourseIdentityHeader course={course} capabilities={capabilities} overview={overview} />
    <CourseContextNavigation courseId={course.id} courseSlug={course.slug} enrollable={course.status === "published"} capabilities={capabilities} lessonSlug={selectedLesson} learnLessonSlug={learnLesson} activeMode={mode} overview={overview} primaryLearningAction={primaryLearningAction} />
  </header><ForgeProposalProvider><WorkspacePanels key={`${course.slug}:${selectedLesson ?? ''}:${mode}`} initialStructureOpen={!overview} structure={<CourseOutlineRail courseSlug={course.slug} outline={outline} selectedLesson={selectedLesson} mode={mode === "edit" ? "edit" : mode === "preview" || (mode === "view" && capabilities.canPreview && !capabilities.canLearn) ? "preview" : "learn"} />} forge={mode === "preview" ? <p className="caption">Prévisualisation en lecture seule.</p> : <ForgeRail context={{ ...forgeContext, courseSlug: course.slug, lessonSlug: selectedLesson, lessonId: outline.flatMap((module) => module.lessons).find((lesson) => lesson.slug === selectedLesson)?.id, level: course.level, hasLessonContent: Boolean(outline.flatMap((module) => module.lessons).find((lesson) => lesson.slug === selectedLesson)?.content?.trim()) }} availability={getForgeAvailability()} />}>{content}</WorkspacePanels></ForgeProposalProvider></section>;
}
