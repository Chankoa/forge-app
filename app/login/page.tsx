"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PublicShell } from "@/components/shell/PublicShell";
import { Button } from "@/components/ui/Button";
import { safeNext } from "@/lib/auth/safe-next";
import { createBrowserClient } from "@/lib/supabase/browser";
function LoginForm() { const [error, setError] = useState(""); const next = safeNext(useSearchParams().get("next")); async function login(form: FormData) { const client = createBrowserClient(); if (!client) return setError("ENV REQUIRED : Supabase local n'est pas configuré."); const { error: authError } = await client.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) }); if (authError) return setError(authError.message); location.assign(next); } return <main className="auth-page surface"><h1>Se connecter</h1><p>Retrouvez votre intention dans l&apos;atelier Forge après connexion.</p><form className="form" action={login}><label>Email<input name="email" type="email" required /></label><label>Mot de passe<input name="password" type="password" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit">Continuer</Button></form><p className="caption">Pas encore de compte ? <Link href={`/register?next=${encodeURIComponent(next)}`}>Créer un compte</Link></p></main>; }
export default function LoginPage() { return <PublicShell><Suspense><LoginForm /></Suspense></PublicShell>; }
