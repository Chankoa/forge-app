export type SettingsSection = { id: string; label: string; href: string | null };

// Only sections backed by real behaviour have an href; the others are listed as upcoming.
export const settingsSections: SettingsSection[] = [
  { id: "account", label: "Compte", href: "/app/settings/account" },
  { id: "preferences", label: "Préférences", href: "/app/settings" },
  { id: "notifications", label: "Notifications", href: null },
  { id: "forge-ai", label: "Forge AI", href: null },
  { id: "privacy", label: "Confidentialité", href: null },
  { id: "billing", label: "Facturation", href: null },
];

export const themePreferences = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof themePreferences)[number];
export const themeStorageKey = "forge-theme";

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): "light" | "dark" {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export const accountPasswordMinLength = 8;
export const accountDeletionConfirmation = "SUPPRIMER";

export type AccountSecurityError = "invalid_email" | "email_in_use" | "reauthentication_required" | "session_expired" | "password_too_short" | "password_mismatch" | "same_password" | "update_failed";

export function validateAccountEmail(value: string) {
  const email = value.trim();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validateAccountPassword(password: string, confirmation: string): AccountSecurityError | null {
  if (password.length < accountPasswordMinLength) return "password_too_short";
  if (password !== confirmation) return "password_mismatch";
  return null;
}

export function hasEmailIdentity(providers: readonly string[] | null | undefined): boolean {
  return providers?.includes("email") ?? false;
}

export function accountEmailUpdateStatus(currentEmail: string | null | undefined, pendingEmail: string | null | undefined, requestedEmail: string): "confirmed" | "pending" | null {
  if (currentEmail?.toLowerCase() === requestedEmail.toLowerCase()) return "confirmed";
  if (pendingEmail?.toLowerCase() === requestedEmail.toLowerCase()) return "pending";
  return null;
}

export function accountSecurityErrorFromAuth(error: { code?: string; status?: number }, operation: "email" | "password"): AccountSecurityError {
  const code = error.code?.toLowerCase() ?? "";
  if (code === "email_exists" || code === "user_already_exists") return "email_in_use";
  if (error.status === 401 || code.includes("reauth") || code === "session_not_found" || code === "session_expired") return "reauthentication_required";
  if (operation === "password" && code === "same_password") return "same_password";
  if (operation === "password" && (code === "weak_password" || code === "password_too_short")) return "password_too_short";
  return "update_failed";
}

export function accountSecurityErrorMessage(error: AccountSecurityError): string {
  switch (error) {
    case "invalid_email": return "Saisissez une adresse e-mail valide.";
    case "email_in_use": return "Cette adresse est déjà utilisée.";
    case "reauthentication_required": return "Votre session doit être renouvelée avant cette modification. Reconnectez-vous puis réessayez.";
    case "session_expired": return "Votre session a expiré. Reconnectez-vous pour continuer.";
    case "password_too_short": return `Le mot de passe doit contenir au moins ${accountPasswordMinLength} caractères.`;
    case "password_mismatch": return "Les mots de passe ne correspondent pas.";
    case "same_password": return "Choisissez un mot de passe différent de l’actuel.";
    case "update_failed": return "La modification n’a pas pu être effectuée.";
  }
}

export function accountDeletionBlockerMessage(ownedCourses: number | null): string | null {
  if (ownedCourses === null) return "La vérification de vos parcours est indisponible. La suppression reste bloquée par sécurité.";
  if (ownedCourses === 0) return null;
  return `Vous possédez encore ${ownedCourses} parcours.`;
}
