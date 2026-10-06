export type RemixSubmitResult = { ok: true; redirectTo: string } | { ok: false; error: string };

export async function submitCourseRemixOnce(
  lock: { current: boolean },
  create: () => Promise<RemixSubmitResult>,
  navigate: (url: string) => void,
): Promise<RemixSubmitResult | null> {
  if (lock.current) return null;
  lock.current = true;
  let result: RemixSubmitResult;
  try {
    result = await create();
  } catch {
    lock.current = false;
    return { ok: false, error: "Impossible de créer le remix pour le moment." };
  }
  if (!result.ok) {
    lock.current = false;
    return result;
  }
  navigate(result.redirectTo);
  return result;
}
