"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { parseThemePreference, resolveTheme, themeStorageKey, type ThemePreference } from "@/lib/settings/settings-contracts";

const options: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Clair", Icon: Sun },
  { value: "dark", label: "Sombre", Icon: Moon },
  { value: "system", label: "Système", Icon: Monitor },
];

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.theme = resolveTheme(preference, window.matchMedia("(prefers-color-scheme: dark)").matches);
  window.dispatchEvent(new Event("forge-theme-change"));
}

export function ThemePreferenceForm() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  useEffect(() => {
    const stored = parseThemePreference(window.localStorage.getItem(themeStorageKey));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after hydration
    setPreference(stored);
  }, []);
  const choose = (next: ThemePreference) => {
    setPreference(next);
    if (next === "system") window.localStorage.removeItem(themeStorageKey); else window.localStorage.setItem(themeStorageKey, next);
    applyTheme(next);
  };
  return <fieldset className="theme-preference"><legend>Thème</legend>
    <div className="theme-preference__options">{options.map(({ value, label, Icon }) => <label key={value} className="theme-preference__option"><input type="radio" name="theme" value={value} checked={preference === value} onChange={() => choose(value)} /><span><Icon size={16} aria-hidden="true" />{label}</span></label>)}</div>
  </fieldset>;
}
