import { ExploreCatalog } from "@/components/course/ExploreCatalog";
import { PublicShell } from "@/components/shell/PublicShell";
import { listDiscoverableCourses } from "@/lib/courses/explore-repository";

export default async function PublicExplorePage() {
  const { courses, unavailable } = await listDiscoverableCourses();
  return <PublicShell>{unavailable ? <p className="public-route-note">Le catalogue est momentanément indisponible. Réessayez dans un instant.</p> : <ExploreCatalog courses={courses} publicView />}</PublicShell>;
}