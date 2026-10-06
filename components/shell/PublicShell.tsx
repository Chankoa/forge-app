import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
export function PublicShell({ children }: { children: ReactNode }) { return <div className="shell"><header className="public-header"><Link className="brand" href="/"><span className="brand__mark">✦</span><span>Forge</span></Link><nav className="nav" aria-label="Navigation publique"><Link href="/">Accueil</Link><Link href="/explore">Parcours</Link></nav><div className="header-actions"><ThemeToggle /><Link className="button button--secondary" href="/login">Se connecter</Link><Link className="button public-signup" href="/register?next=/app/create">Créer un compte</Link></div></header>{children}</div>; }
