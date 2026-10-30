# Sprint 18 - Coherence brouillon local / Forge AI

Date : 29 octobre 2026.

## Resultat et statuts

| Statut | Etat |
| --- | --- |
| Implemente | Oui, dans l'arbre de travail local |
| Teste | Oui : 511 tests reussis, typecheck, lint et build executes sequentiellement |
| Deploye | Non ; aucun deploiement demande ou effectue |
| Valide | Validation technique automatisee reussie ; validation fonctionnelle authentifiee / produit en attente |

Aucun commit, push, appel provider reel, changement de configuration provider/modele, migration DB ou modification du Design System. Aucun contenu QA distant n'a ete modifie.

## Audit du chemin des donnees

1. [LessonEditor](../../components/authoring/LessonEditor.tsx) initialise `draft` et `savedDraft` depuis la lecon serveur. Les champs, insertions Markdown/medias et applications Forge ne changent que `draft`. Les refs rendent le dernier brouillon accessible aux handlers sans attendre un nouveau rendu.
2. Seule l'action explicite de sauvegarde appelle [saveLessonAction](../../app/app/create/actions.ts). L'action verifie `canEditLessons`, valide les champs, conserve le controle proprietaire sur la publication et revalide les routes. Apres succes, seul le snapshot soumis est reconnu comme sauvegarde ; une edition intervenue pendant la requete reste non sauvegardee. Un echec ne change pas cette reference.
3. [ForgeProposalContext](../../components/forge/ForgeProposalContext.tsx) expose le contenu et l'etat de sauvegarde vivants de l'editeur. Sa registration est republiee lors des changements de brouillon, de sauvegarde confirmee et d'etat pending, afin que les panneaux Forge reagissent sans selection de texte.
4. [ForgeRail](../../components/forge/ForgeRail.tsx) appelle `generateForgeAction` ; [ContentIntelligence](../../components/forge/ContentIntelligence.tsx) appelle `analyzeLessonContentAction`. Les requetes contiennent les identifiants de contexte, sources, consigne et eventuelle selection, pas le brouillon complet.
5. [buildForgeContext](../../lib/forge/context.ts) controle l'acces puis relit la lecon sauvegardee avec le reader de session/RLS. Les services [Conversation](../../lib/forge/service.ts) et [Analyze](../../lib/forge/intelligence/content.ts) ne disposent pas de port d'ecriture.
6. `baseContent` reste le contenu observe du contexte serveur des propositions de remplacement complet. [L'application locale](../../lib/forge/lesson-proposal-application.ts) le compare au contenu courant. Les [operations ciblees](../../lib/forge/intelligence/content-operations.ts) conservent leurs validations de passage/plage.
7. `operationId` est toujours genere cote serveur par requete : correlation de telemetrie et metadata des propositions completes, sans changement Sprint 18. Les revues et operations ciblees gardent leur contrat existant, avec correlation dans la telemetrie. La nouvelle empreinte locale n'est ni un operationId, ni une nouvelle version DB ; c'est une comparaison en memoire des champs du brouillon, jamais envoyee ni loggee.

## Ambiguites avant / comportement apres

| Situation | Avant | Apres |
| --- | --- | --- |
| Contenu local modifie sans sauvegarde | Forge pouvait analyser l'ancienne version serveur ; conflit parfois decouvert seulement a l'application | Message explicite de sauvegarde prealable, controles desactives et garde dans les handlers |
| Titre, resume ou objectifs modifies | Le panneau pouvait montrer le contexte sauvegarde sans expliquer le decalage | Tous les champs du brouillon participent au garde-fou, pas uniquement le contenu |
| Sauvegarde en cours | Nouvelle demande possible avant confirmation | Attente explicite de la confirmation ; aucune sauvegarde automatique |
| Edition pendant une sauvegarde | Necessite de distinguer soumission et derniere edition | Seule la soumission est acquittee ; les nouvelles modifications restent bloquees |
| Edition pendant/apres l'analyse | Proposition/revue visible sans avertissement proactif | Resultat marque obsolete selon son snapshot de depart ; application refusee |
| Sauvegarde apres modification | La simple disparition d'une erreur pouvait faire croire l'ancien resultat utilisable | L'ancienne empreinte reste conservee ; seule une nouvelle analyse reussie l'actualise |
| Echec provider en regeneration | Resultat precedent a conserver | Resultat et baseline precedents conserves ; erreur explicite et nouvelle tentative manuelle |
| Application acceptee | Modification du brouillon seulement | Inchange ; sauvegarde explicite toujours requise avant une nouvelle demande |

Le correctif se limite au bridge existant, a un helper d'etat partage et aux controles des surfaces concernees. Il ne transmet pas le brouillon au provider et ne sauvegarde rien implicitement. Le Chat de lecon est inclus : lui aussi lit le contexte sauvegarde. Le Chat apprenant et les plans au niveau parcours sont exclus du garde-fou.

## Scenarios executes

Les nouveaux tests sont repartis entre [lesson-analysis-state.test.ts](../../tests/lesson-analysis-state.test.ts), [content-intelligence.test.ts](../../tests/content-intelligence.test.ts) et [forge-proposal-dialog.test.ts](../../tests/forge-proposal-dialog.test.ts) : **9 tests ajoutes**.

| Scenario | Verification executee | Limite |
| --- | --- | --- |
| Modification non sauvegardee | Comparaison de chacun des champs ; motif explicite de blocage ; contrats de branchement des deux handlers avant appel serveur | Pas d'interaction navigateur authentifiee |
| Sauvegarde puis analyse | Snapshot confirme, reader serveur actualise, proposition issue du contenu sauvegarde et `baseContent` verifie | Sauvegarde simulee, aucune ecriture Supabase |
| Sauvegarde en cours / echec | Blocage meme sur brouillon propre ; anciennes refs conservees apres echec ; edition plus recente non acquittee | Tests deterministes du helper et contrats du bridge |
| Conflit stale | Modifications de contenu, titre, resume, objectifs ; resultat obsolete meme apres sauvegarde ; remplacement complet refuse par `baseContent` | Version distante concurrente non simulee dans le navigateur |
| Proposition obsolete | Rendu React reel de la modale : apercu conserve, appliquer desactive ; regeneration desactivee si non sauvegarde, disponible apres sauvegarde | Rendu statique, pas test du focus navigateur |
| Echec provider puis nouvelle analyse | Provider mock en erreur reseau, aucune mutation, nouvelle requete reussie avec operationId distinct et nouvelle base | Aucun appel provider reel |
| Application explicite | Generation sans changement local ; application volontaire seule modifie le brouillon, sans changer le snapshot sauvegarde | Pas de sauvegarde distante apres application |
| Lecon vide | Rendu React du bouton Generer bloque ; redaction manuelle toujours disponible ; evenement conserve et handler garde | Pas d'evenement DOM interactif execute |
| Permissions Editor / Viewer | Pipeline Analyze autorise Editor actif et refuse Viewer avant provider ; suite existante sur publication et permissions reussie | Pas de sessions multi-comptes ouvertes |

Les tests existants Sprint 17/17.1 restent verts : validation stricte, completude, sorties tronquees, baseline serveur, operationId, regeneration explicite et refus d'ecrasement stale.

## Verifications finales (ordre respecte)

Execution sequentielle du 2026-10-29 (boucle stoppant au premier code de sortie non nul) :

| Ordre | Commande | Debut | Fin | Code de sortie | Resultat |
|---|---|---|---|---|---|
| 1 | `npm run test` | 13:30:06 | 13:30:11 | 0 | `# tests 511`, `# pass 511`, `# fail 0`, `# skipped 0` |
| 2 | `npm run typecheck` | 13:30:11 | 13:30:15 | 0 | `tsc --noEmit` sans diagnostic |
| 3 | `npm run lint` | 13:30:15 | 13:30:30 | 0 | `✖ 4 problems (0 errors, 4 warnings)` : avertissements preexistants `@next/next/no-img-element` dans [CourseCoverVisual](../../components/course/CourseCoverVisual.tsx), [LibraryView](../../components/library/LibraryView.tsx) (2) et [ProfileAvatar](../../components/profile/ProfileAvatar.tsx) |
| 4 | `npm run build` | 13:30:30 | 13:30:41 | 0 | `✓ Compiled successfully`, TypeScript termine, `✓ Generating static pages (17/17)` |

Controle HTTP local supplementaire : serveur de production temporaire sur `127.0.0.1:3218`, route du cours QA -> **307 vers `/login?next=/app`**. Serveur arrete apres verification. Aucun test visuel ou parcours authentifie revendique ; les outils navigateur n'etaient pas disponibles pendant cette execution.

## Fichiers modifies

- [LessonEditor.tsx](../../components/authoring/LessonEditor.tsx) : snapshot vivant de sauvegarde, garde de soumission et rafraichissement du bridge.
- [LessonEmptyContent.tsx](../../components/authoring/LessonEmptyContent.tsx) : generation desactivee si sauvegarde necessaire/en cours ; redaction manuelle conservee.
- [ForgeProposalContext.tsx](../../components/forge/ForgeProposalContext.tsx) : exposition de l'etat local partage.
- [lesson-analysis-state.ts](../../lib/forge/lesson-analysis-state.ts) : nouveau helper dirty/saving/empreinte/obsolescence.
- [ContentIntelligence.tsx](../../components/forge/ContentIntelligence.tsx) : garde de toutes les taches/reprises, etats disponibles/en cours/obsoletes, revue et proposition avec baselines distinctes.
- [ForgeRail.tsx](../../components/forge/ForgeRail.tsx) : garde des demandes de lecon, evenement de generation, conversation, suggestions, regeneration et application.
- [ForgeProposalDialog.tsx](../../components/forge/ForgeProposalDialog.tsx) : avertissement obsolete, application bloquee, generation conditionnee a la sauvegarde.
- [lesson-analysis-state.test.ts](../../tests/lesson-analysis-state.test.ts) : nouveau fichier, 6 tests.
- [content-intelligence.test.ts](../../tests/content-intelligence.test.ts) : 2 tests de lifecycle et permissions ajoutes.
- [forge-proposal-dialog.test.ts](../../tests/forge-proposal-dialog.test.ts) : 1 test de controles obsoletes ajoute.
- [forge-ai-reliability.md](../architecture/forge-ai-reliability.md) : contrat Sprint 18.
- Ce compte rendu.

## Etat Git et limites

Arbre initial propre. Travail conserve localement, sans staging ni commit : 9 fichiers suivis modifies et 3 nouveaux fichiers (helper, tests d'etat, ce compte rendu). Aucun fichier de dependances, provider, modele, schema ou migration modifie.

Le garde-fou suit l'etat local et la derniere sauvegarde confirmee par cet editeur, pas une version serveur distribuee. Une edition dans un autre onglet ou par un collaborateur n'est pas detectee proactivement. Les protections `baseContent` et plages ciblees existantes restent en place, mais ne constituent pas une gestion de conflits serveur globale. Une edition puis retour exact au snapshot analyse n'est pas consideree obsolete. Les changements de sources ou de metadonnees de parcours a distance ne sont pas suivis par l'empreinte de lecon.

Les snapshots et propositions restent en memoire, avec le cycle de montage des panneaux existant ; aucune persistance de propositions n'est ajoutee. Les tests de cablage par inspection de source ne remplacent pas un test d'interaction React. Restent a valider manuellement avec les comptes QA autorises : sauvegarde reelle, interactions rapides pendant les requetes, selection ciblee, revue de coherence, focus de la modale, provider configure, application puis sauvegarde, publication et non-regression multi-comptes en navigateur.
