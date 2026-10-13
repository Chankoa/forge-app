"use client";

import { useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { accountDeletionBlockerMessage, accountDeletionConfirmation } from "@/lib/settings/settings-contracts";
import { updateAccountEmailAction, updateAccountPasswordAction } from "@/app/app/settings/account/actions";
import { Button } from "@/components/ui/Button";

export function AccountSecuritySettings({
  currentEmail,
  pendingEmail,
  canSetPassword,
  ownedCourses,
}: {
  currentEmail: string;
  pendingEmail: string | null;
  canSetPassword: boolean;
  ownedCourses: number | null;
}) {
  const [email, setEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState(pendingEmail
    ? `Confirmation en attente pour ${pendingEmail}. Vérifiez cette adresse et votre boîte actuelle si la confirmation sécurisée est activée.`
    : "");
  const [emailError, setEmailError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [emailPending, startEmailTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const emailSubmitting = useRef(false);
  const passwordSubmitting = useRef(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const ownerBlocker = accountDeletionBlockerMessage(ownedCourses);

  function updateEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emailSubmitting.current) return;
    emailSubmitting.current = true;
    setEmailError(false);
    setEmailMessage("");
    const submittedEmail = email.trim();
    startEmailTransition(async () => {
      try {
        const result = await updateAccountEmailAction(submittedEmail);
        if (!result.ok) {
          setEmailError(true);
          setEmailMessage(result.message);
          return;
        }
        if (result.status === "confirmed") {
          setEmail(result.currentEmail ?? "");
          setEmailMessage("Votre adresse e-mail a été modifiée.");
        } else {
          setEmailMessage(`Vérifiez ${result.requestedEmail} pour confirmer le changement d’adresse e-mail.`);
        }
      } catch {
        setEmailError(true);
        setEmailMessage("Le changement d’adresse n’a pas pu être effectué. Vérifiez votre connexion puis réessayez.");
      } finally {
        emailSubmitting.current = false;
      }
    });
  }

  function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordSubmitting.current) return;
    passwordSubmitting.current = true;
    setPasswordError(false);
    setPasswordMessage("");
    startPasswordTransition(async () => {
      try {
        const result = await updateAccountPasswordAction(password, confirmation);
        if (!result.ok) {
          setPasswordError(true);
          setPasswordMessage(result.message);
          return;
        }
        setPassword("");
        setConfirmation("");
        setPasswordMessage("Votre mot de passe a été modifié.");
      } catch {
        setPasswordError(true);
        setPasswordMessage("La modification du mot de passe n’a pas pu être effectuée. Vérifiez votre connexion puis réessayez.");
      } finally {
        passwordSubmitting.current = false;
      }
    });
  }

  const emailBusy = emailPending;
  const passwordBusy = passwordPending;
  return <div className="account-security">
    <section className="account-security__section" aria-labelledby="account-email-heading">
      <div>
        <h3 id="account-email-heading">Adresse e-mail</h3>
        <p>Adresse actuelle : <strong>{currentEmail || "Non renseignée"}</strong></p>
        <p className="caption">Une confirmation peut être demandée sur votre nouvelle adresse et, selon les réglages de sécurité, sur votre adresse actuelle.</p>
      </div>
      <form className="account-security__form" onSubmit={updateEmail}>
        <label htmlFor="account-new-email">Nouvelle adresse e-mail</label>
        <input id="account-new-email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} disabled={emailBusy} aria-describedby="account-email-message" />
        <Button type="submit" variant="secondary" disabled={emailBusy}>{emailBusy ? "Enregistrement…" : "Modifier l’adresse"}</Button>
        {emailMessage && <p id="account-email-message" className={emailError ? "form-error" : "account-security__success"} role={emailError ? "alert" : "status"} aria-live="polite">{emailMessage}</p>}
      </form>
    </section>

    <section className="account-security__section" aria-labelledby="account-password-heading">
      <div>
        <h3 id="account-password-heading">Mot de passe</h3>
        <p>{canSetPassword ? "Définissez ou modifiez le mot de passe utilisé pour vous connecter par e-mail." : "Le fournisseur associé à votre compte ne permet pas de gérer un mot de passe depuis Forge."}</p>
      </div>
      {canSetPassword && <form className="account-security__form" onSubmit={updatePassword}>
        <label htmlFor="account-new-password">Nouveau mot de passe</label>
        <input id="account-new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={passwordBusy} aria-describedby="account-password-guidance account-password-message" />
        <label htmlFor="account-confirm-password">Confirmer le mot de passe</label>
        <input id="account-confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={passwordBusy} aria-describedby="account-password-guidance account-password-message" />
        <p id="account-password-guidance" className="caption">8 caractères minimum.</p>
        <Button type="submit" variant="secondary" disabled={passwordBusy}>{passwordBusy ? "Enregistrement…" : "Modifier le mot de passe"}</Button>
        {passwordMessage && <p id="account-password-message" className={passwordError ? "form-error" : "account-security__success"} role={passwordError ? "alert" : "status"} aria-live="polite">{passwordMessage}</p>}
      </form>}
    </section>

    <section className="account-security__section account-security__section--danger" aria-labelledby="account-delete-heading">
      <div>
        <h3 id="account-delete-heading">Zone de danger</h3>
        <p>La suppression du compte est définitive. Les parcours que vous ne possédez pas restent associés à leurs propriétaires.</p>
      </div>
      <div className="account-security__delete">
        {ownedCourses !== null && ownedCourses > 0 && <p className="account-security__blocker" role="status" aria-live="polite">
          {ownerBlocker} Avant de supprimer votre compte, vous devez transférer ou supprimer les parcours dont vous êtes propriétaire.
          <br />Le transfert de propriété n’est pas encore disponible. <Link href="/app/courses">Gérer mes parcours</Link>
        </p>}
        {ownedCourses === null && <p className="account-security__blocker" role="status" aria-live="polite">{ownerBlocker}</p>}
        <p className="account-security__blocker" role="status">
          La suppression reste désactivée : les médias de parcours attribués à ce compte doivent être préservés et dissociés de l’identité avant toute suppression. Aucun parcours ne sera supprimé ni transféré.
        </p>
        <label htmlFor="account-delete-confirmation">Pour confirmer, saisissez {accountDeletionConfirmation}</label>
        <input id="account-delete-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} disabled aria-describedby="account-delete-status" />
        <button className="button button--danger" type="button" disabled aria-describedby="account-delete-status">Supprimer définitivement le compte</button>
        <p id="account-delete-status" className="caption">La suppression est temporairement indisponible jusqu’à la vérification des dépendances en base de données.</p>
      </div>
    </section>
  </div>;
}
