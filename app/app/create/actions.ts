"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { courseMetadataSchema, lessonSchema, moduleSchema } from "@/lib/forge/authoring-contracts";
import { getCourseDetail } from "@/lib/courses/learning-repository";
import { getPublicationReadiness } from "@/lib/courses/publication";
import { revalidatePath } from "next/cache";
import { publicCoursePreviewSchema } from "@/lib/forge/public-contracts";
import { normalizeAuthoringText } from "@/lib/courses/authoring-text";
import { courseDomainUpdate, parseDomainSelection } from "@/lib/forge/domain-mapping";

function slugify(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72) || "nouveau-parcours"; }
async function authorClient() { const client = await createServerSupabaseClient(); if (!client) throw new Error("Supabase local n'est pas configuré."); const { data: { user } } = await client.auth.getUser(); if (!user) throw new Error("Votre session a expiré. Connectez-vous à nouveau."); return { client, user }; }
async function requireOwner(courseId: string) { const { client, user } = await authorClient(); const { data: course } = await client.from("courses").select("id,teacher_id").eq("id", courseId).maybeSingle(); if (!course || course.teacher_id !== user.id) throw new Error("Vous ne pouvez pas modifier ce parcours."); return { client, user }; }
type AuthorClient = Awaited<ReturnType<typeof authorClient>>["client"];
async function validatedDomainId(client: AuthorClient, value: unknown) {
  const id = parseDomainSelection(value);
  if (!id) return null;
  const { data, error } = await client.from("domains").select("id").eq("id", id).eq("status", "active").maybeSingle();
  if (error || !data) throw new Error("Le domaine sélectionné n'est plus disponible. Choisissez-en un autre ou aucun domaine.");
  return data.id;
}

export async function createCourseAction(formData: FormData) {
  const { client, user } = await authorClient();
  let rawProposal: unknown; try { rawProposal = JSON.parse(String(formData.get("proposal") || "")); } catch { throw new Error("La proposition Forge est invalide."); }
  const proposal = publicCoursePreviewSchema.safeParse(rawProposal);
  if (!proposal.success) throw new Error("La proposition Forge est invalide. Régénérez-la avant de créer le parcours.");
  const domainId = await validatedDomainId(client, formData.get("domainId"));
  const parsed = courseMetadataSchema.parse({ title: proposal.data.title, description: proposal.data.summary, subtitle: proposal.data.learningOutcomes.slice(0, 3).join(" · ").slice(0, 500) });
  const baseSlug = slugify(parsed.title); let slug = baseSlug;
  for (let suffix = 2; suffix < 20; suffix += 1) { const { data } = await client.from("courses").select("id").eq("slug", slug).maybeSingle(); if (!data) break; slug = `${baseSlug}-${suffix}`; }
  const { data: course, error } = await client.from("courses").insert({ teacher_id: user.id, domain_id: domainId, slug, title: parsed.title, subtitle: parsed.subtitle || null, description: parsed.description, status: "draft", visibility: "private", availability: "preview" }).select("id,slug").single();
  if (error?.code === "23502" && !domainId) throw new Error("La création sans domaine n'est pas encore disponible sur cette base. La mise à jour de la base doit être appliquée.");
  if (error || !course) throw new Error("Le parcours n'a pas pu être créé.");
  const { data: modules, error: modulesError } = await client.from("course_modules").insert(proposal.data.modules.map((module, index) => ({ course_id: course.id, slug: `${slugify(module.title)}-${index + 1}`, title: module.title, display_order: index, status: "draft" }))).select("id,display_order");
  if (modulesError || !modules?.length) throw new Error("Le parcours a été créé, mais sa structure n'a pas pu être ajoutée.");
  const lessons = proposal.data.modules.flatMap((module, moduleIndex) => {
    const createdModule = modules.find((item) => item.display_order === moduleIndex);
    return createdModule ? module.outcomes.map((outcome, lessonIndex) => ({ course_id: course.id, module_id: createdModule.id, slug: `${slugify(outcome)}-${lessonIndex + 1}`, title: outcome, description: module.summary, display_order: lessonIndex, status: "draft", type: "reading", objectives: [outcome] })) : [];
  });
  if (lessons.length) { const { error: lessonsError } = await client.from("lessons").insert(lessons); if (lessonsError) throw new Error("Le parcours a été créé, mais ses leçons n'ont pas pu être ajoutées."); }
  return { ok: true as const, redirectTo: `/app/courses/${course.slug}?mode=edit` };
}

export async function saveCourseMetadataAction(courseId: string, formData: FormData) {
  const fieldNames = Array.from(formData.keys());
  const rawDescription = formData.get("description");
  const description = normalizeAuthoringText(rawDescription);
  const parsed = courseMetadataSchema.safeParse({ title: formData.get("title"), description, subtitle: formData.get("subtitle") || undefined });
  console.info("[forge] course save", {
    courseId,
    fieldNames,
    titleChars: typeof formData.get("title") === "string" ? String(formData.get("title")).length : 0,
    subtitleChars: typeof formData.get("subtitle") === "string" ? String(formData.get("subtitle")).length : 0,
    descriptionCharsRaw: typeof rawDescription === "string" ? rawDescription.length : 0,
    descriptionCharsNormalized: description?.length ?? 0,
    schemaValid: parsed.success,
    schemaIssues: parsed.success ? [] : parsed.error.issues.map(({ path, code }) => ({ field: path.join("."), code })),
  });
  if (!parsed.success) throw new Error("Les informations du parcours sont invalides.");
  const { client } = await requireOwner(courseId);
  const domainId = formData.has("domainId") ? await validatedDomainId(client, formData.get("domainId")) : undefined;
  console.info("[forge] course save update", { courseId, attempted: true });
  const { data, error } = await client.from("courses").update({ title: parsed.data.title, description: parsed.data.description, subtitle: parsed.data.subtitle || null, ...courseDomainUpdate(domainId) }).eq("id", courseId).select("id,description").maybeSingle();
  const errorStatus = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : null;
  console.info("[forge] course save result", { courseId, errorCode: error?.code ?? null, errorStatus, rowsAffected: data ? 1 : 0, descriptionChars: data?.description?.length ?? 0 });
  if (error || !data) throw new Error("Les informations n'ont pas pu être sauvegardées.");
  revalidatePath("/app/courses"); revalidatePath("/app/courses/[courseSlug]", "page");
  console.info("[forge] course save revalidated", { courseId, executed: true });
}

export async function addModuleAction(courseId: string, formData: FormData) { const { client } = await requireOwner(courseId); const parsed = moduleSchema.safeParse({ title: formData.get("title") }); if (!parsed.success) throw new Error("Le titre du module est requis."); const { count } = await client.from("course_modules").select("id", { count: "exact", head: true }).eq("course_id", courseId); const { error } = await client.from("course_modules").insert({ course_id: courseId, slug: `${slugify(parsed.data.title)}-${Date.now()}`, title: parsed.data.title, display_order: count ?? 0, status: "draft" }); if (error) throw new Error("Le module n'a pas pu être ajouté."); }
export async function renameModuleAction(courseId: string, moduleId: string, formData: FormData) { const { client } = await requireOwner(courseId); const parsed = moduleSchema.safeParse({ title: formData.get("title") }); if (!parsed.success) throw new Error("Le titre du module est requis."); const { error } = await client.from("course_modules").update({ title: parsed.data.title }).eq("id", moduleId).eq("course_id", courseId); if (error) throw new Error("Le module n'a pas pu être renommé."); revalidatePath("/app/courses"); }

export async function addLessonAction(courseId: string, moduleId: string, formData: FormData) { const { client } = await requireOwner(courseId); const parsed = lessonSchema.safeParse({ title: formData.get("title"), description: formData.get("description") || undefined }); if (!parsed.success) throw new Error("Le titre de la leçon est requis."); const { count } = await client.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId); const { error } = await client.from("lessons").insert({ course_id: courseId, module_id: moduleId, slug: `${slugify(parsed.data.title)}-${Date.now()}`, title: parsed.data.title, description: parsed.data.description || null, display_order: count ?? 0, status: "draft", type: "reading", objectives: [] }); if (error) throw new Error("La leçon n'a pas pu être ajoutée."); }

export async function saveLessonAction(courseId: string, lessonId: string, formData: FormData) { const { client } = await requireOwner(courseId); const parsed = lessonSchema.safeParse({ title: formData.get("title") ?? "Leçon", description: formData.get("description") || undefined, content: formData.get("content") || undefined, objectives: formData.has("objectives") ? String(formData.get("objectives") || "").split("\n").map((item) => item.trim()).filter(Boolean) : undefined, type: formData.get("type") || undefined, durationMinutes: formData.has("durationMinutes") ? formData.get("durationMinutes") === "" ? null : formData.get("durationMinutes") : undefined, publishingStatus: formData.get("publishingStatus") || undefined }); if (!parsed.success) throw new Error("Les informations de la leçon sont invalides."); const values = { ...(formData.has("title") ? { title: parsed.data.title } : {}), ...(formData.has("description") ? { description: parsed.data.description || null } : {}), ...(formData.has("content") ? { content: parsed.data.content || null } : {}), ...(formData.has("objectives") ? { objectives: parsed.data.objectives ?? [] } : {}), ...(formData.has("type") ? { type: parsed.data.type } : {}), ...(formData.has("durationMinutes") ? { duration_minutes: parsed.data.durationMinutes ?? null } : {}), ...(formData.has("publishingStatus") ? { status: parsed.data.publishingStatus } : {}) }; const { error } = await client.from("lessons").update(values).eq("id", lessonId).eq("course_id", courseId); if (error) throw new Error("La leçon n'a pas pu être sauvegardée."); revalidatePath("/app/courses"); revalidatePath("/app/courses/[courseSlug]", "page"); }

export async function publishCourseAction(courseId: string, courseSlug: string) { const { client } = await requireOwner(courseId); const course = await getCourseDetail(courseSlug); if (!course || course.id !== courseId) throw new Error("Le parcours est introuvable."); const readiness = getPublicationReadiness(course); if (!readiness.ready) throw new Error(readiness.blocking[0]); const now = new Date().toISOString(); const [{ error: modulesError }, { error: lessonsError }] = await Promise.all([client.from("course_modules").update({ status: "published" }).eq("course_id", courseId).neq("status", "locked"), client.from("lessons").update({ status: "published" }).eq("course_id", courseId).neq("status", "locked")]); if (modulesError || lessonsError) throw new Error("Les éléments du parcours n'ont pas pu être préparés pour publication."); const { error } = await client.from("courses").update({ status: "published", visibility: "public", availability: "complete", published_at: now }).eq("id", courseId); if (error) throw new Error("Le parcours n'a pas pu être publié."); revalidatePath("/app/explore"); revalidatePath("/app/courses"); revalidatePath(`/app/courses/${courseSlug}`); }

export async function unpublishCourseAction(courseId: string, courseSlug: string) { const { client } = await requireOwner(courseId); const { error } = await client.from("courses").update({ status: "draft", visibility: "private", availability: "preview", published_at: null }).eq("id", courseId); if (error) throw new Error("Le parcours n'a pas pu être dépublié."); revalidatePath("/app/explore"); revalidatePath("/app/courses"); revalidatePath(`/app/courses/${courseSlug}`); }
