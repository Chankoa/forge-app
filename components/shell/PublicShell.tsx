import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
export function PublicShell({ children }: { children: ReactNode }) { return <div className="shell"><header className="public-header"><Link className="brand" href="/"><span className="brand__mark">F</span>Forge</Link><div className="header-actions"><ThemeToggle /><Link className="button button--secondary" href="/login">Se connecter</Link></div></header>{children}</div>; }