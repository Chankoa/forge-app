# Sprint 19 - Inventaire des composants et contrats UI

Date : 2026-10-30. Audit statique, sans changement applicatif. Voir [rapport](./sprint-19-design-system-audit.md) pour les constats F01-F13 et [roadmap](./sprint-19-ds-roadmap.md) pour les tickets T01-T12.

## 1. Organisation et niveau de lecture

72 fichiers TSX sous [components](../../components), repartis par domaine. L'inventaire des noms/imports couvre l'ensemble ; les contrats detailles ci-dessous reposent sur des lectures de primitives et de sections representatives, pas sur un audit ligne a ligne exhaustif de tous les handlers.

| Dossier | Fichiers TSX | Responsabilite / role |
|---|---:|---|
| [ui](../../components/ui) | 6 | Primitives, theme et notifications transverses |
| [shell](../../components/shell) | 3 | Public/authentifie, navigation et recherche contextuelle |
| [workspace](../../components/workspace) | 1 | Dashboard a relations Teacher/Learner mixtes |
| [course](../../components/course) | 31 | Compositions de cours, identite, catalogue, classroom, collaboration et gestion |
| [authoring](../../components/authoring) | 6 | Creation, metadonnees, structure, edition de lecon, publication |
| [forge](../../components/forge) | 16 | Rail, propositions, plans, generation, sources, ressources, medias |
| [learning](../../components/learning) | 3 | Lecture de lecon, rendu commun et actions d'apprentissage |
| [library](../../components/library) | 1 | Bibliotheque transversale de medias/sources/ressources |
| [profile](../../components/profile) | 3 | Identite, avatar et formulaires |
| [settings](../../components/settings) | 2 | Preference de theme et securite du compte |

[elements](../../elements) ne contient aucun composant TSX inventorie. Les fonctions de presentation et capabilities vivent dans [lib/courses](../../lib/courses) et [lib/capabilities](../../lib/capabilities), pas dans une couche de style.

## 2. Routes et composition

Le [layout racine](../../app/layout.tsx) apporte styles globaux/experimentaux et ToastProvider a toutes les pages. Le [layout /app](../../app/app/layout.tsx) ajoute AppShell apres resolution de session/profil.

| Route | Point d'entree | Composition dominante |
|---|---|---|
| `/` | [page publique](../../app/page.tsx) | PublicShell + PublicIntentExperience |
| `/login`, `/register` | [login](../../app/login/page.tsx), [register](../../app/register/page.tsx) | PublicShell, formulaires, Button |
| `/explore`, `/courses/[courseSlug]` | [explore](../../app/explore/page.tsx), [detail public](../../app/courses/[courseSlug]/page.tsx) | PublicShell + ExploreCatalog / PublicCourseDetail |
| `/app` | [accueil](../../app/app/page.tsx) | PublicIntentExperience en mode embedded + WorkspaceDashboard |
| `/app/courses`, `/app/explore` | [mes parcours](../../app/app/courses/page.tsx), [catalogue](../../app/app/explore/page.tsx) | CourseLibrary / ExploreCatalog ; recherche dans topbar |
| `/app/create` | [creation](../../app/app/create/page.tsx) | Surface + CreateCourseForm |
| `/app/courses/[courseSlug]` | [cours](../../app/app/courses/[courseSlug]/page.tsx) | CourseWorkspace ; composition selon mode/capabilities, dont CourseEditor et PublicationPanel |
| `/app/courses/[courseSlug]/lessons/[lessonSlug]` | [lecon](../../app/app/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx) | CourseWorkspace + LessonEditor / LearnerLesson ; edit/learn/preview |
| `/app/classroom` | [classroom global](../../app/app/classroom/page.tsx) | GlobalClassroomLanding |
| `/app/courses/[courseSlug]/classroom` et `/learners/[learnerId]` | [classroom cours](../../app/app/courses/[courseSlug]/classroom/page.tsx), [suivi](../../app/app/courses/[courseSlug]/classroom/learners/[learnerId]/page.tsx) | CourseWorkspace + CourseClassroom / LearnerProgressDetail |
| `/app/courses/[courseSlug]/discussion` | [discussion](../../app/app/courses/[courseSlug]/discussion/page.tsx) | CourseWorkspace + CourseDiscussion |
| `/app/library` | [bibliotheque](../../app/app/library/page.tsx) | LibraryView + import global library.css |
| `/app/profile` | [profil](../../app/app/profile/page.tsx) | ProfileForms, ProfileAvatar, Surface |
| `/app/settings`, `/app/settings/account` | [preferences](../../app/app/settings/page.tsx), [compte](../../app/app/settings/account/page.tsx) | ThemePreferenceForm / AccountSecuritySettings, Surface |

Total : 19 pages, 2 layouts. Les modes sont des variantes de composition de cours, pas des layouts Next distincts.

## 3. Primitives et controles

### API et adoption directe

| Composant | Variantes / contrat actuel | Imports directs constates | Limite et potentiel | Risque d'extraction |
|---|---|---:|---|---|
| [Button](../../components/ui/Button.tsx) | primary/secondary/ghost ; type button par defaut ; href optionnel | 22 | Bon point d'entree ; lien ne transmet pas les autres props, className du bouton remplace les classes calculees ; F03/T02 | Moyen : changement d'API et ordre des classes sur 22 consommateurs |
| [IconButton](../../components/ui/IconButton.tsx) | label obligatoire -> aria-label + title ; attributs bouton | 2 | Shell et ThemeToggle seulement ; beaucoup de boutons icones bruts ailleurs ; pas de type par defaut | Faible pour nouveau consommateur, moyen pour migration en formulaire |
| [Badge](../../components/ui/Badge.tsx) | success booleen, sinon neutre | 1 | CourseIdentityHeader ; tons insuffisants pour statut/avertissement ; ne pas absorber les libelles metier | Faible si API compatible |
| [Surface](../../components/ui/Surface.tsx) | section, id, className, children | 6 | Bonne enveloppe visuelle ; ne transmet pas les attributs ARIA/HTML generiques et impose section | Moyen si changement de balise/semantique |
| [ThemeToggle](../../components/ui/ThemeToggle.tsx) | Bascule clair/sombre, localStorage + evenement | 2 | AppShell/PublicShell ; partager resolution avec preferences, F08/T06 | Moyen : hydratation, stockage, onglets |
| [ToastProvider](../../components/ui/ToastProvider.tsx) | success/neutral, fermeture, temporisation 4s | 1 | Layout racine ; [dispatchToast](../../lib/ui/toast.ts) est le point commun deja present | Moyen : annonces, duree, couches |

Le nombre d'importateurs n'est pas le nombre d'instances. Les usages par classes CSS hors primitive sont nombreux : liens CourseLibrary/ExploreCatalog, boutons de dialog, commandes d'edition.

### Boutons, liens, formulaires

- [LearningActions](../../components/learning/LearningActions.tsx) expose notamment EnrollButton, CompleteLessonButton et StartCourseLink : conserver leurs operations metier, mutualiser seulement le rendu.
- [CourseCoverManager](../../components/course/CourseCoverManager.tsx) L59 passe une classe supplementaire a Button : cas concret du remplacement de classe. Les usages actuels `Button href` n'ont pas demontre de props perdues sensibles ; le probleme de transmission est d'abord un contrat incorrect.
- Les variantes destructives sont ecrites en CSS/metier (`course-danger-zone__delete`, `structure-delete`, `button--danger`, `lib-row__delete`) et absentes de l'API Button.
- Il n'y a pas de primitive Input/Select/Textarea/Field partagee. [CourseEditor](../../components/authoring/CourseEditor.tsx), [LessonEditor](../../components/authoring/LessonEditor.tsx), [CreateCourseForm](../../components/authoring/CreateCourseForm.tsx), [ProfileForms](../../components/profile/ProfileForms.tsx), [ProfileNameForm](../../components/profile/ProfileNameForm.tsx) et [AccountSecuritySettings](../../components/settings/AccountSecuritySettings.tsx) composent des controles natifs.
- Les labels existent largement. La lacune est le contrat uniforme aide/erreur/id/disabled et son style, pas une absence generale de semantique. AccountSecuritySettings utilise aria-describedby ; CoursePlanReview utilise aria-invalid.
- [FormatSelector](../../components/forge/FormatSelector.tsx) est une selection metier a inventorier comme consommateur, pas a convertir automatiquement en onglets.

Styles : base `.button/.icon-button/.form` dans [globals](../../styles/globals.css) L90/L368, overrides `.authoring-form`, puis controles scopes aux studios et au compte. Extraction proposee T02/T08 ; commencer par un formulaire sans effet sur la sauvegarde de lecon.

## 4. Cartes, identite, badges, listes et tableaux

| Famille et fichiers | Usages / variantes | Incoherence ou duplication | Mutualisation proposee / risque |
|---|---|---|---|
| [CoursePresentation](../../components/course/CoursePresentation.tsx) : CourseCard, PersonalCourseRow/Card, CourseMediaIdentity | Mes parcours list/cards ; morceaux repris par catalogue/dashboard | Ancien CourseCard et presentations specialisees coexistent ; absence d'importateur ne prouve pas qu'un export est supprimable | Conserver slots action/menu et metadata ; T11, risque moyen |
| CourseMeta et CourseFacts, meme fichier | Lecons/duree ; modules/lecons/duree | Formattage et icones voisins, mais contenu pas identique | Petit helper interne commun seulement si gain reel ; faible |
| [CourseCoverVisual](../../components/course/CourseCoverVisual.tsx), [DomainMetadata](../../components/course/DomainMetadata.tsx), [AuthorAttribution](../../components/course/AuthorAttribution.tsx) | Image/fallback, compact, domaine/auteur | Base deja partagee ; regles de geometrie redispersees dans CSS | Conserver contrats, stabiliser classes et dimensions ; moyen |
| [ProfileAvatar](../../components/profile/ProfileAvatar.tsx) | xs/sm/md/profile ; initiales ou image ; decoratif aria-hidden | Bon composant transversal ; nom accessible porte par voisin | Ne pas rendre l'avatar seul interactif sans nom ; faible |
| Badge, PublicationStatus, PersonalCourseStatus, RelationPills, cockpit-status | Identite du cours, liste, cockpit, dashboard | Trois dimensions a ne pas melanger : relation, publication, progression | Primitive de ton + mapping metier distinct ; F11/T11, moyen |
| ProgressRing, ProgressIndicator, WorkspaceProgress, progression Structure/Classroom | SVG annulaire, `<progress>`, texte, effectifs | Styles et labels proches, contextes/denominateurs differents | Harmoniser tons/format, pas tout en un composant ; moyen |
| [CourseLibrary](../../components/course/CourseLibrary.tsx) | ARIA table a 6 colonnes ; grille alternative ; groupe de filtres aria-pressed | Nombreuses couches CSS de grilles ; roles a tester lorsque colonnes masquees | T05/T10/T11, eleve pour refonte de grille |
| [LibraryView](../../components/library/LibraryView.tsx) | Liste media/source/resource, pagination 24, filtres, pills et previews | Style autonome `lib-*`, petits boutons 30px, tons non centralises | Partager controles/feedbacks avant les lignes ; moyen |
| [CourseClassroom](../../components/course/CourseClassroom.tsx), [LearnerProgressDetail](../../components/course/LearnerProgressDetail.tsx), [GlobalClassroomLanding](../../components/course/GlobalClassroomLanding.tsx) | Teacher : synthese, liste apprenants, suivi ; liste globale | Role different des cartes publiques ; tabs Synthese/Apprenants utilises comme boutons nav aria-current | Conserver vues metier ; T10/T11 pour vocabulaire/navigation, moyen |

Styles : `.course-presentation`, `.personal-course-*`, `.explore-*`, `.workspace-dashboard-*`, `.course-classroom*` dans [globals](../../styles/globals.css) ; `.lib-*` dans [library.css](../../styles/library.css).

## 5. Overlays, menus, notifications

| Existant | Usages / variantes | Preuves et divergences | Potentiel / risque |
|---|---|---|---|
| [ForgeProposalDialog](../../components/forge/ForgeProposalDialog.tsx) | Reponse, proposition complete/ciblee, ajustement, pending, stale | Dialog natif, Escape capture, fermeture pilotee par parent ; contient des gardes Sprint 18 | Extraire le chrome seulement apres recette S18 ; **eleve** |
| [PdfViewer](../../components/forge/PdfViewer.tsx) | Sources, ressources, bibliotheque ; loading/ready/failed | Dialog natif, iframe nommee, nouvel onglet | Deja reutilise ; garder le chargement URL hors primitive DS ; moyen |
| [CourseRemixButton](../../components/course/CourseRemixButton.tsx) | Confirmation remix compact ou normal | Dialog pilote, blocage fermeture pendant pending ; protections anti double-submit | Conserver comportement ; moyen |
| SourceDeleteDialog dans [SourceResourceActions](../../components/forge/SourceResourceActions.tsx), ResourceDeleteDialog dans [LessonResourcesPanel](../../components/forge/LessonResourcesPanel.tsx), DeleteDialog dans [LibraryView](../../components/library/LibraryView.tsx) | Confirmation, Annuler autofocus, suppression pending/erreur | Forte repetition du cadre dialog/body/footer ; sources et ressources ne sont pas interchangeables | ConfirmDialog visuel + callbacks locaux ; T09, moyen |
| Modal local de LibraryView | Inspection et preview image ; wide | Reutilise la classe metier `course-remix-dialog` pour un cadre generique | Renommer/migrer un seul consommateur a la fois ; moyen |
| [LessonImageStudio](../../components/forge/LessonImageStudio.tsx), [CoverStudioView](../../components/course/CoverStudioView.tsx), [CoverForgeStudio](../../components/course/CoverForgeStudio.tsx) | Preparation/generation/acceptation d'images | Formulaires/chrome propres, handlers async metier | Ne pas extraire l'orchestration comme primitive ; eleve |
| Overlay media local de [LessonEditor](../../components/authoring/LessonEditor.tsx) | Image/audio, validation, upload, retour focus | Div role=dialog + focus trap manuel, z-index 13000 ; pas un dialog natif | Standardiser gestion d'overlay sans changer upload ; eleve |
| [WorkspaceRail](../../components/course/WorkspacePanels.tsx) | Desktop dock/collapse/focus ; compact modal | Focus/scroll lock/aria-modal manuels, contenu central inert, z-index locaux | Comportement distinct d'une confirmation ; T09/T10, eleve |
| [CourseOverflowMenu/OwnerCourseMenu](../../components/course/OwnerCourseMenu.tsx) | Gestion/apercu, position fixe calculee | menu/menuitem sans fleches/focus a l'ouverture ; Escape present | Choisir menu complet ou disclosure de liens ; T07, moyen |
| [CourseShareButton](../../components/course/CourseShareButton.tsx) | Copier lien, ouvrir, lien publication | Popover role=dialog non modal ; Escape/clic exterieur, pas de gestion explicite du retour focus | Politique popover coherente avec overflow sans imposer focus trap modal ; moyen |
| ToastProvider et messages inline | Sauvegarde, copie, publication, erreurs | succes/neutral temporaires + status/alert inline ; pas de matrice d'annonce commune | T08 ; risque d'annonces doubles si extraction naive |

Autre modele present : `window.confirm` pour supprimer un module vide dans [CourseStructureEditor](../../components/authoring/CourseStructureEditor.tsx), contre confirmation inline dans [CourseDeletionPanel](../../components/course/CourseDeletionPanel.tsx). Le remplacement des confirmations natives n'est pas un quick win obligatoire.

## 6. Navigation, rails, onglets et breadcrumbs

| Surface | Existant et etats | Ecart / proposition |
|---|---|---|
| Navigation principale | [AppShell](../../components/shell/AppShell.tsx) : selection aria-current, sidebar expanded/collapsed, header mobile ; [PublicShell](../../components/shell/PublicShell.tsx) : liens publics et theme | Partager tokens et contrats d'action, pas fusionner les shells ; public n'a pas la meme densite |
| Navigation cours | [CourseContextNavigation](../../components/course/CourseContextNavigation.tsx), [CourseIdentityHeader](../../components/course/CourseIdentityHeader.tsx) : overview, modes, actions capabilities | Navigation de routes, pas tablist ; conserver filtrage capabilities |
| Structure | [CourseOutlineRail](../../components/course/CourseOutlineRail.tsx) : details/summary, timeline, progression, lecon aria-current | Ne pas convertir details en menu ARIA ; regler l'icone masquee globalement et mesurer densite |
| Recherche | [ContextualTopbarSearch](../../components/shell/ContextualTopbarSearch.tsx) partagee par dashboard/library de cours/explore ; recherche locale pour Bibliotheque media | Difference volontaire de contexte ; aligner focus/hauteur avant de fusionner le placement |
| Onglets Forge | [ForgeRail](../../components/forge/ForgeRail.tsx) : Conversation/Suggestions/Analyse/Ressources, role tabpanel, fleches/Home/End | Meilleure base de comportement existante, mais extraire apres stabilisation Sprint 18 |
| Onglets editeurs | [CourseEditor](../../components/authoring/CourseEditor.tsx), [LessonEditor](../../components/authoring/LessonEditor.tsx), classe editor-tabs | Cockpit sans fleches ; lecon avec adjacentTab mais pas de panneaux associes ; F04/T03 |
| Filtres | CourseLibrary : group/pressed ; LibraryView et DiscussionFilter : tablist ; Classroom : nav/current | Separations de sens a documenter avant une primitive Tabs unique ; T03 |
| Breadcrumbs/contextes | Context local de [LibraryView](../../components/library/LibraryView.tsx), [DiscussionContextLabel](../../components/course/DiscussionContextLabel.tsx), retour Mes parcours dans CourseContextNavigation | Pas de primitive Breadcrumb identifiee ; extraire seulement apres deux besoins identiques confirmes |
| Navigation Learner | [LearnerLesson](../../components/learning/LearnerLesson.tsx) : precedent/suivant, position et completion hors preview | Differente de la sauvegarde Teacher : harmoniser structure/focus sans rendre les actions identiques |

## 7. Matrice des etats visibles dans le code

Cette matrice decrit des branches/attributs existants ; elle ne vaut pas recette executee.

| Etat | Exemples existants | Lacune / risque |
|---|---|---|
| Loading | Forge pending aria-busy/status, PdfViewer phase loading, labels Sauvegarde/Traitement | LessonResourcesPanel retourne null avant donnees ; certains chargements de preview n'annoncent pas status |
| Empty | LessonEmptyContent, CourseLibrary/ExploreCatalog, LibraryView, Classroom | Textes et CTA contextualises utiles ; styles/rythme multiples, pas besoin de generique imposant un CTA partout |
| Error | form-error, PdfViewer alert, publication, comptes et uploads | Couleur rouge fixe, liaison champ/erreur non uniforme ; certains role=status meme pour erreur |
| Success | completion-state et dispatchToast | Deux canaux possibles pour un meme evenement ; la confirmation ne doit pas dependre seulement de 4s de toast |
| Disabled | Attribut natif sur commandes pending, permissions filtrees par parent | Pas de style global .button:disabled ; explication visible principalement dans Forge et compte |
| Hover/focus | Outline global ; course-presentation:focus-within ; topbar search:focus-within | forge-tab-panel outline:none L12319 sans remplacement local pour son propre focus |
| Stale / unsaved | Etat lesson-analysis-state et props stale/generationBlocked de Forge | Protections metier du Sprint 18, a figer dans la migration DS ; pas de modifications durant sa recette |
| Read-only | preview Learner, viewer route, canManage=false des ressources | Ne pas remplacer un controle absent par un bouton disabled qui changerait la decouvrabilite des droits |

## 8. Dependances styles/composants a proteger

| Famille | Proprietaire des styles actuel | Dependances sensibles |
|---|---|---|
| Primitives, shell, cours, editeur, Forge, profil/compte | [globals](../../styles/globals.css) | Classes globales, descendants, data-sidebar/data-structure/data-forge/data-modal/data-focus |
| Tokens et themes | [tokens](../../styles/tokens.css), [themes](../../styles/themes.css) importes par globals | Proprietes CSS heritees par tous les composants, pas copiees en props |
| Plan Forge | [forge-course-plan.css](../../styles/forge-course-plan.css) importe par globals | CoursePlanReview et boutons de validation/edition de plan |
| Bibliotheque media | [library.css](../../styles/library.css), importe par page | LibraryView + classe course-remix-dialog definie dans globals : dependance croisee |
| Overrides experimentaux | [custom-styles.css](../../styles/experiments/custom-styles.css), importe par root | Grille du workspace, summary Structure, icones Lucide, actions/mode switch/discussion |
| Non relies aux imports actifs retrouves | [app/globals.css](../../app/globals.css), [page.module.css](../../app/page.module.css) | Ne pas inclure leurs couleurs/Geist dans le contrat courant ; suppression eventuelle hors present audit |

## 9. Ordre de mutualisation recommande

1. Corriger le contrat Button et les noms de tokens avant de diffuser davantage les primitives.
2. Distinguer Tabs, FilterGroup et navigation de route ; corriger le cockpit avec un perimetre reduit.
3. Consolider feedbacks et champs sur un premier consommateur hors LessonEditor.
4. Extraire le cadre de confirmation depuis sources/ressources sans fusionner leurs actions.
5. Stabiliser layout/overrides et verifier les roles avant de mutualiser davantage les presentations Teacher/Learner.

Pas d'extraction globale de CourseWorkspace, LessonEditor ou ForgeRail proposee. La mutualisation du comportement de sauvegarde/analyse n'appartient pas a cet audit DS.
