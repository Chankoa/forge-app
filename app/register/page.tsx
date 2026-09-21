"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PublicShell } from "@/components/shell/PublicShell";
import { Button } from "@/components/ui/Button";
import { createBrowserClient } from "@/lib/supabase/browser";
import { safeNext } from "@/lib/auth/safe-next";
function RegisterForm() { const [message, setMessage] = useState(""); const next = safeNext(useSearchParams().get("next")); async function register(form: FormData) { const client = createBrowserClient(); if (!client) return setMessage("ENV REQUIRED : Supabase local n'est pas configuré."); const { data, error } = await client.auth.signUp({ email: String(form.get("email")), password: String(form.get("password")), options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } }); if (error) return setMessage(error.message); if (data.session) location.assign(next); else setMessage("Vérifiez votre email pour confirmer votre compte. Votre intention restera disponible sur ce navigateur."); } return <main className="auth-page surface"><h1>Créer un compte Forge</h1><form className="form" action={register}><label>Email<input name="email" type="email" required /></label><label>Mot de passe<input name="password" type="password" minLength={8} required /></label>{message && <p className="form-error" role="status">{message}</p>}<Button type="submit">Créer mon compte</Button></form><p className="caption">Déjà un compte ? <Link href={`/login?next=${encodeURIComponent(next)}`}>Se connecter</Link></p></main>; }
export default function RegisterPage() { return <PublicShell><Suspense><RegisterForm /></Suspense></PublicShell>; }
