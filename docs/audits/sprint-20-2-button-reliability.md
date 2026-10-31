# Sprint 20.2 — Fiabilité de Button et IconButton

Date : 2026-10-30. Périmètre : contrat de rendu des primitives `Button` et `IconButton`, sans changement de variante ni de style volontaire.

## État initial

Le HEAD initial est `58cac76` sur `main`. Les quatre changements non commités du Sprint 20.1 (`styles/tokens.css`, `styles/themes.css`, son test et son rapport) étaient présents et ont été conservés sans modification fonctionnelle.

`Button` utilisait le même type d’attributs pour les éléments `button` et `Link` :

- sur un bouton natif, `className` était transmis après la classe interne et supprimait donc `button` et la variante ;
- avec `href`, seuls `href`, la classe interne et les enfants étaient rendus : les attributs d’ancre, `aria-*`, `data-*`, `title` et options Next Link n’étaient pas transmis ;
- un lien désactivé n’avait pas de contrat explicite.

`IconButton` avait un libellé obligatoire, mais sa classe interne pouvait être remplacée par `className` et les props étalées pouvaient remplacer son nom accessible.

Les usages avec `href` sont limités aux appels internes de démarrage/exploration ; tous les autres usages observés sont des boutons d’action. Aucune variante visuelle n’a été ajoutée : `primary`, `secondary` et `ghost` restent le contrat de `Button`.

## API finale

`Button` est une union discriminée :

- sans `href`, il rend un `<button>` et accepte les attributs natifs, dont `type` (défaut `button`), `disabled`, `aria-*`, `data-*` et `title` ;
- avec `href`, il rend `next/link`, accepte les attributs et options de navigation de Link, mais refuse `type` ;
- un lien avec `disabled` rend un `<span aria-disabled="true">` sans `href`, afin de ne laisser aucune navigation clavier ou pointeur active. Les attributs explicatifs (`aria-*`, `data-*`, `title`) restent présents ; les options de navigation, handlers de clic et la ref d’ancre sont volontairement exclus de ce rendu non interactif.

Dans les deux cas, la classe résultante est `button button--{variant}` suivie de la classe fournie. `IconButton` conserve `icon-button`, compose une éventuelle classe fournie et impose le nom accessible via son `label`; son `title` garde le label par défaut, tout en acceptant un titre plus précis.

## Corrections et tests

- `components/ui/Button.tsx` : types distincts pour bouton/lien, transmission des attributs, composition de classes et lien désactivé non navigable.
- `components/ui/IconButton.tsx` : composition de classes et protection du nom accessible fourni par `label`.
- `tests/button.test.ts` : rendu des attributs de bouton, variantes, lien, lien désactivé, attributs `aria-*` / `data-*`, et nom accessible IconButton.

Ces tests sont des tests de rendu serveur : ils prouvent la sémantique et les attributs produits, mais pas les interactions réelles dans un navigateur.

## Validations

- Test ciblé `tests/button.test.ts` : 5/5 réussis.
- `npm test` : 518/518 réussis.
- `npm run typecheck` : réussi.
- `npm run lint` : réussi, sans avertissement introduit par ce sprint.
- `npm run build` : réussi (Next.js 16.3.6, code de sortie 0).
- `git diff --check` : réussi.

Les validations ont été exécutées séquentiellement. Aucun processus `next dev` ni verrou de développement n'était présent avant le build. Aucun scénario Forge, permission, route ou sauvegarde n’est modifié.

## Risques résiduels et suivi

La recette visuelle claire/sombre et l’interaction navigateur d’un lien désactivé ne sont pas couvertes par le test de rendu et devront être indiquées séparément si elles ne sont pas exécutées. Il n’existe pas d’usage actuel de `Button` avec `href` et `disabled`, donc la nouvelle règle ne modifie aucun parcours existant. Les primitives adjacentes et les styles globaux restent hors périmètre.
