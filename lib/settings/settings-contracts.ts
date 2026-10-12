export type SettingsSection = { id: string; label: string; href: string | null };

// Only sections backed by real behaviour have an href; the others are listed as upcoming.
export const settingsSections: SettingsSection[] = [
  { id: "account", label: "Compte", href: null },
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
