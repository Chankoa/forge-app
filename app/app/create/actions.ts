"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { courseMetadataSchema, lessonSchema, moduleSchema } from "@/lib/forge/authoring-contracts";
import { getCourseDetail } from "@/lib/courses/learning-repository";
import { archiveCourseUpdate, getPublicationReadiness, restoreCourseUpdate } from "@/lib/courses/publication";
import { adjacentSwap, emptyModuleBlocker, nextDisplayOrder, type MoveDirection } from "@/lib/courses/structure-operations";
import { revalidatePath } from "next/cache";
import { publicCoursePreviewSchema } from "@/lib/forge/public-contracts";
import { normalizeAuthoringText } from "@/lib/courses/authoring-text";
import { courseDomainUpdate, parseDomainSelection } from "@/lib/forge/domain-mapping";
import { resolveCourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { draftCourseCreationAttributes, ownerEditorRedirect } from "@/lib/forge/creation-flow";

function slugify(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72) || "nouveau-parcours"; }
async function authorClient() { const client = await createServerSupabaseClient(); if (!client) throw new Error("Supabase local n'est pas configuré."); const { data: { user } } = await client.auth.getUser(); if (!user) throw new Error("Votre session a expiré. Connectez-vous à nouveau."); return { client, user }; }
async function requireOwner(courseId: string) { const { client, user } = await authorClient(); const { data: course } = await client.from("courses").select("id,teacher_id,slug,status").eq("id", courseId).maybeSingle(); if (!course || course.teacher_id !== user.id) throw new Error("Vous ne pouvez pas modifier ce parcours."); return { client, user, course }; }
type AuthoringCapability = "canEditMetadata" | "canEditStructure" | "canEditLessons";
async function requireAuthoringCapability(courseId: string, capability: AuthoringCapability) {
  const { client, user } = await authorClient();
  const [{ data: course }, { data: membership }] = await Promise.all([
    client.from("courses").select("id,teacher_id,slug,status").eq("id", courseId).maybeSingle(),
    client.from("course_memberships").select("role,status").eq("course_id", courseId).eq("user_id", user.id).maybeSingle(),
  ]);
  const capabilities = resolveCourseCapabilities({ isOwner: course?.teacher_id === user.id, isEnrolled: false, courseStatus: course?.status, membershipRole: membership?.role, membershipStatus: membership?.status });
  if (!course || !capabilities[capability]) throw new Error("Vous ne pouvez pas modifier ce parcours.");
  return { client, user, course, capabilities };
}
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
  if (!parseDomainSelection(formData.get("domainId"))) throw new Error("Choisissez un domaine avant de créer le parcours.");
  const domainId = await validatedDomainId(client, formData.get("domainId"));
  const parsed = courseMetadataSchema.parse({ title: proposal.data.title, description: proposal.data.summary, subtitle: proposal.data.learningOutcomes.slice(0, 3).join(" · ").slice(0, 500) });
  const baseSlug = slugify(parsed.title); let slug = baseSlug;
  for (let suffix = 2; suffix < 20; suffix += 1) { const { data } = await client.from("courses").select("id").eq("slug", slug).maybeSingle(); if (!data) break; slug = `${baseSlug}-${suffix}`; }
  const { data: course, error } = await client.from("courses").insert({ teacher_id: user.id, ...draftCourseCreationAttributes(domainId), slug, title: parsed.title, subtitle: parsed.subtitle || null, description: parsed.description }).select("id,slug").single();
  if (error || !course) throw new Error("Le parcours n'a pas pu être créé.");
  const { data: modules, error: modulesError } = await client.from("course_modules").insert(proposal.data.modules.map((module, index) => ({ course_id: course.id, slug: `${slugify(module.title)}-${index + 1}`, title: module.title, display_order: index, status: "draft" }))).select("id,display_order");
  if (modulesError || !modules?.length) throw new Error("Le parcours a été créé, mais sa structure n'a pas pu être ajoutée.");
  const lessons = proposal.data.modules.flatMap((module, moduleIndex) => {
    const createdModule = modules.find((item) => item.display_order === moduleIndex);
    return createdModule ? module.outcomes.map((outcome, lessonIndex) => ({ course_id: course.id, module_id: createdModule.id, slug: `${slugify(outcome)}-${lessonIndex + 1}`, title: outcome, description: module.summary, display_order: lessonIndex, status: "draft", type: "reading", objectives: [outcome] })) : [];
  });
  if (lessons.length) { const { error: lessonsError } = await client.from("lessons").insert(lessons); if (lessonsError) throw new Error("Le parcours a été créé, mais ses leçons n'ont pas pu être ajoutées."); }
  return { ok: true as const, redirectTo: ownerEditorRedirect(course.slug) };
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
  const { client } = await requireAuthoringCapability(courseId, "canEditMetadata");
  const domainId = formData.has("domainId") ? await validatedDomainId(client, formData.get("domainId")) : undefined;
  console.info("[forge] course save update", { courseId, attempted: true });
  const { data, error } = await client.from("courses").update({ title: parsed.data.title, description: parsed.data.description, subtitle: parsed.data.subtitle || null, ...courseDomainUpdate(domainId) }).eq("id", courseId).select("id,description").maybeSingle();
  const errorStatus = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : null;
  console.info("[forge] course save result", { courseId, errorCode: error?.code ?? null, errorStatus, rowsAffected: data ? 1 : 0, descriptionChars: data?.description?.length ?? 0 });
  if (error || !data) throw new Error("Les informations n'ont pas pu être sauvegardées.");
  revalidatePath("/app/courses"); revalidatePath("/app/courses/[courseSlug]", "page");
  console.info("[forge] course save revalidated", { courseId, executed: true });
}

export async function addModuleAction(courseId: string, formData: FormData) { const { client, course } = await requireAuthoringCapability(courseId, "canEditStructure"); const parsed = moduleSchema.safeParse({ title: formData.get("title") }); if (!parsed.success) throw new Error("Le titre du module est requis."); const { data: last, error: readError } = await client.from("course_modules").select("display_order").eq("course_id", courseId).order("display_order", { ascending: false }).limit(1); if (readError) throw new Error("L’ordre des modules est indisponible."); const { error } = await client.from("course_modules").insert({ course_id: courseId, slug: `${slugify(parsed.data.title)}-${Date.now()}`, title: parsed.data.title, display_order: nextDisplayOrder(last), status: "draft" }); if (error) throw new Error("Le module n'a pas pu être ajouté."); revalidatePath(`/app/courses/${course.slug}`); revalidatePath("/app/courses"); }
export async function renameModuleAction(courseId: string, moduleId: string, formData: FormData) { const { client, course } = await requireAuthoringCapability(courseId, "canEditStructure"); const parsed = moduleSchema.safeParse({ title: formData.get("title") }); if (!parsed.success) throw new Error("Le titre du module est requis."); const { data, error } = await client.from("course_modules").update({ title: parsed.data.title }).eq("id", moduleId).eq("course_id", courseId).select("id").maybeSingle(); if (error || !data) throw new Error("Le module n'a pas pu être renommé."); revalidatePath(`/app/courses/${course.slug}`); revalidatePath("/app/courses"); }
export async function renameLessonTitleAction(courseId: string, lessonId: string, formData: FormData) { const { client, course } = await requireAuthoringCapability(courseId, "canEditLessons"); const parsed = lessonSchema.safeParse({ title: formData.get("title") }); if (!parsed.success) throw new Error("Le titre de la leçon est requis."); const { data, error } = await client.from("lessons").update({ title: parsed.data.title }).eq("id", lessonId).eq("course_id", courseId).select("id").maybeSingle(); if (error || !data) throw new Error("La leçon n'a pas pu être renommée."); revalidatePath(`/app/courses/${course.slug}`); revalidatePath("/app/courses"); }

export async function addLessonAction(courseId: string, moduleId: string, formData: FormData) { const { client, course } = await requireAuthoringCapability(courseId, "canEditLessons"); const parsed = lessonSchema.safeParse({ title: formData.get("title"), description: formData.get("description") || undefined }); if (!parsed.success) throw new Error("Le titre de la leçon est requis."); const { data: module } = await client.from("course_modules").select("id").eq("id", moduleId).eq("course_id", courseId).maybeSingle(); if (!module) throw new Error("Module introuvable."); const { data: last, error: readError } = await client.from("lessons").select("display_order").eq("course_id", courseId).eq("module_id", moduleId).order("display_order", { ascending: false }).limit(1); if (readError) throw new Error("L’ordre des leçons est indisponible."); const { error } = await client.from("lessons").insert({ course_id: courseId, module_id: moduleId, slug: `${slugify(parsed.data.title)}-${Date.now()}`, title: parsed.data.title, description: parsed.data.description || null, display_order: nextDisplayOrder(last), status: "draft", type: "reading", objectives: [] }); if (error) throw new Error("La leçon n'a pas pu être ajoutée."); revalidatePath(`/app/courses/${course.slug}`); revalidatePath("/app/courses"); }

export async function saveLessonAction(courseId: string, lessonId: string, formData: FormData) { const { client, capabilities } = await requireAuthoringCapability(courseId, "canEditLessons"); const parsed = lessonSchema.safeParse({ title: formData.get("title") ?? "Leçon", description: formData.get("description") || undefined, content: formData.get("content") || undefined, objectives: formData.has("objectives") ? String(formData.get("objectives") || "").split("\n").map((item) => item.trim()).filter(Boolean) : undefined, type: formData.get("type") || undefined, durationMinutes: formData.has("durationMinutes") ? formData.get("durationMinutes") === "" ? null : formData.get("durationMinutes") : undefined, publishingStatus: formData.get("publishingStatus") || undefined }); if (!parsed.success) throw new Error("Les informations de la leçon sont invalides."); if (!capabilities.canPublish && formData.has("publishingStatus")) throw new Error("La publication des leçons est réservée au propriétaire du parcours."); const values = { ...(formData.has("title") ? { title: parsed.data.title } : {}), ...(formData.has("description") ? { description: parsed.data.description || null } : {}), ...(formData.has("content") ? { content: parsed.data.content || null } : {}), ...(formData.has("objectives") ? { objectives: parsed.data.objectives ?? [] } : {}), ...(formData.has("type") ? { type: parsed.data.type } : {}), ...(formData.has("durationMinutes") ? { duration_minutes: parsed.data.durationMinutes ?? null } : {}), ...(formData.has("publishingStatus") ? { status: parsed.data.publishingStatus } : {}) }; const { error } = await client.from("lessons").update(values).eq("id", lessonId).eq("course_id", courseId); if (error) throw new Error("La leçon n'a pas pu être sauvegardée."); revalidatePath("/app/courses"); revalidatePath("/app/courses/[courseSlug]", "page"); }

async function reorderAdjacent(courseId: string, table: "course_modules" | "lessons", itemId: string, direction: MoveDirection, moduleId?: string) {
  const { client, course } = await requireAuthoringCapability(courseId, "canEditStructure");
  let query = client.from(table).select("id,display_order").eq("course_id", courseId).order("display_order").order("id");
  if (table === "lessons") {
    if (!moduleId) throw new Error("Module introuvable.");
    query = query.eq("module_id", moduleId);
  }
  const { data: rows, error: readError } = await query;
  if (readError || !rows) throw new Error("L’ordre du parcours est indisponible.");
  const { current, neighbor } = adjacentSwap(rows, itemId, direction);
  const update = (id: string, from: number, to: number) => {
    let mutation = client.from(table).update({ display_order: to }).eq("id", id).eq("course_id", courseId).eq("display_order", from);
    if (table === "lessons") mutation = mutation.eq("module_id", moduleId!);
    return mutation.select("id").maybeSingle();
  };
  const first = await update(current.id, current.display_order, neighbor.display_order);
  if (first.error || !first.data) throw new Error("Le déplacement n’a pas pu être enregistré.");
  const second = await update(neighbor.id, neighbor.display_order, current.display_order);
  if (second.error || !second.data) {
    await update(current.id, neighbor.display_order, current.display_order);
    throw new Error("Le déplacement n’a pas pu être terminé. Actualisez la page.");
  }
  revalidatePath(`/app/courses/${course.slug}`);
  revalidatePath("/app/courses");
}
export async function moveModuleAction(courseId: string, moduleId: string, direction: MoveDirection) {
  await reorderAdjacent(courseId, "course_modules", moduleId, direction);
}
export async function moveLessonAction(courseId: string, moduleId: string, lessonId: string, direction: MoveDirection) {
  await reorderAdjacent(courseId, "lessons", lessonId, direction, moduleId);
}
export async function deleteEmptyModuleAction(courseId: string, moduleId: string) {
  const { client, course } = await requireAuthoringCapability(courseId, "canEditStructure");
  const { data: module, error: moduleError } = await client.from("course_modules").select("id,title").eq("id", moduleId).eq("course_id", courseId).maybeSingle();
  if (moduleError || !module) throw new Error("Module introuvable.");
  const [{ count: lessons, error: lessonsError }, { count: resources, error: resourcesError }] = await Promise.all([
    client.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId).eq("module_id", moduleId),
    client.from("resources").select("id", { count: "exact", head: true }).eq("course_id", courseId).eq("module_id", moduleId),
  ]);
  if (lessonsError || resourcesError) throw new Error("Les dépendances du module n’ont pas pu être vérifiées.");
  const blocker = emptyModuleBlocker(lessons, resources);
  if (blocker) throw new Error(blocker);
  const { data, error } = await client.from("course_modules").delete().eq("id", moduleId).eq("course_id", courseId).select("id").maybeSingle();
  if (error || !data) throw new Error("Le module n’a pas pu être supprimé. Vérifiez qu’il est toujours vide.");
  revalidatePath(`/app/courses/${course.slug}`);
  revalidatePath("/app/courses");
}

export async function publishCourseAction(courseId: string, courseSlug: string) { const { client } = await requireOwner(courseId); const course = await getCourseDetail(courseSlug); if (!course || course.id !== courseId) throw new Error("Le parcours est introuvable."); const readiness = getPublicationReadiness(course); if (!readiness.ready) throw new Error(readiness.blocking[0]); const now = new Date().toISOString(); const [{ error: modulesError }, { error: lessonsError }] = await Promise.all([client.from("course_modules").update({ status: "published" }).eq("course_id", courseId).neq("status", "locked"), client.from("lessons").update({ status: "published" }).eq("course_id", courseId).neq("status", "locked")]); if (modulesError || lessonsError) throw new Error("Les éléments du parcours n'ont pas pu être préparés pour publication."); const { error } = await client.from("courses").update({ status: "published", visibility: "public", availability: "complete", published_at: now }).eq("id", courseId); if (error) throw new Error("Le parcours n'a pas pu être publié."); revalidatePath("/app/explore"); revalidatePath("/app/courses"); revalidatePath(`/app/courses/${courseSlug}`); }

export async function unpublishCourseAction(courseId: string, courseSlug: string) { const { client } = await requireOwner(courseId); const { error } = await client.from("courses").update({ status: "draft", visibility: "private", availability: "preview", published_at: null }).eq("id", courseId); if (error) throw new Error("Le parcours n'a pas pu être dépublié."); revalidatePath("/app/explore"); revalidatePath("/app/courses"); revalidatePath(`/app/courses/${courseSlug}`); }

export async function archiveCourseAction(courseId: string, courseSlug: string) {
  const { client, course } = await requireOwner(courseId);
  const values = archiveCourseUpdate(course.status);
  if (!values) throw new Error("Seul un parcours brouillon ou publié peut être archivé.");
  const { error } = await client.from("courses").update(values).eq("id", courseId);
  if (error) throw new Error("Le parcours n'a pas pu être archivé.");
  revalidatePath("/app/explore"); revalidatePath("/app/courses"); revalidatePath(`/app/courses/${courseSlug}`); revalidatePath(`/app/courses/${courseSlug}/lessons`, "layout");
}

export async function restoreCourseAction(courseId: string, courseSlug: string) {
  const { client, course } = await requireOwner(courseId);
  const values = restoreCourseUpdate(course.status);
  if (!values) throw new Error("Seul un parcours archivé peut être restauré.");
  const { error } = await client.from("courses").update(values).eq("id", courseId);
  if (error) throw new Error("Le parcours n'a pas pu être restauré.");
  revalidatePath("/app/explore"); revalidatePath("/app/courses"); revalidatePath(`/app/courses/${courseSlug}`); revalidatePath(`/app/courses/${courseSlug}/lessons`, "layout");
}
