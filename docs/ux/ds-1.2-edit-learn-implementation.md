# DS 1.2 — UJ07 Edit et UJ06 Learn

## Portée et correspondance

| État réel avant ce sprint | Référence | Décision |
| --- | --- | --- |
| Éditeur avec onglets Informations, Contenu, Ressources et sauvegarde manuelle | UJ07 : leçon, objectif, contenu, actions regroupés | Adapter : ouvrir sur Contenu, afficher l’objectif près du corps, réunir statut, aperçu et sauvegarde dans l’en-tête. Conserver les trois onglets et le formulaire existants. |
| Leçon avec contenu et bouton de fin | UJ06 : lecture, progression, précédente / terminer / suivante | Adapter : largeur de lecture bornée, contexte module/leçon et navigation issue du vrai plan. Garder le moteur de progression. |
| Structure et Forge communs | UJ06/UJ07 : trois zones sœurs | Garder les composants et états DS 1.2 déjà validés. |

## Fichiers et architecture

- `app/app/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx` sélectionne la vue selon les routes et permissions existantes.
- `components/authoring/LessonEditor.tsx` garde le brouillon, les propositions Forge, le formulaire et `saveLessonAction`. L’en-tête a une seule sauvegarde manuelle visible et un lien d’aperçu.
- `components/learning/LearnerLesson.tsx` compose la lecture existante et une navigation entre leçons ; `lib/courses/lesson-navigation.ts` dérive les voisins et la position du plan réel.
- `styles/globals.scss` ajoute des styles limités aux vues de leçon. `tests/lesson-navigation.test.ts` protège le passage entre modules et les limites du parcours.

`CourseWorkspace`, `CourseOutlineRail`, `WorkspacePanels`, `ForgeRail`, `DomainMetadata` et `LessonContent` restent partagés. Les contrôles d’édition et de sauvegarde restent propres au Creator ; l’action de progression reste propre au Learner.

## Comportement et limites

À 1440 px, Structure et Forge encadrent le contenu ; à 1100 px, ils utilisent les tiroirs existants. À 430 et 390 px, l’en-tête et les actions se réorganisent, la navigation de fin de leçon passe sur deux rangs et le contenu garde l’espace prévu au-dessus de la navigation fixe. Les onglets conservent leur navigation clavier ; les tiroirs et la concentration Forge conservent Escape, piège de focus et retour au lanceur.

Le modèle réel ne contient pas d’activité structurée, de diagramme, de bloc « À retenir » ni d’analytique apprenant. Une leçon de type `exercise` reste éditée dans le contenu Markdown existant. La prévisualisation ne modifie pas la progression et garde `mode=preview` lors de la navigation. La durée n’apparaît que lorsqu’elle est renseignée. Aucun contrôle ou contenu simulé du prototype n’a été ajouté.

Les écarts à UJ07/UJ06 tiennent aux données et comportements de production : trois onglets au lieu de deux, éditeur Markdown plutôt qu’éditeur riche, contenu de leçon rendu tel qu’enregistré et actions Forge réellement disponibles. Les évolutions de contenu, d’activité et d’IA sont différées. UJ08 et les autres pages ne font pas partie de ce sprint.
