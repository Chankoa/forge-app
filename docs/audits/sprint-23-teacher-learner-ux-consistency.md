# Sprint 23 — Cohérence UX Teacher et Learner

Date : 2026-11-01.

## Prérequis Git

- Branche `main`, HEAD `c127bef` (`fix(layout): reset compact drawers on desktop transition`).
- Le Sprint 22 est committé ; l'arbre était propre avant ce lot.
- Aucun commit, déploiement, fixture QA, permission, donnée ou contrat métier n'est modifié.

## Cartographie comparative

| Parcours | Routes et composants représentatifs | Conventions observées |
|---|---|---|
| Teacher | `/app`, `/app/courses`, vue d'ensemble, `CourseEditor`, `LessonEditor`, `PublicationPanel`, ressources | Cockpit avec actions de sauvegarde/publication explicites, métriques et statut de brouillon ; éditeur local avec aperçu apprenant. |
| Learner | Explorer/Bibliothèque, détail public, `/app/courses/[slug]`, `LearnerLesson`, `LearningActions`, `LessonResourcesPanel` | Contenu pédagogique prioritaire, progression et navigation précédent/suivant ; ressources lisibles sans affordances de gestion. |
| Partagé | `CourseWorkspace`, `CourseIdentityHeader`, `CourseContextNavigation`, `CourseOutlineRail`, `CoursePresentation`, `Button`, `InlineFeedback` | Identité du cours, domaine/auteur, navigation contextuelle filtrée par capability, rails Structure/Forge et tokens communs. |

## Différences métier intentionnelles

- Les actions Teacher (édition, publication, sources, Classroom et disponibilité) sont absentes du parcours Learner : elles sont conditionnées par les capabilities, non par une différence de style.
- L’éditeur signale brouillon et sauvegarde ; le Learner signale progression et complétion. Ces états ne sont pas interchangeables.
- Les ressources utilisent le même panneau, avec `canManage` côté Teacher seulement ; le Learner conserve une lecture seule.
- Le détail public ne révèle la structure qu'après inscription, conformément au contrat de découverte/publication.

## Constats et priorités

| Priorité | Constat | Preuve / impact | Décision |
|---|---|---|---|
| P1 | Feedback de sauvegarde Teacher | `LessonEditor` utilisait `role="status"` même lorsque le message était une erreur (`form-error`). Une erreur de sauvegarde était donc annoncée comme information non urgente. | Corrigé avec la primitive partagée `InlineFeedback`. |
| P1 | Complétion Learner | `CompleteLessonButton` rendait `p.completion-state` sans rôle de statut, contrairement aux confirmations partagées. | Corrigé avec `InlineFeedback tone="success"`. |
| P2 | Barre basse mobile | Bibliothèque et Classroom sont volontairement retirés de la grille à cinq entrées sous 700 px. | Reporté : nécessite une décision de navigation, pas une harmonisation locale. |
| P2 | Ordre visuel mobile de la navigation de contexte | Le lien actif est visuellement placé en premier alors que l’ordre de tabulation reste DOM. | Reporté : validation navigateur et décision d’accessibilité nécessaires. |

## Correction retenue

Une seule convention transversale est consolidée : les feedbacks liés à une action sont rendus par `InlineFeedback`.

- Teacher : succès = `role="status"`, erreur = `role="alert"`.
- Learner : la confirmation de complétion = `role="status"` et conserve la classe `completion-state` existante.
- Aucun changement visuel, CSS, événement de sauvegarde, progression, route ou permission.

Fichiers touchés :

- `components/authoring/LessonEditor.tsx`
- `components/learning/LearningActions.tsx`
- `tests/learner-lesson.test.ts`
- `tests/teacher-learner-ux.test.ts`
- ce rapport.

## Validation

- Tests ciblés : **3/3 passent**.
- Suite complète : **531/531 passent**.
- `npm run typecheck` : **code 0**.
- `npm run lint` : **code 0**.
- `npm run build` : **code 0** (Next.js 16.3.6, 17 routes générées), sans `next dev` concurrent.
- `git diff --check` : **code 0**.
- La QA navigateur Teacher/Learner, en clair/sombre et aux largeurs 1440/768/390, n'a pas été exécutée : aucun navigateur compatible n'est disponible dans cette session. Les résultats statiques ne constituent pas une validation visuelle ou lecteur d'écran.

## Risques résiduels et backlog

1. Vérifier dans un navigateur authentifié le focus, les largeurs et l’ordre visuel/mobile de la navigation de contexte.
2. Décider séparément du mécanisme d’accès à Bibliothèque et Classroom dans la barre basse mobile.
3. Évaluer les messages Forge/dialogs dans un lot distinct : leurs états stale/pending exigent des contrats plus riches que ce feedback inline.
