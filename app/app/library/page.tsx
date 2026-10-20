import { redirect } from "next/navigation";
import "@/styles/library.scss";
import { LibraryView } from "@/components/library/LibraryView";
import { loadLibraryItems } from "@/lib/library/library-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function LibraryPage() {
  const client = await createServerSupabaseClient();
  const userId = client ? (await client.auth.getUser()).data.user?.id : null;
  if (!client || !userId) redirect("/login");
  const { items, courses } = await loadLibraryItems(client, userId);
  return <LibraryView items={items} courses={courses.map((c) => ({ id: c.id, title: c.title }))} />;
}
