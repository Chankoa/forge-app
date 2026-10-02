import { GlobalClassroomLanding } from "@/components/course/GlobalClassroomLanding";
import { getGlobalClassroomOverview } from "@/lib/courses/classroom-repository";

export default async function GlobalClassroomPage() {
  return <GlobalClassroomLanding courses={await getGlobalClassroomOverview()} />;
}