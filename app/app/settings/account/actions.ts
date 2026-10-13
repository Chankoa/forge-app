"use server";

import { revalidatePath } from "next/cache";
import { accountEmailUpdateStatus, accountSecurityErrorFromAuth, accountSecurityErrorMessage, validateAccountEmail, validateAccountPassword } from "@/lib/settings/settings-contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AccountActionResult =
  | { ok: true; status: "pending" | "confirmed"; currentEmail: string | null; requestedEmail: string }
  | { ok: false; message: string };

type PasswordActionResult = { ok: true } | { ok: false; message: string };

async function getAuthenticatedClient() {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { client, user: data.user };
}

export async function updateAccountEmailAction(value: unknown): Promise<AccountActionResult> {
  const requestedEmail = typeof value === "string" ? validateAccountEmail(value) : null;
  if (!requestedEmail) return { ok: false, message: accountSecurityErrorMessage("invalid_email") };

  const auth = await getAuthenticatedClient();
  if (!auth) return { ok: false, message: accountSecurityErrorMessage("session_expired") };

  const { data, error } = await auth.client.auth.updateUser({ email: requestedEmail });
  if (error) return { ok: false, message: accountSecurityErrorMessage(accountSecurityErrorFromAuth(error, "email")) };
  if (!data.user) return { ok: false, message: accountSecurityErrorMessage("update_failed") };

  const currentEmail = data.user.email ?? null;
  const status = accountEmailUpdateStatus(currentEmail, data.user.new_email, requestedEmail);
  if (!status) return { ok: false, message: accountSecurityErrorMessage("update_failed") };

  revalidatePath("/app/settings/account");
  return { ok: true, status, currentEmail, requestedEmail };
}

export async function updateAccountPasswordAction(password: unknown, confirmation: unknown): Promise<PasswordActionResult> {
  if (typeof password !== "string" || typeof confirmation !== "string") return { ok: false, message: accountSecurityErrorMessage("update_failed") };
  const validationError = validateAccountPassword(password, confirmation);
  if (validationError) return { ok: false, message: accountSecurityErrorMessage(validationError) };

  const auth = await getAuthenticatedClient();
  if (!auth) return { ok: false, message: accountSecurityErrorMessage("session_expired") };

  const providers = auth.user.app_metadata?.providers;
  const identityProviders = auth.user.identities?.map((identity) => identity.provider) ?? [];
  const emailIdentity = (Array.isArray(providers) ? providers : []).includes("email") || identityProviders.includes("email");
  if (!emailIdentity) return { ok: false, message: "Votre fournisseur de connexion ne permet pas de définir un mot de passe ici." };

  const { error } = await auth.client.auth.updateUser({ password });
  if (error) return { ok: false, message: accountSecurityErrorMessage(accountSecurityErrorFromAuth(error, "password")) };

  revalidatePath("/app/settings/account");
  return { ok: true };
}
