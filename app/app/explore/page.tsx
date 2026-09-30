import { listDiscoverableCourses } from "@/lib/courses/explore-repository";
import { ExploreCatalog } from "@/components/course/ExploreCatalog";

export default async function ExplorePage() {
  const { courses, envRequired, unavailable } = await listDiscoverableCourses();
  return <>{envRequired ? <p className="env-note"><strong>ENV REQUIRED.</strong> Configurez les variables Supabase locales pour lire les parcours publiés du backend LearnIt.</p> : unavailable ? <p className="env-note"><strong>SUPABASE READ UNAVAILABLE.</strong> La lecture des parcours publiés est momentanément indisponible. Vérifiez la configuration locale et les accès du projet partagé.</p> : <ExploreCatalog courses={courses} />}</>;
}
