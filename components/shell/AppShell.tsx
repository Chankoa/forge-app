"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Compass, Home, Library, LogOut, PanelLeftClose, PanelLeftOpen, PenLine, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { IconButton } from "@/components/ui/IconButton";
import { createBrowserClient } from "@/lib/supabase/browser";

const links = [["/app", "Accueil", Home], ["/app/courses", "Mes parcours", Library], ["/app/explore", "Explorer", Compass], ["/app/create", "Créer", PenLine]] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const courseShell = /^\/app\/courses\/[^/]+/.test(pathname);
  const activeHref = pathname.startsWith("/app/courses/") ? "/app/courses" : links.find(([href]) => href === pathname)?.[0];

  async function signOut() {
    const client = createBrowserClient();
    if (client) await client.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return <div className={`shell app-shell${courseShell ? " course-shell" : ""}`} data-sidebar={collapsed ? "collapsed" : "expanded"}>
    <aside className="app-sidebar" aria-label="Navigation Forge">
      <div className="sidebar-brand-row">
        <Link className="brand" href="/app" aria-label="Forge — Accueil"><span className="brand__mark"><Sparkles size={18} /></span><span>Forge</span></Link>
        <IconButton label={collapsed ? "Déployer la navigation" : "Réduire la navigation"} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</IconButton>
        <div className="mobile-header-actions"><ThemeToggle /><IconButton label="Se déconnecter" onClick={signOut}><LogOut size={18} /></IconButton></div>
      </div>
      <nav className="nav" aria-label="Navigation principale">{links.map(([href, label, Icon]) => <Link key={href} href={href} title={collapsed ? label : undefined} aria-label={label} aria-current={activeHref === href ? "page" : undefined}><Icon size={19} strokeWidth={1.8} /><span>{label}</span></Link>)}</nav>
      <button className="sidebar-signout" type="button" aria-label="Se déconnecter" title={collapsed ? "Se déconnecter" : undefined} onClick={signOut}><LogOut size={19} strokeWidth={1.8} /><span>Déconnexion</span></button>
    </aside>
    <div className="app-main">
      <header className="app-header workspace-topbar"><strong className="app-header__title">{courseShell ? "Parcours" : links.find(([href]) => href === activeHref)?.[1] ?? "Forge"}</strong><div className="header-actions"><ThemeToggle /><IconButton label="Se déconnecter" onClick={signOut}><LogOut size={18} /></IconButton></div></header>
      <main className={courseShell ? "course-body" : "app-body"}>{children}</main>
    </div>
  </div>;
}
