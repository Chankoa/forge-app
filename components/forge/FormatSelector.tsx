"use client";
import { BookOpen, FileCheck2, Layers3, Wrench } from "lucide-react";
import { publicCourseFormatLabels, publicCourseFormats, type PublicCourseFormat } from "@/lib/forge/public-contracts";
const icons = { full_course: BookOpen, practical_workshop: Wrench, exam_prep: FileCheck2, thematic_module: Layers3 };
export function FormatSelector({ value, onChange }: { value?: PublicCourseFormat; onChange(value?: PublicCourseFormat): void }) {
  return <div className="format-selector" aria-label="Format du parcours">{publicCourseFormats.map((format) => { const Icon = icons[format]; return <button key={format} type="button" aria-pressed={value === format} onClick={() => onChange(value === format ? undefined : format)}><Icon size={15} />{publicCourseFormatLabels[format]}</button>; })}</div>;
}
