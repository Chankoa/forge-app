# F6 — First Value Loop

## Funnel

`/` est l'expérience publique non connectée. Le visiteur saisit une intention, choisit facultativement un format, reçoit une proposition Forge structurée, ajuste le domaine et poursuit vers l'authentification. Un utilisateur déjà connecté est redirigé de `/` vers `/app`; Create reste accessible directement depuis le Workspace.

Le CTA de continuation enregistre `forge.publicDraft.v1` dans le stockage local puis ouvre `/login?next=/app/create?from=public`. Login et signup conservent cette destination. Le callback email applique également `next`.

## Génération anonyme et frontière de sécurité

`public_course_preview` est une opération dédiée. Elle valide une entrée de 12 à 500 caractères et produit un objet Zod strict : titre, résumé, domaine suggéré, format, niveau/durée facultatifs, objectifs et 2 à 6 modules. Elle réutilise AI SDK et la configuration provider F4, avec un prompt métier public distinct.

L'opération est server-only. Elle ne reçoit aucun identifiant utilisateur, repository, course, source ou contexte privé. Elle n'utilise ni `course_sources`, ni service role, ni écriture Supabase. Le provider est limité à 1 800 output tokens, 30 secondes, zéro retry et cinq générations par heure et empreinte réseau, via le rate limiter process-local existant.

Limite V1 : le quota process-local ne constitue pas un quota distribué multi-instance. Une infrastructure de rate limit partagée est requise avant une montée en charge publique importante.

## Draft et continuité auth

Le draft contient uniquement intention, format, domaine, proposition, version, date de création et cycle de vie. Il expire après 24 heures et les versions inconnues sont rejetées. Il n'est jamais placé dans l'URL ni en base. Son cycle explicite est `CREATED → PREVIEWED → AUTH_PENDING → RESTORED_IN_CREATE → CONSUMED`. Signup et attente de confirmation ne le suppriment pas. Create le marque restauré ; il n'est supprimé qu'après réussite de l'action de création. Une erreur serveur conserve donc le draft. Le flow same-browser survit à une confirmation email, y compris si le lien ouvre un autre onglet du même navigateur et de la même origine ; la continuité cross-device n'est pas garantie.

Le callback applique `safeNext` côté serveur. `/app/create?from=public` est conservé, tandis que les URLs absolues et protocol-relative retombent sur `/app`.

## Create et persistence boundary

`/app/create` restaure le draft, permet d'ajuster intention, public, objectif, format et domaine, puis de régénérer. Une proposition est toujours présentée pour revue. Avant le clic explicite « Créer ce parcours », la base reste inchangée.

Après acceptation, l'action F2 authentifiée crée le course privé/draft avec `teacher_id` égal à l'utilisateur courant, puis mappe les modules et outcomes vers les tables existantes. Les champs publics non stockables directement (format, niveau, durée textuelle) restent des métadonnées de proposition et ne déclenchent aucune migration. La navigation finale ouvre le parcours en mode Edit.

## Fermeture visuelle F6.1

Create et Generated Path utilisent désormais le token partagé `--container-wide` (1280 px) et toute la largeur disponible du Workspace, sans étirer les champs au-delà du viewport utile. L'intention reste dominante, suivie des formats puis des trois guidages contexte/domaine. Generated Path affiche aussi le niveau et les objectifs globaux, avant une grille responsive de modules.

Les CTA suivent une iconographie unique : Sparkles pour préparer/créer, RefreshCw pour régénérer et ArrowRight pour poursuivre l'authentification.

Dans Mes parcours, la décision est dérivée des relations et de la progression : `Commencer` à 0 %, `Continuer` entre 1 et 99 %, `Revoir` à 100 %, et `Gérer` dès que l'utilisateur est owner. Owner + learner conserve les deux pills, mais un seul CTA primaire `Gérer`.

## Audit suppression de parcours

Owner course deletion supported: **NO (non démontré dans le repo)**.
Course deletion: **BLOCKED pending verified SQL/RLS/cascade audit**.

Cascade reviewed: **NO**. Le dépôt ne contient ni migrations ni dump de schéma permettant de vérifier les foreign keys et `ON DELETE` pour `course_modules`, `lessons`, `enrollments`, `lesson_progress`, `course_sources` et le stockage associé. Les policies DELETE owner ne sont pas disponibles non plus.

Le menu owner `…` est présent et accessible, mais `Supprimer` reste désactivé avec l'explication du blocage. Aucun `service_role`, contournement RLS ou DELETE optimiste n'a été ajouté. Une future implémentation exige un audit SQL vérifiable des cascades et policies.

## Domaines

La liste `domains` existante est utilisée. Si les politiques RLS ne permettent pas sa lecture, l'UI le signale et aucune migration ou élévation de privilèges n'est tentée dans F6.

## Erreurs

Les états invalid request, quota, timeout, provider indisponible et résultat invalide sont traduits en messages utilisateur. Aucun détail provider, prompt interne, stack ou secret n'est exposé.
