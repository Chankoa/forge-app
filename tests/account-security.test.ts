import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  accountDeletionBlockerMessage,
  accountEmailUpdateStatus,
  accountSecurityErrorFromAuth,
  accountSecurityErrorMessage,
  hasEmailIdentity,
  validateAccountEmail,
  validateAccountPassword,
} from "../lib/settings/settings-contracts";

test("account email validation accepts normalized input and rejects invalid values", () => {
  assert.equal(validateAccountEmail("  new@example.com "), "new@example.com");
  assert.equal(validateAccountEmail("not-an-email"), null);
  assert.equal(validateAccountEmail(`${"a".repeat(321)}@example.com`), null);
});

test("email updates distinguish pending confirmation from a confirmed change", () => {
  assert.equal(accountEmailUpdateStatus("old@example.com", "new@example.com", "new@example.com"), "pending");
  assert.equal(accountEmailUpdateStatus("new@example.com", null, "NEW@example.com"), "confirmed");
  assert.equal(accountEmailUpdateStatus("old@example.com", null, "new@example.com"), null);
});

test("account security auth errors map to product messages without exposing provider text", () => {
  const duplicate = accountSecurityErrorFromAuth({ code: "email_exists", status: 422 }, "email");
  assert.equal(accountSecurityErrorMessage(duplicate), "Cette adresse est déjà utilisée.");
  const unknown = accountSecurityErrorMessage(accountSecurityErrorFromAuth({ code: "unexpected_storage_policy_detail" }, "email"));
  assert.equal(unknown, "La modification n’a pas pu être effectuée.");
  assert.doesNotMatch(unknown, /unexpected_storage_policy_detail/);
});

test("password validation checks length and matching confirmation", () => {
  assert.equal(validateAccountPassword("short", "short"), "password_too_short");
  assert.equal(validateAccountPassword("long-enough", "different"), "password_mismatch");
  assert.equal(validateAccountPassword("long-enough", "long-enough"), null);
  assert.equal(accountSecurityErrorFromAuth({ code: "same_password" }, "password"), "same_password");
});

test("password controls are only offered for an email identity", () => {
  assert.equal(hasEmailIdentity(["email", "google"]), true);
  assert.equal(hasEmailIdentity(["google"]), false);
  assert.equal(hasEmailIdentity(null), false);
});

test("account deletion blocker reports zero, one, multiple, and unavailable ownership checks", () => {
  assert.equal(accountDeletionBlockerMessage(0), null);
  assert.equal(accountDeletionBlockerMessage(1), "Vous possédez encore 1 parcours.");
  assert.equal(accountDeletionBlockerMessage(3), "Vous possédez encore 3 parcours.");
  assert.match(accountDeletionBlockerMessage(null) ?? "", /bloquée par sécurité/);
});

test("account deletion stays disabled while authored course media needs safe anonymization", () => {
  const component = readFileSync("components/settings/AccountSecuritySettings.tsx", "utf8");
  assert.match(component, /médias de parcours attribués à ce compte doivent être préservés et dissociés/);
  assert.match(component, /Supprimer définitivement le compte<\/button>/);
  assert.match(component, /type="button" disabled aria-describedby="account-delete-status"/);
  assert.doesNotMatch(component, /deleteUser|admin\.delete/i);
});
