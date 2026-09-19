"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Compass, Home, Library, LogOut, PanelLeftClose, PanelLeftOpen, PenLine, Sparkles } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { IconButton } from "@/components/ui/IconButton";
import { createBrowserClient } from "@/lib/supabase/browser";
const links = [["/app", "Accueil", Home], ["/app/courses", "Mes parcours", Library], ["/app/explore", "Explorer", Compass], ["/app/create", "Créer", PenLine]] as const;
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [collapsed, setCollapsed] = useState(false);
  const courseShell = /^\/app\/courses\/[^/]+/.test(pathname);
  async function signOut() { const client = createBrowserClient(); if (client) await client.auth.signOut(); router.push("/"); router.refresh(); }
  if (courseShell) return <div className="shell course-shell"><header className="app-header course-topbar"><Link className="brand" href="/app" aria-label="Forge — Accueil"><span className="brand__mark"><Sparkles size={18} /></span><span>Forge</span></Link><nav className="course-global-nav" aria-label="Navigation Forge">{links.map(([href, label, Icon]) => <Link key={href} href={href}><Icon size={17} /><span>{label}</span></Link>)}</nav><div className="header-actions"><ThemeToggle /><IconButton label="Se déconnecter" onClick={signOut}><LogOut size={18} /></IconButton></div></header><main className="course-body">{children}</main></div>;
  return <div className="shell app-shell" data-sidebar={collapsed ? "collapsed" : "open"}><aside className="app-sidebar"><div className="sidebar-brand-row"><Link className="brand" href="/app" aria-label="Forge — Accueil"><span className="brand__mark"><Sparkles size={18} /></span><span>Forge</span></Link><IconButton label={collapsed ? "Agrandir la navigation" : "Réduire la navigation"} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</IconButton></div><nav className="nav" aria-label="Navigation principale">{links.map(([href, label, Icon]) => <Link key={href} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={18} /><span>{label}</span></Link>)}</nav><button className="sidebar-signout" type="button" aria-label="Se déconnecter" title={collapsed ? "Se déconnecter" : undefined} onClick={signOut}><LogOut size={18} /><span>Déconnexion</span></button></aside><div className="app-main"><header className="app-header workspace-topbar"><strong className="app-header__title">{links.find(([href]) => pathname === href)?.[1] ?? "Forge"}</strong><div className="header-actions"><ThemeToggle /><IconButton label="Se déconnecter" onClick={signOut}><LogOut size={18} /></IconButton></div></header><main className="app-body">{children}</main></div></div>;
}
