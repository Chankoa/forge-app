import { Surface } from "@/components/ui/Surface";
import { CreateCourseForm } from "@/components/authoring/CreateCourseForm";
import { listActiveDomains } from "@/lib/courses/authoring-repository";
export default async function CreatePage() { const domains = await listActiveDomains(); return <div className="create-journey"><header className="page-header create-journey__header"><div><p className="eyebrow">Créer avec Forge</p><h1>Créer un parcours</h1><p>Décrivez ce que vos apprenants doivent pouvoir comprendre ou faire. Forge préparera une proposition que vous relirez avant de créer le parcours.</p></div></header><Surface className="create-surface"><CreateCourseForm domains={domains} /></Surface></div>; }
