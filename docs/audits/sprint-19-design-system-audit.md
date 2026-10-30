# Sprint 19 - Audit Design System et architecture UI Forge

Date : 2026-10-30. Nature : audit statique du workspace, incluant ses modifications preexistantes non commitees. Aucun code produit modifie.

Documents associes : [inventaire des composants](./sprint-19-component-inventory.md) et [roadmap proposee](./sprint-19-ds-roadmap.md).

## 1. Synthese executive

Forge possede deja un langage visuel et des compositions reutilisees : surfaces semantiques clair/sombre, echelle d'espacement, boutons, identite des cours, progression, shell commun, rails adaptatifs et rendu de lecon partage. Il faut consolider ce socle, pas reconstruire les interfaces.

Le principal risque est la distance entre ce socle et ses usages : grande cascade globale accumulative, vocabulaire de tokens incomplet, controles de meme apparence mais de contrats differents et documentation historique partiellement decalee. La reutilisation React est plus avancee pour les composants metier que pour certaines primitives interactives.

**Correction du contexte initial :** Sass est installe, mais l'UI suivie dans Git utilise actuellement du **CSS**, pas des feuilles SCSS/Sass. Aucun fichier `.scss` ou `.sass` suivi n'a ete trouve. Le fichier experimental reel est [custom-styles.css](../../styles/experiments/custom-styles.css), pas `custom-styles.scss`. Ne pas concevoir une migration en supposant une architecture Sass deja presente.

Decision recommandee :

- **P0** : contrat de tokens effectif, comportements clavier bloquants et fiabilite de la primitive bouton ;
- **P1** : gouvernance de la cascade, themes, feedbacks, overlays et layout ;
- **P2** : convergence progressive des compositions Teacher/Learner et galerie de reference.

P0 signifie ici "a traiter avant de generaliser les primitives", pas incident de production ou faille de securite. Toutes les corrections restent **proposees**.

## 2. Perimetre, methode et preuves

Inventaire des fichiers suivis, lecture des imports de toutes les pages/layouts et des primitives, lectures ciblees des principaux composants metier et des sections CSS correspondantes. Comptages lexicaux reproductibles a partir du contenu local ; ils ne constituent ni un graphe de bundle ni un audit de CSS calcule.

| Surface inventoriee | Etat constate |
|---|---|
| React | 72 fichiers TSX sous [components](../../components), 19 pages et 2 layouts sous [app](../../app) |
| Organisation | `authoring` 6, `course` 31, `forge` 16, `learning` 3, `library` 1, `profile` 3, `settings` 2, `shell` 3, `ui` 6, `workspace` 1 |
| Feuilles suivies | 8 CSS, dont 6 reliees aux imports actifs ; aucun SCSS/Sass suivi |
| Feuille principale | [styles/globals.css](../../styles/globals.css) : 265 214 octets, environ 13 200 lignes, 33 declarations `!important` hors commentaires |
| Fondations actives | 39 noms de proprietes personnalisees dans tokens/themes ; 2 variables locales de progression dans globals |
| Dependances | Next 16.3.6 declare, React 19.2.8, Sass ^1.104.0, Lucide ; ni Tailwind ni Storybook declares dans [package.json](../../package.json) |

Les comptages d'imports ci-dessous concernent les imports statiques directs dans les sources suivies, hors importateur lui-meme ; pas le nombre de rendus. Les deux CSS sans import retrouve sont [app/globals.css](../../app/globals.css) et [app/page.module.css](../../app/page.module.css) : residus probables du scaffold, **pas** deux themes actifs concurrents.

Les guides CSS et Sass fournis par la version locale de Next ont ete lus avant les recommandations : [guide CSS](../../node_modules/next/dist/docs/01-app/01-getting-started/11-css.md), [guide Sass](../../node_modules/next/dist/docs/01-app/02-guides/sass.md). Ils documentent CSS Modules et Sass sans configuration speciale obligatoire ; le guide CSS avertit aussi que les feuilles globales peuvent rester chargees lors des navigations. Ces liens locaux dependent de la presence de `node_modules`.

Pas de navigation, de lecture de session, d'acces Supabase, d'appel provider, de test ni de build. La recette Sprint 18 reste independante.

## 3. Architecture reelle et dependances

### Chargement des styles

```text
RootLayout
  -> styles/globals.css
       -> tokens.css
       -> themes.css
       -> forge-course-plan.css
  -> styles/experiments/custom-styles.css (importe apres globals)
  -> ToastProvider -> toutes les routes

/app/layout -> AppShell -> ContextualTopbarSearchProvider -> contenu
/app/library/page -> styles/library.css (global, prefixe lib-)
```

Sources : [layout racine](../../app/layout.tsx), [layout authentifie](../../app/app/layout.tsx), [page Bibliotheque](../../app/app/library/page.tsx).

Les composants sont lies aux styles surtout par des chaines `className`, non par des imports locaux. Changer une classe ou deplacer une regle globale peut affecter plusieurs domaines sans dependance TypeScript visible.

### Composition et frontieres

[CourseWorkspace](../../components/course/CourseWorkspace.tsx) assemble identite, navigation contextuelle, providers de plan/proposition, [WorkspacePanels](../../components/course/WorkspacePanels.tsx), Structure et Forge. Il couvre `view`, `learn`, `preview`, `edit`, `publication`, `classroom`, `discussion`. Les differences de role sont pilotees par les capabilities et par le contenu injecte, pas par deux applications Teacher/Learner separees.

La [route lecon](../../app/app/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx) choisit [LessonEditor](../../components/authoring/LessonEditor.tsx) ou [LearnerLesson](../../components/learning/LearnerLesson.tsx). Le premier est interactif ; le second compose le rendu, les ressources et la navigation. [LessonMarkdown/LessonContent](../../components/learning/LessonContent.tsx) sert aussi aux apercus de propositions : bon exemple de mutualisation existante a proteger.

[CoursePresentation](../../components/course/CoursePresentation.tsx) centralise deja identite media, relations, faits, statuts et progression. [CourseLibrary](../../components/course/CourseLibrary.tsx), [ExploreCatalog](../../components/course/ExploreCatalog.tsx) et [WorkspaceDashboard](../../components/workspace/WorkspaceDashboard.tsx) en reutilisent des parties sans imposer un gabarit unique.

### Conventions observees

- Alias `@/` pour les imports interdomaines ; imports relatifs entre voisins.
- Composants exportes nommes, fichiers PascalCase, frontieres `"use client"` sur les interactions ; server components pour plusieurs compositions/routes.
- Classes proches de BEM : `lesson-editor__actions`, `course-status--published` ; exceptions `is-active`, `data-*`, `lib-*` et classes globales generiques `form`, `caption`, `actions`.
- Variantes soit typees (`Button.variant`, `ProfileAvatar.size`), soit booleennes (`Badge.success`, `compact`, `preview`), soit construites depuis le domaine (`course-status--${status}`).
- Composition via `children`, `content`, `action`, `menu`, `structure`, `forge`. Ce modele est a conserver plutot qu'un composant universel rempli de drapeaux.
- Aucun composant TSX trouve sous [elements](../../elements) ; ne pas en faire artificiellement une deuxieme bibliotheque UI.

## 4. Tokens, styles et cascade

### Fondations presentes et ecarts

| Famille | Source et usage reel | Ecarts / direction |
|---|---|---|
| Couleurs | [themes.css](../../styles/themes.css) : background, surface, soft, ai, control, textes, border, violet, pink, success, shell | Noms semantiques utiles mais meles a des noms chromatiques ; danger, warning et info non centralises |
| Typographie | [tokens.css](../../styles/tokens.css) : 6 shorthands page/object/section/body/label/caption, system sans | Nombreuses tailles et graisses locales ; pas de famille Inter chargee dans le layout ; monospace ecrit localement |
| Espacement | 4, 8, 12, 16, 24, 32, 40, 48, 64 px ; usages effectifs dans controles/rails | 6, 10, 14, 18 px et valeurs `rem` locales ; pas toutes illegitimes : distinguer exceptions optiques et duplication |
| Rayons | xs/sm/md/lg/xl : 4/6/8/12/16 px | 10px et 999px locaux ; `--radius-xl` non consomme dans les six CSS actifs examines |
| Ombres | Valeurs locales, par exemple dialog `0 24px 70px ...`, toast `0 8px 26px ...` | Pas d'echelle definie ; `--shadow-md` pourtant consomme sans definition |
| Bordures/focus | `--border`, outline violet global 3px avec offset 3px | Epaisseurs et alpha de focus locaux ; des controles remplacent l'outline par un focus de conteneur |
| Responsive | Media queries dispersees ; seuil JS/CSS des panneaux a 1279px | Seuils max-width distincts : 480, 600, 640, 700, 767, 768, 900, 1099, 1100, 1150, 1250, 1279px ; aucun contrat central de breakpoints |
| Superposition | z-index locaux : 1, 2, 4, 5, 10, 11, 19, 20, 21, 30, 39, 40, 41, 100, 12000, 13000 | Pas de registre ; les dialogs natifs ouverts par showModal utilisent la top layer, pas une simple course aux z-index |

Les declarations CSS contiennent aussi des couleurs en dur : 51 occurrences hexadecimales dans globals (comptage lexical incluant commentaires), notamment rouge d'erreur et couleurs de statut. Le nombre seul n'est pas un defaut : images de couverture decoratives et contraste doivent etre distingues des couleurs d'interface.

### Tokens non resolus : preuves precises

Recherche des definitions dans les CSS actifs, puis recherche complementaire dans les sources TS/TSX pour les noms concernes :

| Nom consomme | Exemple reel | Effet demontre par le code |
|---|---|---|
| `--space-5` | globals L2755, L2779, L13152 : marges de proposition/ajustement/analyse | Pas de definition ni fallback ; declaration invalide a la resolution |
| `--text` | [library.css](../../styles/library.css) L7/L13/L17/L36 ; globals L10155, L10325, L13225 | 13 usages dans les CSS actifs ; valeur de couleur attendue non resolue, pas preuve de texte invisible |
| `--accent` | globals L12694, L12715, L12716, L12757, L12785 : Discussion | Indicateur actif et couleurs de contexte declares sans valeur resolue |
| `--shadow-md` | globals L12194 : partage de cours | Ombre attendue non resolue |
| `--surface-muted` | globals L12222 : hover/focus du partage | Cet usage n'a pas de fallback ; trois autres en ont |
| `--danger` | globals L12231 et [library.css](../../styles/library.css) L37 | Huit usages avec fallback, dont `#b42318` ; rendu possible mais pas de couleur danger adaptee par theme |
| `--button-primary-text` | globals L11839 | Fallback `#fff` : pas un token resolu, pas une declaration cassee |
| `--bg` | globals L13225 | Fallback secondaire de `--surface`, actuellement defini ; pas un defaut visible demontre |

Ne pas ajouter tous ces alias aveuglement. Trancher entre remplacement par token existant et alias de compatibilite documente ; definir une valeur fonctionnelle pour l'espacement manquant.

### Cascade et overrides

Les commentaires de [globals](../../styles/globals.css) retracent des couches F5, F5.2, F5.3, F8, F9, DS 1.2, UJ04/UJ12 puis medias/discussion. Le risque vient du cumul, pas de l'existence des adaptations.

Exemple : `.personal-course-row` apparait 19 fois comme texte de selecteur isole (medias inclus), `.workspace-columns` 6 fois. Une grille a quatre colonnes (L10743) est suivie d'une grille a six colonnes (L11248). Ce n'est pas la preuve de 19 regles supprimables : les contextes media et etats doivent etre conserves.

Les selecteurs `.course-workspace--edit .workspace-content` et `.workspace-columns[data-structure="collapsed"] .outline-rail .rail-title span` couplent la presentation a l'arbre DOM. Extraction sans inventaire des descendants = risque de regression silencieuse.

Les 33 `!important` ne sont pas tous de meme nature : protection reduced-motion (L1391), utilitaire sr-only (L2852), calibrage d'editeur et overrides visuels (`.structure-delete`, L9641). Interdire les nouvelles escalades non justifiees, pas supprimer les protections en bloc.

### Role du fichier experimental

[custom-styles.css](../../styles/experiments/custom-styles.css) est **actif sur toutes les routes**, importe en dernier par le layout racine, sans drapeau experimental.

Regles concretes :

- `.course-workspace .workspace-columns` impose `320px minmax(0,1fr) minmax(320px,340px)` et un padding ;
- `.lucide-list-tree { display: none; }` cible globalement une classe generee par la bibliotheque d'icones ;
- `.outline-module summary`, `.mode-switch a`, `.discussion-message__content` modifient de vrais composants ;
- `.sidebar-nav` et `.button-primary` sont des blocs vides, pas les contrats des primitives actuelles.

Le grid global tardif peut concurrencer les regles d'etat de meme specificite ; le rendu des rails replies exige confirmation navigateur. Ne pas enlever le fichier en bloc : chaque regle doit etre acceptee, relocalisee ou abandonnee avec preuve visuelle.

### Sass : situation et recommandation

Aucune variable `$...`, map, mixin, fonction ou partial Sass actif n'a ete identifie. Les trois `@import` de globals sont des imports **CSS**, pas une preuve d'usage du `@import` Sass deprecie. [next.config.ts](../../next.config.ts) ne configure pas Sass.

Conserver d'abord les proprietes CSS pour les themes runtime. Si Sass apporte un gain a un lot futur : modules `@use`/`@forward`, mixins sans effets de bord, map de breakpoints avec emission JS geree explicitement ou constantes partagees documentees. Ne pas dupliquer toute l'echelle CSS dans des variables Sass, ni emettre les memes styles globaux depuis chaque module.

## 5. Tableau des constats et risques

IDs repris dans l'inventaire et la roadmap. **D** = demontre dans les sources ; **V** = effet visuel/interactif a confirmer.

| ID | Priorite | Constat et preuve | Risque | Action proposee |
|---|---|---|---|---|
| F01 | P0 | D : tokens non resolus, tableau ci-dessus | Espacements/couleurs/focus differents du contrat attendu | T01 |
| F02 | P1 | D : globals accumulatif ; D : overrides experimentaux globaux ; V : etats replies | Regression par ordre/specifite et dependance au DOM | T04/T05 |
| F03 | P0 | D : [Button](../../components/ui/Button.tsx) accepte des attributs bouton pour `href` mais ne transmet que href/className/children au Link ; spread bouton peut remplacer la classe calculee | Contrat public trompeur, perte future d'aria/events ; classe reelle perdue sur [CourseCoverManager](../../components/course/CourseCoverManager.tsx) L59 | T02 |
| F04 | P0 | D : [CourseEditor](../../components/authoring/CourseEditor.tsx) exclut les tabs inactifs du Tab sans gestion fleches ; [LessonEditor](../../components/authoring/LessonEditor.tsx) gere les fleches mais sans tabpanel/aria-controls associes | Sections du cockpit non atteignables par tabulation ordinaire ; modeles ARIA incomplets | T03 |
| F05 | P1 | D : [LibraryView](../../components/library/LibraryView.tsx) et [DiscussionFilter](../../components/course/CourseDiscussion.tsx) emploient tablist pour filtrer sans contrat clavier/panneaux ; CourseLibrary utilise deja un groupe aria-pressed | Semantique et comportement divergents pour une meme interaction | T03/T08 |
| F06 | P1 | D : [CourseOverflowMenu](../../components/course/OwnerCourseMenu.tsx) declare menu/menuitem, gere Escape mais ni focus initial ni fleches | Contrat menu incomplet ; scenario clavier a confirmer | T07 |
| F07 | P1 | D : dialogs natifs repetes, overlay media et rails implementent chacun leur focus ; selecteur de focus du rail n'inclut pas select | Elements oublies par les listes manuelles, couches imbriquees fragiles | T09 |
| F08 | P1 | D : [ThemeToggle](../../components/ui/ThemeToggle.tsx) ne resout pas la preference systeme via matchMedia ; [ThemePreferenceForm](../../components/settings/ThemePreferenceForm.tsx) la resout lors du choix seulement | "Systeme" peut ne pas suivre l'OS au chargement/changement ; flash a mesurer | T06 |
| F09 | P1 | D : erreur rouge fixe, absence d'echelle danger ; calculs de contraste ci-dessous | Lisibilite sombre et etats actifs a confirmer sur rendu | T01/T06 |
| F10 | P1 | D : pas de regle globale `.button:disabled` ; exceptions Forge, structure et compte ; retour null initial dans LessonResourcesPanel | Feedback desactivations/chargement inegal ; doubles annonces possibles | T08 |
| F11 | P2 | D : Badge success, PublicationStatus, PersonalCourseStatus, lib-pill et cockpit-status coexistent ; CourseMeta/CourseFacts proches | Libelles/couleurs divergent ; unification trop large effacerait les differences metier | T11 |
| F12 | P1 | D : breakpoints repartis JS/CSS et experiment non conditionne | Densite/rails/actions mobiles fragiles ; pas de debordement affirme sans mesure | T10 |
| F13 | P1 | D : [DS 1.1](../design/design-system-1.1.md) cite tokens.scss/themes.scss et surface-body/accent-primary absents de l'implementation active | Reference documentaire trompeuse pour les prochains travaux | T04/T12 |

## 6. Coherence UX et accessibilite

### Forces a preserver

- `lang="fr"`, nombreux labels englobants ou explicites, boutons natifs, noms accessibles sur actions icones.
- [ContextualTopbarSearch](../../components/shell/ContextualTopbarSearch.tsx) et Bibliotheque ont des recherches nommees. L'outline supprime de la recherche topbar est compense par `:focus-within` (globals L11616), pas une absence de focus demontree.
- Focus-visible violet global ; reduced-motion global ; progression `<progress>` nommee ; images d'identite decoratives et textes d'auteur separes.
- [WorkspacePanels](../../components/course/WorkspacePanels.tsx) : Escape, retour du focus, scroll lock, contenu central inert, cycle Tab. [PdfViewer](../../components/forge/PdfViewer.tsx) : dialog natif nomme, iframe avec titre, statut de chargement/erreur.
- [ForgeRail](../../components/forge/ForgeRail.tsx) implemente fleches/Home/End, tabIndex et panneau nomme. Conserver cet exemple sans l'eriger en preuve de conformite.
- Flux Forge du Sprint 18 : statut du brouillon, proposition obsolete, application explicite. Ce sont des etats metier, pas de simples variantes de couleur.

### Points precis a confirmer

Le cockpit a un defaut clavier visible dans le code (F04). Les tabs de filtre et menus ont un contrat ARIA incomplet (F05/F06). Le focus trap du rail liste boutons, liens, inputs, textarea, summary et tabindex=0, mais pas `select` : le select de niveau de ContentIntelligence existe dans ce rail ; les interactions aux bornes doivent etre testees avant de choisir une extraction.

Pas de composant Field partage. Les messages sont relies aux champs dans [AccountSecuritySettings](../../components/settings/AccountSecuritySettings.tsx), mais l'association erreur/champ et aria-invalid n'est pas uniforme ; [CoursePlanReview](../../components/forge/CoursePlanReview.tsx) utilise deja aria-invalid. Ne pas declarer tous les formulaires sans label.

La Bibliotheque media utilise une liste ; Mes parcours utilise des roles table/row/cell et masque/reorganise des colonnes en responsive. Tester les en-tetes annonces apres changement de largeur. Classroom utilise listes/dl/progress : ne pas imposer un DataTable par analogie visuelle.

Les actions Discussion sont a `opacity: 0`, redeviennent visibles au hover/focus-within. Elles ne sont pas retirees du clavier ; leur decouvrabilite tactile reste a observer. Les notifications s'effacent apres 4 secondes : mesurer si les confirmations essentielles restent comprensibles sans elles.

Calculs statiques sRGB sur paires opaques, **sans styles calcules navigateur** :

| Paire envisagee depuis les declarations | Ratio approx. | Interpretation limitee |
|---|---|---|
| `.form-error` #b91c1c sur surface sombre #161a23 | 2,69:1 | Risque de contraste du petit texte ; surface reelle a verifier |
| Texte blanc des boutons sur violet sombre #8b5cf6 | 4,23:1 | Sous 4,5:1 pour petit texte normal ; confirmer variantes effectives |
| Texte muted clair #64748b sur blanc | 4,76:1 | Ne predit pas le contraste sur toutes les surfaces soft |
| Texte muted sombre #9aa5b7 sur #161a23 | 7,00:1 | Paire favorable, pas preuve globale |

Aucune conformite WCAG annoncee. Restent a verifier : zoom 200/400 %, reflow 320px, cibles tactiles, focus non masque par sticky, lecteur d'ecran, clavier complet, contraste des etats et dialogues imbriques.

## 7. Architecture cible recommandee, non implementee

1. **Fondations** : proprietes CSS semantiques runtime, themes symetriques, echelles partagees de typographie/espacement/rayon/ombre/couche. Garder les noms utiles existants ; aliases temporaires uniquement justifies par les consommateurs.
2. **Primitives React** : Button et lien d'action avec types explicites, IconButton, Surface, Badge de ton, Field et message de statut. Pas de permissions, requetes ou serveur dans ces primitives.
3. **Composites interactifs** : tabs de panneau, groupe de filtres, dialog/confirmation, popover/disclosure, empty state et feedback. Distinguer comportement et presentation, sans moteur abstrait universel.
4. **Layouts** : AppShell, PublicShell, CourseWorkspace et WorkspacePanels restent les proprietaires du contexte et des rails ; pas de DS "Teacher" double du DS "Learner".
5. **Metier** : CoursePresentation, progression, publication, ressources et Forge conservent leurs types, capabilities et regles de fiabilite. Extraire seulement le chrome stable.

Styles futurs : garder reset/themes/primitives vraiment globaux ; extraire les blocs metier un par un en respectant l'ordre, avec CSS Modules ou modules SCSS uniquement si utiles. Pas de `@layer` generalise sans traiter les feuilles non layerisees, qui ont une precedence differente.

La frontiere serveur/client doit rester explicite : une primitive de surface n'a pas besoin de devenir cliente parce qu'un dialog l'est.

## 8. Choix de stack et documentation

| Option | Benefice | Cout / risque | Recommandation |
|---|---|---|---|
| CSS actuel + Sass au besoin | Reutilise tokens/runtime et competence existante ; aucune dependance nouvelle | Necessite discipline d'ordre et de scope ; Sass seul ne corrige ni ARIA ni les contrats React | **Retenir**, Sass facultatif par lot |
| Introduction Tailwind | Utilitaires et variantes standardises, colocation | Double grammaire pendant migration, configuration/build, reset, classes metier a reconciler ; ne resout pas menus/themes/permissions | Ne pas introduire pour cette consolidation ; eventuel essai isole ulterieur motive par mesures |

Commencer la documentation par un catalogue des contrats et etats avec fixtures locales : boutons, champs, statuts, tabs/filtres, dialog, course row/card, rails. Une galerie interne en React peut reutiliser la stack, sans appels reseau ni provider. La protection d'une route de galerie devra etre decidee avant implementation ; rien n'est cree ici.

Storybook peut devenir pertinent pour une bibliotheque stabilisee et plusieurs contributeurs ; aujourd'hui son installation ne traiterait pas les defauts prioritaires. Les maquettes [clair](../design/ds-1.1-reference-light.png), [sombre](../design/ds-1.1-reference-dark.png) et [parcours utilisateur](../design/user-journey/readme.md) existent ; leur actualite et la reference visuelle faisant autorite restent a confirmer, sans les confondre avec l'etat execute.

## 9. Validation et limites

- Constats rattaches a des imports, composants et declarations reels ; comptages sans outil installe.
- Inventaire et roadmap partagent F01-F13 et T01-T12 ; aucune recommandation presentee comme implementee.
- Tests UI existants consultes : [tabs Forge](../../tests/forge-rail-tabs.test.ts), [shell mobile Classroom](../../tests/classroom-mobile-shell.test.ts), [presentation des cours](../../tests/course-presentation.test.ts). Ils comprennent assertions de source/helpers, pas une preuve de navigation ou de rendu. Aucun test relance.
- Aucun controle de bundle, CSS coverage, styles calcules, capture d'ecran ou mesure de performance ; pas d'affirmation de CSS mort sur la seule absence de classe litterale.
- Audit d'architecture/UI, pas audit de securite ni validation des droits par execution.
- Etat initial : 9 fichiers suivis modifies et 4 non suivis, tous preexistants au Sprint 19. Empreintes SHA-256 de 460 fichiers suivis/non ignores conservees hors depot pour comparaison.
- Controle final : `git status --short`, `git diff --check`, verification des liens locaux et comparaison des empreintes. Resultat detaille dans la [roadmap](./sprint-19-ds-roadmap.md#validation-documentaire-du-sprint-19).

**Statuts :** analyse statique realisee ; recommandations proposees ; trois documents produits ; aucune implementation produit, recette navigateur, execution de tests, modification de donnees, commit, push ou deployment.
