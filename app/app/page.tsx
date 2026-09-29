import { PublicIntentExperience } from "@/components/forge/PublicIntentExperience";
import { WorkspaceContextRail, WorkspaceSections } from "@/components/workspace/WorkspaceDashboard";
import { listActiveDomains } from "@/lib/courses/authoring-repository";
import { listMyCourses } from "@/lib/courses/learning-repository";

export default async function AppHome() {
  const [domains, courses] = await Promise.all([listActiveDomains(), listMyCourses()]);
  return <div className="workspace-home workspace-journey workspace-dashboard">
    <div className="workspace-dashboard__main">
      <PublicIntentExperience authenticated domains={domains.map(({ name }) => ({ name }))} />
      <WorkspaceSections courses={courses} />
    </div>
    <WorkspaceContextRail courses={courses} />
  </div>;
}
