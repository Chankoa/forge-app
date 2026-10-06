import { listDiscoverableCourses } from "@/lib/courses/explore-repository";
import { ExploreCatalog } from "@/components/course/ExploreCatalog";

export default async function ExplorePage() {
  const { courses, envRequired, unavailable } = await listDiscoverableCourses();
  return <>{envRequired || unavailable ? <p className="env-note">Le catalogue est momentanément indisponible. Réessayez dans un instant.</p> : <ExploreCatalog courses={courses} />}</>;
}
