# Sprint 18 - Recette navigateur authentifiee

Date : 2026-10-29.

## Resultat

**PARTIAL : recette bloquee avant toute modification.**

La page navigateur partagee est accessible et affiche une interface connectee,
mais l'acces au cours canonique ne permet pas d'ouvrir son contenu. L'identite
Teacher / Owner QA n'a pas ete confirmee ; une interface connectee ne suffit pas
a prouver ce role.

## Preuves observables

1. Page partagee ouverte sur `http://localhost:3000/app/courses`, titre `Forge`.
   La navigation applicative et le bouton `Se deconnecter` sont presents.
2. Navigation directe vers
   `http://localhost:3000/app/courses/qa-forge-reliability-course`.
   L'URL reste celle du cours, sans redirection vers la connexion.
3. Le contenu principal affiche uniquement :
   **« Ce parcours est introuvable ou momentanément indisponible. »**
   Le message a aussi ete capture avec l'outil de capture navigateur, sur
   l'element `main` uniquement.
4. Aucun editeur, aucune lecon et aucune action Forge du cours QA ne sont
   accessibles sur cette page.

Ce message ne permet pas de distinguer un cours absent, un refus d'acces ou
une indisponibilite temporaire. Aucune conclusion sur la cause n'est revendiquee.

## Matrice de recette

| Verification | Statut | Preuve / limite |
|---|---|---|
| Acces a la page navigateur partagee | PASS | Interface applicative et bouton de deconnexion visibles |
| Session Teacher / Owner QA | PARTIAL | Session connectee apparente ; identite et ownership non confirmes |
| Acces au cours QA et lecture de son etat initial | FAIL | Message d'indisponibilite a l'URL canonique ; echec du prerequis, pas preuve d'une regression Sprint 18 |
| Modification locale sans sauvegarde | NON EXECUTE | Editeur inaccessible |
| Blocage des actions Forge sur brouillon local | NON EXECUTE | Aucune action du cours accessible |
| Sauvegarde explicite puis reactivation des actions | NON EXECUTE | Aucun contenu modifie ni sauvegarde effectuee |
| Contexte explicite de la version sauvegardee pendant l'analyse | NON EXECUTE | Aucune analyse lancee |
| Proposition obsolete apres modification | NON EXECUTE | Aucune proposition generee |
| Refus d'application stale | NON EXECUTE | Aucune application tentee |
| Nouvelle analyse et application explicite au brouillon | NON EXECUTE | Aucune analyse lancee |
| Viewer sans edition ni generation | NON EXECUTE | Aucune session Viewer disponible ou utilisee ; aucun changement de compte |
| Restauration et verification de sauvegarde initiale | NON EXECUTE | Aucune mutation ; contenu initial non lisible, donc sauvegarde non verifiable |
| Absence de mutation et d'appel IA par cette recette | PASS | Navigation et observations uniquement ; aucune action d'edition, de sauvegarde ou de generation declenchee |

## Preservation et limites

- Aucun identifiant, mot de passe, cookie, token ou stockage d'authentification
  n'a ete consulte, affiche ou manipule.
- Aucun appel IA declenche, aucune modification du cours, des lecons, des
  membres, des ressources, de la publication ou de la visibilite.
- Aucune restauration n'a ete tentee : elle aurait necessite une mutation sans
  etat initial verifiable.
- Aucun autre cours utilise comme substitution ; fixture canonique non recreee.
- Aucun commit ni deploiement. Aucun code applicatif modifie par cette recette.
- Les resultats des tests automatises precedents ne sont pas presentes comme
  une preuve de recette navigateur. Ils n'ont pas ete reexecutes ici.

## Reprise

Retablir manuellement l'acces de la session Owner QA au cours canonique,
puis reprendre a la lecture et a la conservation de l'etat initial avant
toute modification. Une session Viewer autorisee distincte sera necessaire
pour verifier ses restrictions sans simuler un role.

## Etat Git observe

Branche `main`. Avant cette recette : neuf fichiers suivis modifies et trois
nouveaux fichiers Sprint 18, non indexes. La recette ajoute uniquement ce
rapport ; les changements existants ont ete preserves.

Statuts : implementation Sprint 18 existante ; recette navigateur **PARTIAL** ;
validation fonctionnelle **non acquise** ; aucun deploiement effectue.
