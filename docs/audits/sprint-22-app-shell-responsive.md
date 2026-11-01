# Sprint 22 — App Shell et navigation responsive

Date : 2026-11-01.

## État initial

- Branche `main`, HEAD `337565c` (`refactor(ui): introduce shared InlineFeedback component`).
- Le Sprint 21 est committé et `git status --short` est vide avant ce lot.
- Aucun fixture QA, rôle, permission, flux de publication, sauvegarde ou comportement Forge n'est modifié.

## Cartographie

| Surface | Composition et mécanisme observés |
|---|---|
| Shell authentifié | `AppShell` : grille sidebar / contenu sur desktop ; sidebar réduite entre 701 et 1099 px ; barre basse à cinq entrées sous 700 px. `app/app/layout.tsx` fournit le profil et la session. |
| Shell public | `PublicShell` : en-tête, navigation publique et actions d'authentification ; indépendant du shell authentifié. |
| Contexte cours | `CourseWorkspace` assemble identité, `CourseContextNavigation`, `WorkspacePanels`, rail Structure et rail Forge. Les liens restent filtrés par les capabilities reçues. |
| Rails | `WorkspacePanels` bascule à 1279 px : colonnes desktop au-dessus, tiroirs modaux Structure/Forge en dessous. Les rails gèrent Escape, focus initial, piège Tab et restitution du focus. |
| CSS | `styles/globals.css` contient les règles finales de shell et les breakpoints 1279, 1099, 700 et 480 px. `custom-styles.css` est chargé après et contient encore un override expérimental de grille du workspace, déjà reporté par le Sprint 20.4. |

## Constats

### Corrigé — état de tiroir mobile conservé après agrandissement

`WorkspacePanels` conservait `mobilePanel` lorsqu'un tiroir était ouvert à largeur compacte puis que la fenêtre redevenait desktop. Le tiroir cessait visuellement d'être modal (`compact === false`), mais son état restait mémorisé. Un retour ultérieur sous 1280 px pouvait donc rouvrir Structure ou Forge sans nouvelle action utilisateur.

Correction locale : `mobilePanelForViewport` retourne `null` hors viewport compact et un effet synchronise cet état à chaque changement de breakpoint. Les destinations, le contenu, les rôles et le cycle Forge restent inchangés. La fermeture du tiroir laisse le cleanup existant restituer le focus au déclencheur initial.

Fichiers :

- `components/course/WorkspacePanels.tsx`
- `lib/courses/workspace-layout.ts`
- `tests/workspace-layout.test.ts`

### Écart non corrigé — barre de navigation mobile limitée

Sous 700 px, la grille basse présente cinq entrées et masque explicitement Bibliothèque et Classroom. Le commentaire CSS confirme l'intention de conserver ces routes sans les offrir dans la navigation compacte. Ajouter un débordement ou modifier cette sélection serait un nouveau mécanisme de navigation : décision UX hors du lot.

### Risques nécessitant une recette navigateur

- L'override expérimental `.course-workspace .workspace-columns` dans `custom-styles.css` concurrence encore les colonnes desktop, comme documenté au Sprint 20.4.
- L'onglet de contexte actif est déplacé visuellement en premier sur mobile (`order: -1`) ; l'ordre de tabulation demeure celui du DOM. Une vérification réelle est nécessaire avant toute modification.
- Les dimensions, scroll horizontal du sélecteur de contexte et empilement réel des sheets doivent être observés à 1440, 768 et 390 px, dans les deux thèmes.

## Validation

- Test ciblé `workspace-layout` : **3/3 passent**.
- Suite complète : **529/529 passent**.
- `npm run typecheck` : **code 0**.
- `npm run lint` : **code 0**, avec quatre avertissements `no-img-element` préexistants hors lot.
- `npm run build` : **non finalisé dans cet exécuteur**. La commande est interrompue pendant `Creating an optimized production build ...`, sans processus Node survivant ni `.next/BUILD_ID`. Le `.next/lock` vide, vérifié orphelin, a été retiré. À reprendre dans un terminal indépendant avec `npm run build`, sans `next dev` concurrent.
- `git diff --check` : **code 0**.
- Validation navigateur : non annoncée tant qu'un navigateur compatible n'est pas disponible ; aucune fixture n'est modifiée.

## Recommandations reportées

1. Décider explicitement de l'accès compact à Bibliothèque et Classroom avant de changer la barre basse.
2. Réaliser une recette authentifiée des rails et de la navigation de contexte avant de traiter les overrides expérimentaux de grille.
