# Sprint 20.4 — Cascade CSS et overrides : consolidation ciblée

Statut : **un groupe consolidé**, deux groupes étudiés puis **reportés**. Non committé, non déployé. Aucune recette navigateur authentifiée n'a été exécutée dans ce sprint.

## 1. État initial de la cascade

### Git

- Branche `main`, HEAD `2899d94` (`fix(a11y): improve keyboard navigation and focus management`).
- `git status --short` vide, `git diff` vide : aucune modification non committée du Sprint 20.3 à préserver.

### Ordre de chargement

```
app/layout.tsx
  1. styles/globals.css
       @import tokens.css -> themes.css -> forge-course-plan.css
       puis 13 244 lignes de règles
  2. styles/experiments/custom-styles.css   (chargé après, sur toutes les routes)
app/app/library/page.tsx
  3. styles/library.css                       (route Bibliothèque, préfixe .lib-)
```

`app/globals.css` et `app/page.module.css` n'ont pas d'import actif (constat déjà établi aux Sprints 19 et 20.1) ; ils ne participent pas à la cascade et n'ont pas été modifiés.

Conséquence structurante : une règle de `custom-styles.css` l'emporte sur toute règle de `globals.css` de **même spécificité**, y compris celles placées dans des `@media`. Un override expérimental neutralise donc les variantes responsive de même spécificité à toutes les largeurs.

### Mesures (`globals.css`, état initial)

| Indicateur | Valeur |
|---|---|
| Lignes | 13 244 |
| Règles de style | 2 352, dont 540 dans des `@media` |
| Blocs `@media` | 76 |
| Couples (contexte `@media`, sélecteur) déclarés plusieurs fois | 214 (303 occurrences supplémentaires) |
| Sélecteurs de premier niveau déclarés 3 fois ou plus | 51 (ex. `.workspace-columns` ×6, `.personal-course-row` ×6, `.course-workspace` ×5) |
| `!important` | 33 dans `globals.css`, 0 dans `custom-styles.css` |
| Commentaires `/* TEST */` dans `globals.css` | 13 (ex. `.course-author { display: inline-flex!important; /* TEST */ }`) |

Ces mesures proviennent d'une analyse syntaxique ponctuelle hors dépôt (commentaires retirés, imbrication `@media` suivie). Elles décrivent des redéfinitions et non des défauts : une règle redéfinie peut porter des propriétés différentes.

## 2. Analyse des overrides expérimentaux (`custom-styles.css`)

| Règle | Rôle observé | Concurrence dans `globals.css` | Statut | Destination proposée |
|---|---|---|---|---|
| `.sidebar-nav {}` | Bloc vide (commentaire seul) | Aucun usage TSX ni CSS | Sans effet | Supprimer — **reporté** (voir §4, G1) |
| `.button-primary {}` | Bloc vide (commentaire seul) | Aucune classe consommée ; seule la variable `--button-primary-text` existe | Sans effet | Supprimer — **reporté** (G1) |
| `.explore-journey { padding }` | Ajoute un `padding` à la page Explorer | `.explore-journey` ne définit que `display` et `gap` | **Effet réel** | Intégrer après validation visuelle |
| `.course-author { padding-top }` `/* TEST */` | Décale l'attribution auteur | 3 règles de premier niveau + variantes contextuelles plus spécifiques | Effet réel sur les contextes non surchargés | Décider ou isoler (statut TEST) |
| `.course-workspace .workspace-columns` | Grille 320 px et `padding` | Même spécificité que les règles `globals.css`, y compris des `@media` | **Collision responsive probable** | Isoler ; validation navigateur requise |
| `.lucide-list-tree { display: none }` | Masque l'icône `ListTree` (bouton Structure, titre du rail) | Aucune | Correctif visuel actif | Conserver, puis corriger la cause dans le composant |
| `.outline-module summary { padding }` | Remplace `padding: 4px 2px` | Même sélecteur, chargé plus tôt | Effet réel | Intégrer |
| `.outline-module ol::before { left: 14px }` | Remplace `left: 10px` | Même sélecteur | Effet réel | Intégrer |
| `.cockpit-program > .section-heading` | `padding-top`, `border: none` ; `margin-bottom: 16px` identique à `globals.css` | 3 règles | Partiellement redondant | Intégrer (périmètre éditeur, reporté) |
| `.cockpit-lessons li > div` | `min-width` et `display` effectifs ; `gap: 3px` identique | 1 règle active, 1 commentée | Partiellement redondant | Intégrer (périmètre éditeur, reporté) |
| `.mode-switch a` | Redéclare `border`, `border-radius`, `font` et `padding` avec des **valeurs identiques** ; `color` commenté | Règle de base définie deux fois à l'identique | **Redondant** | **Supprimer — fait (G2)** |
| `.explore-feature__actions > a` | Valeurs identiques à `globals.css` hors `color` commenté | Même sélecteur | Redondant, ne cible aucun enfant `a` direct dans le balisage actuel | Supprimer — **reporté** (G3) |
| `.discussion-message__content` | Bulle de message (fond, rayon, `padding`) | `min-width` seul, et `margin-left: 0` en `@media` | **Effet réel ; neutralise la règle mobile `margin-left: 0`** | Isoler ; validation mobile requise |

## 3. Groupes étudiés

| Groupe | Critères (redondance démontrée, faible risque, validation observable, hors Sprint 20.3) | Décision |
|---|---|---|
| G1 — Blocs expérimentaux vides | Oui / oui / oui / oui | **Reporté** : contrainte Git sur les fins de ligne (§4) |
| G2 — Base `.mode-switch a` | Oui / oui / oui / oui (le CSS ne touche aucun fichier du Sprint 20.3) | **Consolidé** |
| G3 — `.explore-feature__actions > a` | Oui / oui / **non** : aucun élément ciblé à observer / **non** : zone de `CourseOverflowMenu`, modifié par le Sprint 20.3 | **Reporté** |

## 4. Interventions et justifications

### G2 — `.mode-switch a` (consolidé)

Cible : liens de [CourseContextNavigation](../../components/course/CourseContextNavigation.tsx) (`nav.mode-switch > a`), rendus par [CourseWorkspace](../../components/course/CourseWorkspace.tsx) sur les pages de parcours, de leçon, de classroom et de discussion.

État initial, trois définitions de la même base :

1. `globals.css` L562 `.mode-switch a { padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); font: var(--font-label); }`, au premier niveau ;
2. `globals.css` L570 `.mode-switch a:hover { color: var(--violet); border-color: var(--violet); }` ;
3. `globals.css` L732 et L740 : **copies identiques** de 1, puis `:hover, [aria-current="page"]` avec les mêmes `color` et `border-color`, plus `background` ;
4. `custom-styles.css` : `.mode-switch a`, mêmes valeurs pour `border`, `border-radius`, `font` et `padding`.

Suppressions :

- `globals.css` L562 à L573 (base et `:hover` de la première copie). **Preuve** : même contexte (premier niveau), même sélecteur, donc même spécificité. Les règles L732 et L740, déclarées plus loin, redéclarent chaque propriété avec la même valeur. Toute règle intermédiaire de spécificité inférieure ou égale est déjà écrasée par L732/L740 ; toute règle plus spécifique écrasait aussi L562/L570. Les déclarations supprimées n'étaient donc jamais la valeur gagnante.
- `custom-styles.css`, bloc `/* Bug color boutons */ .mode-switch a`. **Preuve** : ses valeurs sont identiques à L732. Sa suppression ne change le résultat que si une règle de spécificité (0,1,1), déclarée après L732, cible ces liens et déclare `padding`, `border*`, `font*`, `line-height` ou `color`. Le recensement de ces règles en trouve 29, toutes de forme `.X a`. Aucune classe `X` n'est un ancêtre de `nav.mode-switch` : les ancêtres sont `.course-context-navigation`, `.course-context`, `.course-workspace*` et les layouts sans classe. `course-overview-actions` appartient à la branche `overview` de `CourseContextNavigation`, sans `.mode-switch`. `library.css` ne déclare que `.lib-context a { color }` (autre ancêtre, propriété absente du bloc supprimé). Le lien de `primaryLearningAction` (`<Button href>`, donc `a.button`) est piloté par `.mode-switch__primary .button` (0,2,0), qui l'emporte dans les deux états.

Conservés : la base unique L732 (désormais L719), la règle commune `:hover` / `[aria-current="page"]`, les trois variantes responsive (`max-width: 600px` ×2, `max-width: 700px`), `.course-context-navigation .mode-switch a` et tous les états `:focus-visible`. Aucun `!important` n'est concerné.

### G1 — Blocs vides (reporté)

Les blocs vides n'ont aucun effet de cascade, mais leurs commentaires contiennent les deux seuls retours chariot isolés (`\r`) du fichier. Avec `core.autocrlf=true`, ces octets font traiter `custom-styles.css` comme non textuel (`git ls-files --eol` : `i/-text w/crlf`). Les supprimer rend le fichier purement CRLF : Git le normaliserait alors en LF au prochain `git add`, et le diff deviendrait une réécriture complète (221 lignes modifiées au lieu de 17 suppressions de contenu, constaté puis annulé pendant le sprint). Une normalisation des fins de ligne sort du périmètre. Ce groupe est donc reporté à un ticket dédié.

### G3 — `.explore-feature__actions > a` (reporté)

La règle expérimentale est identique à `globals.css` L8826, hors `color` commenté. Les enfants directs de `.explore-feature__actions` dans [ExploreCatalog](../../components/course/ExploreCatalog.tsx) sont toutefois un `div.explore-feature__primary-action` et `CourseOverflowMenu` (racine `div`). Aucun lien direct n'est ciblé, ce qui rend la validation observable impossible. De plus, `CourseOverflowMenu` vit dans [OwnerCourseMenu.tsx](../../components/course/OwnerCourseMenu.tsx), modifié par le Sprint 20.3, dont la recette clavier est en cours. Une absence d'usage textuel ne suffit pas à conclure que les deux règles sont mortes.

## 5. Effets attendus et risques

- **Effet attendu :** aucun changement de rendu. Une seule source pour la base des liens du sélecteur de mode de parcours, et une dépendance de moins de `globals.css` envers le fichier expérimental.
- **Risque résiduel faible :** un élément dynamique non recensé (classe construite à l'exécution) placé en ancêtre de `.mode-switch` avec une règle `.X a` de même spécificité. Aucune construction de classe de ce type n'a été trouvée.
- **Risque d'ordre CSS en production :** couvert. Le CSS du build ne contient plus qu'une règle de base `.mode-switch a`, suivie des trois variantes responsive et de la règle commune `:hover` / `aria-current`.
- **État `:hover` :** non observable en headless. Il est couvert par la preuve de cascade et, pour `color` et `border-color`, par la règle commune observée sur `[aria-current="page"]`.

## 6. Fichiers modifiés

| Fichier | Changement |
|---|---|
| [styles/globals.css](../../styles/globals.css) | −13 lignes (copie antérieure de `.mode-switch a` et de son `:hover`) |
| [styles/experiments/custom-styles.css](../../styles/experiments/custom-styles.css) | −9 lignes (bloc `.mode-switch a` redondant) ; octets et fins de ligne du reste préservés |
| [tests/css-cascade-consolidation.test.ts](../../tests/css-cascade-consolidation.test.ts) | Nouveau, 2 tests |
| `docs/audits/sprint-20-4-css-cascade-consolidation.md` | Ce document |

Non modifiés : tokens, thèmes, `Button`/`IconButton`, composants TSX (y compris ceux du Sprint 20.3), configuration.

## 7. Tests et validations

| Contrôle | Résultat |
|---|---|
| Test ciblé sur l'état **avant** (snapshot hors dépôt) | Échoue, comme attendu : il détecte la duplication |
| `npm test` | 526/526 (exécuté le 2026-10-31 à 17:19) |
| `npm run typecheck` | Code 0 |
| `npm run lint` | 0 erreur, 4 avertissements `no-img-element` préexistants |
| `npm run build` | Code 0 (17:21 à 17:22) ; aucun `next dev` actif, pas de `.next/lock` |
| `git diff --check` | Code 0 |
| Comparaison des styles calculés avant/après | 0 différence (détail ci-dessous) |

**Comparaison visuelle automatisée (avant/après) :**

- **Méthode :** Edge headless (`--dump-dom`), fichier HTML statique hors dépôt reproduisant `section.course-workspace > header.course-context > div.course-context-navigation > nav.mode-switch` avec un lien actif `aria-current="page"`, un lien simple, `EnrollButton` et `mode-switch__primary > a.button` (modes view et edit), ainsi que les éléments `.sidebar-nav` et `.button-primary`. Les styles sont chargés via des copies réelles de `globals.css` et `custom-styles.css`, avant et après.
- **Matrice :** thèmes `light` et `dark` × largeurs 1440 px et 390 px. Pour chacun des 9 éléments, toutes les propriétés de `getComputedStyle` sont relevées, ainsi que la boîte englobante.
- **Résultat :** 4 716 valeurs comparées par configuration, **0 différence**. Valeurs témoins : `padding` 6px/10px, `border` 1px solid, `font-size` 13px, couleur active `rgb(124, 58, 237)` en clair et `rgb(139, 92, 246)` en sombre, `min-height: 40px` à 390 px.
- **Contrôle négatif :** un `padding` modifié d'un pixel dans la règle conservée produit 42 différences. Le comparateur est donc sensible, et la règle conservée est bien la source effective.
- **Limites :** il s'agit d'une fixture et non de l'application authentifiée. Les états `:hover` et `:focus-visible` ne sont pas comparés. Aucune capture des pages réelles n'a été réalisée ; une vérification sur les pages de parcours reste recommandée.

## 8. Éléments reportés

| Élément | Raison | Prérequis |
|---|---|---|
| G1 — blocs vides `.sidebar-nav` et `.button-primary` | Normalisation des fins de ligne du fichier entier | Ticket dédié aux fins de ligne (`.gitattributes` ou normalisation explicite et isolée) |
| G3 — `.explore-feature__actions > a` (expérimental et `globals.css`) | Aucun élément ciblé ; zone du Sprint 20.3 | Fin de la recette 20.3, puis vérification navigateur sur Explorer |
| `.discussion-message__content` neutralisant `margin-left: 0` en mobile | Effet réel, interaction avec une variante responsive | Vérification mobile de la discussion (composant touché par 20.3) |
| `.course-workspace .workspace-columns` expérimental | Collision probable avec les grilles responsive | Validation navigateur de l'éditeur |
| Intégration des overrides éditeur (`outline-module`, `cockpit-*`) | Zone éditeur et cockpit (Sprint 20.3) | Après la recette 20.3 |
| `.lucide-list-tree { display: none }` | Masque un symptôme | Diagnostic de l'icône dans `WorkspacePanels` |
| 214 couples de sélecteurs redéfinis et 13 `/* TEST */` dans `globals.css` | Hors lot minimal | Lots successifs de 2 à 3 groupes avec la même méthode de preuve |

## 9. État Git

- **Initial :** `main` @ `2899d94`, arbre propre.
- **Final, non committé :** `M styles/globals.css`, `M styles/experiments/custom-styles.css`, `?? tests/css-cascade-consolidation.test.ts`, `?? docs/audits/sprint-20-4-css-cascade-consolidation.md`. Aucun fichier du Sprint 20.3 n'est modifié. Aucun commit, push ni déploiement.
