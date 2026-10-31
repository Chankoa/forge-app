# Sprint 20.1 — Fiabilité des tokens CSS

Date : 2026-10-30. Périmètre : contrat des custom properties CSS actives, sans modification volontaire de palette, de composants React ou de comportements Forge.

## État initial et chargement

`app/layout.tsx` charge `styles/globals.css`, qui importe `tokens.css`, `themes.css` et `forge-course-plan.css`. La route Bibliothèque charge en plus `library.css`; `styles/experiments/custom-styles.css` est aussi actif après les styles globaux. `app/globals.css` et `app/page.module.css` sont des résidus du scaffold sans import actif : leurs variables ne font pas partie du contrat runtime.

Le HEAD initial est `58cac76` (`docs(design-system): audit UI architecture and define roadmap`), après le commit Sprint 18 `3a9c4be` et la consolidation Sprint 19. L'arbre était propre avant cette intervention.

## Inventaire et classification

| Classe | Token | Usages actifs | Diagnostic | Correction |
| --- | --- | --- | --- | --- |
| A — global manquant | `--space-5` | marges des propositions Forge et ressources | aucune définition ni fallback ; les déclarations consommatrices deviennent invalides | ajout de `20px` dans l’échelle existante 16/24px |
| B — alias sémantique | `--text` | Bibliothèque, studios de couverture et d’image | couleur attendue sans résolution | alias `--text-primary` dans les deux thèmes |
| B — alias sémantique | `--accent` | Discussion | indicateur actif et contexte sans résolution | alias `--violet` dans les deux thèmes |
| B — alias sémantique | `--surface-muted` | cover, compte, partage | hover/focus de partage sans fallback ; autres usages avec fallback | alias `--surface-soft` dans les deux thèmes |
| A — global manquant | `--shadow-md` | popover de partage | `box-shadow` invalide sans valeur | ombre moyenne documentée par thème, dérivée de l’ombre de toast existante |
| E — faux positif / externe | `--danger`, `--button-primary-text`, `--bg` | zones destructives et studios | tous les usages ont un fallback ou sont derrière un token résolu | conservés, sans globalisation |
| E — CSS non actif | `--font-geist-sans`, `--font-geist-mono`, `--foreground` | `app/page.module.css` / `app/globals.css` | fichiers de scaffold sans import actif | conservés hors contrat runtime |
| C — contextuel | `--progress`, `--ring-size` | `.progress-ring` | déclarés dans leur composant CSS avant usage | conservés locaux |

Les tokens de thème restent définis une fois pour clair (`:root`, `[data-theme="light"]`) et une fois pour sombre (`[data-theme="dark"]`). Les aliases ajoutés suivent cette même cascade : aucune variable contextuelle n’a été déplacée dans `:root`.

## Corrections réalisées

- `styles/tokens.css` : ajout de `--space-5: 20px`.
- `styles/themes.css` : ajout de `--surface-muted`, `--text`, `--accent` et `--shadow-md` dans les deux thèmes.
- `tests/css-token-reliability.test.ts` : contrôle réutilisable des références sans fallback dans les feuilles actives et de la présence des aliases dans clair/sombre.

Aucun fallback existant, sélecteur, valeur calculée, composant React, permission, sauvegarde ou flux Forge n’a été modifié.

## Risques résiduels et vérification visuelle

Le contrôle est statique : il valide la présence des variables, pas le style calculé ni le contraste rendu. Une recette navigateur claire/sombre reste à effectuer pour le popover de partage, les actions de discussion, les studios d’image/couverture et les espacements de propositions Forge. Elle n’a pas été exécutée dans ce sprint.

Les couleurs `danger` restent en fallback local, conformément au périmètre ; leur tokenisation et une échelle complète d’ombres sont reportées à un sprint Design System ultérieur.

## Validations exécutées

- Test statique ciblé : `tests/css-token-reliability.test.ts`, 2/2 réussis.
- `npm test` : 513/513 réussis.
- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm run build` : réussi (Next.js 16.3.6, code de sortie 0).
- `git diff --check` : réussi.

Les validations ont été exécutées séquentiellement. Aucun processus `next dev` ni verrou de développement n'était présent avant le build. La vérification visuelle navigateur, en clair comme en sombre, n'a pas été exécutée dans ce sprint et reste à effectuer séparément.
