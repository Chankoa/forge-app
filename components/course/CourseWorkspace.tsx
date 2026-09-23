import { getForgeAvailability } from "@/lib/forge/provider";
import type { ReactNode } from "react";
import type { CourseCapabilities } from "@/lib/capabilities/course-capabilities";
import type { CourseOutline, CourseSummary } from "@/lib/courses/contracts";
import { CourseOutlineRail } from "./CourseOutlineRail";
import { ForgeRail } from "@/components/forge/ForgeRail";
import { ForgeProposalProvider } from "@/components/forge/ForgeProposalContext";
import { Badge } from "@/components/ui/Badge";
import { CourseContextNavigation } from "./CourseContextNavigation";
import { WorkspacePanels } from "./WorkspacePanels";
import { RelationPills } from "./CoursePresentation";
import { courseRelations } from "@/lib/courses/presentation";
export function CourseWorkspace({ course, mode, capabilities, outline, content, forgeContext, selectedLesson, learnLesson }: { course: CourseSummary; mode: "view" | "learn" | "preview" | "edit" | "publication"; capabilities: CourseCapabilities; outline: CourseOutline; content: ReactNode; forgeContext: { mode: "learn" | "edit"; courseTitle: string; lessonTitle?: string }; selectedLesson?: string; learnLesson?: string }) {
  return <section className={`course-workspace course-workspace--${mode}`}><header className="course-context">
    <div className="course-context__identity"><p className="eyebrow">{course.domain ?? "Votre parcours"}</p><Badge success={course.status === "published"}>{course.status === "published" ? "Publié" : "Brouillon"}</Badge></div>
    <h1>{course.title}</h1><RelationPills relations={courseRelations(capabilities.canLearn, capabilities.canEdit)} />
    <CourseContextNavigation courseId={course.id} courseSlug={course.slug} enrollable={course.status === "published"} capabilities={capabilities} lessonSlug={selectedLesson} learnLessonSlug={learnLesson} activeMode={mode} />
  </header><ForgeProposalProvider><WorkspacePanels key={`${course.slug}:${selectedLesson ?? ''}:${mode}`} structure={<CourseOutlineRail courseSlug={course.slug} outline={outline} selectedLesson={selectedLesson} mode={mode === "edit" ? "edit" : mode === "preview" || (mode === "view" && capabilities.canPreview && !capabilities.canLearn) ? "preview" : "learn"} />} forge={mode === "preview" ? <p className="caption">Prévisualisation en lecture seule.</p> : <ForgeRail context={{ ...forgeContext, courseSlug: course.slug, lessonSlug: selectedLesson }} availability={getForgeAvailability()} />}>{content}</WorkspacePanels></ForgeProposalProvider></section>;
}
