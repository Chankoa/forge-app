# Sprint 19 - Roadmap de consolidation du Design System

Date : 2026-10-30. **Proposition uniquement** : aucun ticket ci-dessous n'est implemente par cet audit.

Sources : [constats F01-F13](./sprint-19-design-system-audit.md), [inventaire et risques](./sprint-19-component-inventory.md).

## 1. Principes et portes d'entree

- Consolider le langage visuel Forge existant, pas refaire l'esthetique.
- Une PR/ticket limite a une primitive, un comportement ou une famille CSS ; pas de ticket "refaire toute l'UI".
- Garder themes et couleurs runtime en proprietes CSS. CSS actuel compatible avec Sass/SCSS si un besoin concret apparait ; aucune introduction Tailwind necessaire.
- Conserver server/client components et capabilities au bon niveau. Le DS ne decide pas qui peut publier, editer, apprendre ou generer.
- Geler LessonEditor, ForgeRail, ContentIntelligence, les providers de proposition et la semantique stale/unsaved tant que la recette Sprint 18 n'est pas close. Les modifications de fondations qui les affecteraient visuellement demandent aussi cette porte de validation.
- Aucun besoin d'appel IA reel pour tester un bouton, un dialog ou un etat : fixtures deterministes. Les tests de droits exigent des sessions adaptees ou des tests de composants/capabilities, pas une simulation pretendue du role.

Tailles indicatives : XS <= 0,5 jour, S 0,5-1,5 jour, M 2-3 jours de travail hors recette croisee. Si un ticket depasse M, le scinder **avant** implementation. Estimations non engagements.

Priorites : P0 avant generalisation du DS ; P1 stabilisation des interactions et de la cascade ; P2 convergence/documentation de confort. P0 ne designe pas une vulnerabilite ou une urgence de deployment.

## 2. Architecture cible

| Niveau | A conserver | A faire evoluer | Ne doit pas contenir |
|---|---|---|---|
| Fondations | tokens.css/themes.css, variables runtime, outline/reduced-motion | Roles semantiques complets, contrat ombres/couches/breakpoints, aliases bornes | Donnees, permissions, logique provider |
| Primitives | Button, IconButton, Badge, Surface | Types bouton/lien explicites, classe composee, Field/InlineStatus si usage commun | Regles de publication ou sauvegarde |
| Composites | PdfViewer comme metier ; chrome des confirmations | Tabs de panneau, FilterGroup, Dialog/ConfirmDialog, disclosure/popover, feedback | Fusion sources/ressources ou orchestration IA |
| Layouts | AppShell/PublicShell, CourseWorkspace/WorkspacePanels | Contrat responsive et focus stable, styles scopes | Copies Teacher/Learner du shell |
| Metier | CoursePresentation, authoring, learning, Forge, ressources, Classroom | Reutilisation graduelle des primitives | Actions rendues generiques au prix des capabilities |

Convention proposee : conserver BEM sur le global existant ; nouveaux scopes locaux possibles en `.module.css` ou `.module.scss`. Une extraction doit emporter seulement les regles de sa famille et documenter l'ordre restant. Pas de migration d'extensions en masse, pas de double source CSS/Sass pour un meme token.

## 3. Backlog borne et tracable

### A. Fondations : tokens, conventions et styles

| Ticket | Priorite / taille | Portee et dependances | Critere d'acceptation observable | Risque / retour arriere |
|---|---|---|---|---|
| **T01 - Resoudre le contrat des tokens consommes** | P0 / M | F01/F09 ; CSS actifs uniquement ; fermeture recette S18 avant changements partages | Chaque usage --space-5/--text/--accent/--shadow-md/--surface-muted est remplace ou resolu avec intention documentee ; fallbacks danger et texte primaire audites ; controle clair/sombre de Discussion, partage, Bibliotheque et proposition ; aucun alias ajoute sans consommateur | Valeur runtime changee globalement ; separer corrections par famille, revert du lot de tokens |
| **T04 - Fixer conventions et proprietaires des overrides** | P1 / S | F02/F13 ; peut commencer sans T01 ; documentation/conventions d'abord | Regles pour imports, variantes, nomenclature, exceptions optiques, !important et ownership ecrites ; chaque regle non vide de custom-styles a un proprietaire et une decision ; reference DS 1.1 reconciliee avec les fichiers reels | Divergence doc/code ; garder les references historiques identifiees, pas reecrire leur histoire |
| **T05 - Consolider un premier bloc CSS de presentation** | P1 / M | F02 ; apres T04, avec T01 stabilise et recette S18 close pour effets globaux | Uniquement famille personal-course-row/card ; grille six colonnes et alternatives preservees ; regles desktop/media regroupees sans ajout de !important ; captures avant/apres light/dark liste/grille, pas d'ecart non accepte | Ordre de cascade ; extraction reversible en un commit futur, ne pas deplacer globals entier |
| **T06 - Unifier theme et verifier palette d'etats** | P1 / M | F08/F09 ; apres T01 ; contrat preference clair/sombre/systeme existant conserve | Un meme resolver pour toggle/preferences ; reload sur OS sombre en mode systeme, changement OS, override manuel et navigation verifies ; contrastes calcules sur styles reels pour erreur/bouton actif ; mesures consignees, pas d'affirmation WCAG globale | Hydratation et flash ; tester sans storage et preference explicite ; ne pas masquer le probleme par suppressHydrationWarning |

T01 n'exige pas de tokenizer chaque pixel. Le choix de valeur pour --space-5 et les tons danger doit etre valide visuellement, pas infere seulement du nom.

### B. Primitives UI et composants reutilisables

| Ticket | Priorite / taille | Portee et dependances | Critere d'acceptation observable | Risque / retour arriere |
|---|---|---|---|---|
| **T02 - Fiabiliser Button et IconButton** | P0 / S | F03 ; independant de T01 pour API ; attendre recette S18 si migration de ses consommateurs | Props lien/bouton distinguees sans cast permissif ; className compose ; href conserve aria/data/events/ref pertinents selon API choisie ; disabled du lien explicitement defini ou interdit par les types ; IconButton type=button par defaut ; cas CourseCoverManager couvert ; trois variantes conservees | API utilisee par 22 importateurs ; test rendu et types, migration limitee aux usages necessaires |
| **T08 - Normaliser feedback et un premier Field** | P1 / M | F05/F10 ; apres T01/T02 et decision semantique T03 ; premier consommateur compte ou bibliotheque | Contrat label/id/help/error/disabled, erreur associee au champ ; style disabled des primitives ; matrice loading/empty/error/success ; un evenement produit n'est pas annonce deux fois ; information essentielle visible apres disparition toast | Regressions annoncees aux lecteurs d'ecran ; un formulaire pilote, pas conversion de tous les formulaires |
| **T09 - Extraire le cadre de confirmation** | P1 / M | F07 ; apres T02/T07 ; commencer SourceDeleteDialog puis ResourceDeleteDialog | Cadre generique sans action Supabase ; titre accessible, Annuler initial, Escape/retour focus et fermeture pending conformes aux comportements convenus ; suppression/erreur/resource_in_use/cleanup restent dans chaque domaine ; test dialogue dans rail | Effet top layer/parent Escape ; ne pas migrer ForgeProposalDialog ou overlay media dans ce ticket |

T09 produit aussi une liste d'ecarts des overlays restants, pas leur migration automatique. Un ticket ulterieur specifique au rail/media n'est ouvert que si le test imbrique montre un besoin.

### C. Layout et navigation

| Ticket | Priorite / taille | Portee et dependances | Critere d'acceptation observable | Risque / retour arriere |
|---|---|---|---|---|
| **T03 - Distinguer onglets et filtres, corriger le cockpit** | P0 cockpit, P1 filtres / M | F04/F05 ; sans dependance fonctionnelle T01 ; S18 close avant LessonEditor | Cockpit : Tab atteint le tab actif, fleches/Home/End atteignent toutes les sections autorisees ; panneau nomme/associe ; pas de ressources pour role non autorise ; decisions FilterGroup vs Tabs ecrites pour LibraryView/Discussion ; au plus cockpit + un filtre pilote modifies | Focus et montage des formulaires ; ne pas factoriser automatiquement les tabs Forge encore en recette |
| **T07 - Completer le contrat du menu de cours** | P1 / S | F06 ; independant du theme et des cartes | Choisir disclosure de liens OU vrai menu : si menu, focus initial, fleches, Home/End et Escape/retour trigger ; si disclosure, roles correspondants ; clic exterieur, scroll/repositionnement et clavier testes ; liens disponibles strictement inchanges | Navigation/viewport ; ne pas remplacer le helper de positionnement sans preuve |
| **T10 - Stabiliser rails et seuils responsive** | P1 / M | F12/F02/F07 ; apres T04/T06, decision T07, cloture S18 ; pas besoin de refaire les cartes T05 | Contrat des seuils nomme, 1279px JS/CSS coherent ; un seul jeu gagnant de largeurs open/collapsed ; decision sur override grid experimental ; cycle Tab inclut select et retour trigger ; aucune perte des actions a 320/390/700/768/1099/1279/1280/1440px | Plus gros rayon d'impact ; lot rails seulement, pas refonte shell ni migration de tous les breakpoints |

T03 peut etre scinde en T03a (cockpit) puis T03b (filtre pilote) si la decision semantique necessite plus d'un cycle de validation. Les recommandations ne doivent pas changer une navigation de routes en onglets.

### D. Harmonisation Teacher / Learner

| Ticket | Priorite / taille | Portee et dependances | Critere d'acceptation observable | Risque / retour arriere |
|---|---|---|---|---|
| **T11 - Aligner statuts et densite de deux compositions** | P2 / M | F11 ; apres T01/T02/T05/T10 | Mapping publication/relations/progression distinct ; Badge de ton limite ; alignement Mes parcours + dashboard seulement pour premier lot ; actions Owner/Editor/Viewer/Learner inchangees ; mesures de densite et captures validees sur les deux vues | Component monolithique ; conserver slots et presentation metier locale |

Pour la suite de T11, creer un ticket distinct apres mesure pour Classroom/LearnerLesson. Lecture pedagogique et edition n'ont pas besoin de la meme densite ; partager titres/espaces/feedbacks sans fusionner completion et sauvegarde.

### E. Etats interactifs, responsive et accessibilite

| Ticket | Priorite / taille | Portee et dependances | Critere d'acceptation observable | Risque / retour arriere |
|---|---|---|---|---|
| **T12 - Publier un catalogue d'etats et une recette DS** | P2 / S pour catalogue, M si galerie | F13 + verification F04-F12 ; catalogue commencable apres T04 ; galerie apres T02/T03/T08/T09 | Tableau versions/etats et fixtures locales ; aucune requete compte/provider ; couverture boutons/champs/tabs/filtres/confirmation/row/rail en clair/sombre ; controles clavier, zoom et annonces documentes ; route/protection de galerie decidee avant code | Galerie qui devient une deuxieme UI ; reutiliser vrais composants, documenter scenarios non executables hors contexte |

Les verifications d'accessibilite ne sont pas reportees a T12 : elles sont obligatoires pour chaque ticket touche. T12 assemble les preuves, ne certifie pas WCAG.

## 4. Proposition de sprints suivants

Numerotation indicative a confirmer avec l'equipe ; aucune activation de ticket ni changement de planning Sprint 18.

| Sprint propose | Theme | Tickets / dependances | Sortie attendue |
|---|---|---|---|
| **20 - Fondations et contrats minimaux** | A/B, quick wins | T04, T02, T01 ; corrections globales apres cloture S18 | Tokens connus, API bouton fiable, conventions d'override ; pas de changement de stack |
| **21 - Controles interactifs** | B/C/E | T03, T07, T08 ; T01/T02 stables | Cockpit accessible au clavier, filtre pilote coherent, menu et feedbacks verifies |
| **22 - Cascade et cadres flottants** | A/B | T05, T06, T09 ; T04/T01/T02/T07 | Bloc CSS cours plus lisible, themes coherents, confirmation partagee sur deux usages |
| **23 - Layout et convergence mesuree** | C/D/E | T10 puis T11 ; T05/T06 et cloture S18 | Rails previsibles ; Mes parcours/dashboard harmonises sans fusion Teacher/Learner |
| **24 - Reference de composants** | E/documentation | T12, galerie seulement si utile | Catalogue de contrats/etats et recette repetable sans donnees reelles |

T06 est independant de T05/T09 et peut etre avance si les capacites le permettent. T11 depend de T10 : ne pas annoncer les deux termines avant recette du layout. Ces paquets restent negociables ; aucun sprint ne doit imposer une refonte transversale par manque de temps.

### Quick wins vs structurel

- **Quick wins** : T04 documentaire ; T02 classe/type ; T03 cockpit ; suppression d'un token non resolu particulier dans T01 apres validation. Un quick win sur les fondations n'est pas sans risque visuel.
- **Structurel borne** : T05 cascade d'une famille ; T06 source de verite theme ; T09 confirmation ; T10 etats des rails.
- **A differer** : Tailwind, Storybook, conversion totale Sass, extraction globale d'editeur, nouveau DataTable universel, replacement esthetique general.

## 5. Protocole d'acceptation commun aux futurs lots

1. Capturer l'etat initial et la reference visuelle acceptee ; distinguer maquette historique et reference actuelle.
2. Tests cibles existants et nouveaux sur le contrat touche ; plusieurs tests actuels sont des assertions de source, donc ajouter une preuve d'interaction lorsque le comportement clavier change.
3. Recette light/dark, clavier sans souris, focus-visible/disabled/pending/error ; reflow et zoom sur la famille touchee.
4. Comparer les roles Owner/Editor/Viewer et Learner/preview avec donnees de test isolees. Aucune modification du cours QA canonique requise pour le DS.
5. Verifier que les gardes metier Sprint 17/18 restent intactes : pas d'analyse a l'ouverture, pas de sauvegarde implicite, pas d'application stale, pas de nouvelles permissions.
6. Tests/types/lint/build adaptes au code touche dans les futurs sprints ; ne pas extrapoler les resultats d'une autre session.
7. Journaliser les ecarts acceptes et le perimetre de retour arriere. Une extraction supprime ses anciennes regles uniquement apres preuve equivalente.

## 6. Elements a confirmer avec navigateur ou references

| Question | Preuve a obtenir ulterieurement |
|---|---|
| Maquette faisant autorite | Choisir les references DS 1.1/UJ actuelles avec produit/design ; ne pas calquer des documents devenus historiques |
| Rails replies / fichier experimental | Styles calcules et captures open/collapsed/focus/compact aux seuils 1279/1280 et grand ecran |
| Focus des overlays imbriques | Ouvrir un dialog depuis rail et revenir au lanceur ; Tab/Shift+Tab incluant les selects, Escape ferme un seul niveau |
| Theme systeme | Reload, OS change, choix manuel, navigation ; mesurer le flash sans toucher aux tokens de session |
| Contraste | Couleurs calculees de texte/fond/bordure pour erreur, primary, disabled, selection, focus dans les deux themes |
| Tables et densite | Mes parcours liste/grille et Classroom au zoom/lecteur d'ecran ; pas de colonnes/actions perdues |
| Etats et annonces | Attendre disparition toast, simuler erreur/latence via fixtures, compter les annonces utiles |
| Permissions | Verifier visibilite/action par role ; ne pas deduire l'execution correcte de la seule presence d'un attribut disabled |

## 7. Validation documentaire du Sprint 19

### Etat de depart

`git status --short` au debut de l'audit :

- 9 fichiers suivis modifies, non indexes : [LessonEditor](../../components/authoring/LessonEditor.tsx), [LessonEmptyContent](../../components/authoring/LessonEmptyContent.tsx), [ContentIntelligence](../../components/forge/ContentIntelligence.tsx), [ForgeProposalContext](../../components/forge/ForgeProposalContext.tsx), [ForgeProposalDialog](../../components/forge/ForgeProposalDialog.tsx), [ForgeRail](../../components/forge/ForgeRail.tsx), [fiabilite Forge](../architecture/forge-ai-reliability.md), [tests ContentIntelligence](../../tests/content-intelligence.test.ts), [tests dialog](../../tests/forge-proposal-dialog.test.ts).
- 4 fichiers non suivis preexistants : [audit Sprint 18](./sprint-18-local-draft-forge-coherence.md), [recette Sprint 18](../qa/sprint-18-authenticated-browser-recipe.md), [lesson-analysis-state](../../lib/forge/lesson-analysis-state.ts), [tests associes](../../tests/lesson-analysis-state.test.ts).
- Aucun des trois documents cibles Sprint 19 n'existait. Empreintes de 460 fichiers conservees hors depot ; pas de fichier temporaire ajoute au depot.

### Controles finaux

Controles effectues apres ecriture des trois documents :

| Controle | Resultat observe |
|---|---|
| `git status --short` | Les 9 modifications suivies et les 4 fichiers non suivis initiaux restent presents ; seuls 3 nouveaux documents Sprint 19 s'ajoutent |
| Empreintes SHA-256 initial/final | 460 fichiers compares ; 0 modifie, 0 manquant parmi les fichiers preexistants |
| `git diff --cached --stat` | Vide ; aucune modification indexee |
| `git diff --check` | Code de sortie 0 ; avertissement Git de normalisation LF/CRLF sur le document de fiabilite preexistant, pas d'erreur whitespace |
| Documents non suivis | Controle supplementaire des fins de ligne : aucune ligne avec espace/tab terminal ; `git diff --no-index --check` face a NUL ne signale pas d'erreur (code 1 lie aux fichiers nouveaux) |
| Liens Markdown locaux | 174 cibles controlees, 0 chemin manquant ; references Next locales dependantes de node_modules |
| Tracabilite | Chaque F01-F13 dispose d'au moins un ticket ; T01-T12 references entre audit/inventaire/roadmap |

Les seuls ajouts attribuables a ce sprint sont :

- [sprint-19-design-system-audit.md](./sprint-19-design-system-audit.md)
- [sprint-19-component-inventory.md](./sprint-19-component-inventory.md)
- [sprint-19-ds-roadmap.md](./sprint-19-ds-roadmap.md)

Tests/typecheck/lint/build non executes : changements exclusivement documentaires, aucun test documentaire configure dans les scripts examines. Aucun navigateur, provider, Supabase, commit, push ou deployment utilise.

| Statut | Sprint 19 |
|---|---|
| Analyse | Realisee par lecture statique et inventaire |
| Propositions | Roadmap et architecture cible documentees, pas encore arbitrees |
| Implementation produit | Aucune |
| Documentation | Trois livrables uniquement |
| Tests produit / recette navigateur | Non executes dans cet audit |
| Deployment | Aucun |
