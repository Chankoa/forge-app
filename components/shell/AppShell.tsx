"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { IconButton } from "@/components/ui/IconButton";
import { createBrowserClient } from "@/lib/supabase/browser";
const links = [["/app", "Accueil"], ["/app/courses", "Mes parcours"], ["/app/explore", "Explorer"], ["/app/create", "Créer"]] as const;
export function AppShell({ children }: { children: ReactNode }) { const pathname = usePathname(); const router = useRouter(); async function signOut() { const client = createBrowserClient(); if (client) await client.auth.signOut(); router.push("/"); router.refresh(); } return <div className="shell"><header className="app-header"><Link className="brand" href="/app"><span className="brand__mark">F</span>Forge</Link><nav className="nav" aria-label="Navigation principale">{links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav><div className="header-actions"><ThemeToggle /><IconButton label="Se déconnecter" onClick={signOut}><LogOut size={18} /></IconButton></div></header><main className="app-body">{children}</main></div>; }