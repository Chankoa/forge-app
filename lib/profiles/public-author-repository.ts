import { isPublicCourse, publicAuthorIdentityFromRpcData, type PublicAuthorIdentity } from "./author-identity";

type PublicAuthorRpcClient = {
  rpc: (functionName: string, args: { target_course_id: string }) => PromiseLike<{ data: unknown; error: unknown }>;
};

export async function getPublicCourseAuthor(client: PublicAuthorRpcClient, course: { id: string; status: string | null; visibility: string | null }): Promise<PublicAuthorIdentity | null> {
  if (!isPublicCourse(course)) return null;
  const { data, error } = await client.rpc("get_public_course_author", { target_course_id: course.id });
  return error ? null : publicAuthorIdentityFromRpcData(data);
}