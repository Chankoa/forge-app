import Link from "next/link";
import { ThemePreferenceForm } from "@/components/settings/ThemePreferenceForm";
import { Surface } from "@/components/ui/Surface";
import { settingsSections } from "@/lib/settings/settings-contracts";

export default function SettingsPage() {
  return <div className="settings-page">
    <header className="library-header"><div><p className="eyebrow">Paramètres</p><h1>Préférences</h1><p>Réglages privés de l’application. Votre identité publique se gère dans <Link href="/app/profile">votre profil</Link>.</p></div></header>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Sections des paramètres"><ul>{settingsSections.map((section) => <li key={section.id}>{section.href
        ? <Link href={section.href} aria-current={section.id === "preferences" ? "page" : undefined}>{section.label}</Link>
        : <span className="settings-nav__soon" aria-disabled="true">{section.label}<small>Bientôt</small></span>}</li>)}</ul></nav>
      <Surface className="settings-panel"><h2>Apparence</h2><ThemePreferenceForm /></Surface>
    </div>
  </div>;
}
