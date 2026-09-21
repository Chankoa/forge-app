import { Surface } from "@/components/ui/Surface";
import { CreateCourseForm } from "@/components/authoring/CreateCourseForm";
import { listActiveDomains } from "@/lib/courses/authoring-repository";
export default async function CreatePage() { const domains = await listActiveDomains(); return <><header className="page-header"><div><p className="eyebrow">Apprendre · Créer</p><h1>Quel savoir allez-vous construire aujourd&apos;hui&nbsp;?</h1><p>Décrivez une idée, un besoin ou une question. Forge vous accompagne pour la transformer en parcours d&apos;apprentissage.</p></div></header><Surface className="create-surface"><CreateCourseForm domains={domains} /></Surface></>; }
