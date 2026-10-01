import { z } from "zod";

export const profileNameSchema = z.object({ name: z.string().trim().min(2).max(120) });
export type SelfProfile = { id: string; name: string | null };