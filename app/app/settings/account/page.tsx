import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccountSecuritySettings } from "@/components/settings/AccountSecuritySettings";
import { Surface } from "@/components/ui/Surface";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasEmailIdentity, settingsSections } from "@/lib/settings/settings-contracts";

export default async function AccountSettingsPage() {
  const client = await createServerSupabaseClient();
  let currentEmail = "";
  let pendingEmail: string | null = null;
  let canSetPassword = false;
  let ownedCourses: number | null = null;

  if (client) {
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (user && !userError) {
      currentEmail = user.email ?? "";
      pendingEmail = user.new_email ?? null;
      const providers = user.app_metadata?.providers;
      const identityProviders = user.identities?.map((identity) => identity.provider) ?? [];
      const allProviders = [...(Array.isArray(providers) ? providers : []), ...identityProviders];
      canSetPassword = hasEmailIdentity(allProviders);
      const { count, error } = await client.from("courses")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", user.id);
      ownedCourses = error ? null : count ?? 0;
    }
  }

  return <div className="settings-page">
    <Link className="settings-back-link" href="/app/profile"><ArrowLeft size={16} aria-hidden="true" />Retour au profil</Link>
    <header className="library-header">
      <div>
        <p className="eyebrow">Paramètres</p>
        <h1>Compte</h1>
        <p>Adresse e-mail, mot de passe et suppression du compte. Votre identité publique se gère dans <Link href="/app/profile">votre profil</Link>.</p>
      </div>
    </header>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Sections des paramètres">
        <ul>{settingsSections.map((section) => <li key={section.id}>{section.href
          ? <Link href={section.href} aria-current={section.id === "account" ? "page" : undefined}>{section.label}</Link>
          : <span className="settings-nav__soon" aria-disabled="true">{section.label}<small>Bientôt</small></span>}</li>)}</ul>
      </nav>
      <Surface className="settings-panel">
        <h2>Sécurité du compte</h2>
        <AccountSecuritySettings currentEmail={currentEmail} pendingEmail={pendingEmail} canSetPassword={canSetPassword} ownedCourses={ownedCourses} />
      </Surface>
    </div>
  </div>;
}
