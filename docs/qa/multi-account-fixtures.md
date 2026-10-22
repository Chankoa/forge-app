# Fixtures QA multi-comptes

## État d’audit

Le projet Supabase actif ne contient pas encore de famille de fixtures identifiée
`[QA]` / `qa-`. Aucun compte existant ne doit être réutilisé : les quatre profils
nécessaires sont donc **non provisionnés**. Le dépôt ne contient volontairement ni
identifiants QA, ni clé `service_role`.

Le flux d’authentification disponible est l’inscription email/mot de passe avec
confirmation. La création des comptes requiert donc quatre adresses de test
contrôlées et une session d’administration Supabase ou une confirmation email
manuelle. Ne jamais enregistrer les mots de passe, liens de confirmation ou clés
admin dans le dépôt, les tests, les captures ou les logs.

## Contrat canonique

| Identité logique | Rôle dans le cours | Relation attendue |
| --- | --- | --- |
| `QA_OWNER` | propriétaire | `courses.teacher_id` |
| `QA_EDITOR` | éditeur actif | `course_memberships`: `editor` / `active` |
| `QA_VIEWER` | lecteur collaborateur | `course_memberships`: `viewer` / `active` |
| `QA_LEARNER` | apprenant | `enrollments` seulement |

Le cours unique est **`[QA] Forge Reliability Course`**, avec le slug
`qa-forge-reliability-course`. Tous les éléments QA doivent porter le préfixe
`[QA]` ou un chemin de stockage `qa/`; cette convention est une garde de sécurité,
pas une autorisation pour une suppression par motif large.

État final attendu : cours `published`, `private`, domaine actif valide, trois
leçons réparties sur deux modules, apprenant inscrit à 0 %, membres actifs intacts,
et une ressource PDF, un média image et une source Forge conservés.

## Provisioning sûr (à réaliser avec accès autorisé)

1. Créer quatre comptes dédiés dans Auth avec des adresses de test contrôlées par
   l’équipe. Les secrets restent dans un gestionnaire de secrets local, hors dépôt.
2. Confirmer les comptes, puis vérifier que chaque `auth.users.id` possède son
   profil actif correspondant.
3. Connecté comme `QA_OWNER`, créer le cours via le flux Creator afin de conserver
   les contrôles RLS et les validations de domaine.
4. Ajouter `QA_EDITOR` et `QA_VIEWER` via le flux de collaborateurs, avec les rôles
   et statuts indiqués ci-dessus. Inscrire `QA_LEARNER` uniquement via le flux
   d’inscription ; il ne doit avoir aucune membership.
5. Ajouter via les flux canoniques : un petit PDF pédagogique à la leçon 2, une
   image avec texte alternatif référencée par directive à la leçon 1, et une petite
   source Forge texte/PDF. La source reste dans `course-sources`, jamais dans les
   ressources pédagogiques.
6. Publier le cours en visibilité privée. Ne le rendre public que pendant le test
   de discovery, puis restaurer immédiatement la visibilité privée.

Les sessions navigateur se font par connexion manuelle avec les secrets locaux.
Les valeurs d’environnement éventuelles sont uniquement locales (par exemple
`QA_OWNER_EMAIL` et `QA_OWNER_PASSWORD`) et ne sont ni commitées ni imprimées.

## Reset déterministe

Le reset est réservé à une session d’administration autorisée ou au propriétaire
QA, après résolution de l’ID **exact** du cours par son slug et contrôle que son
titre et propriétaire appartiennent à la famille QA.

1. Restaurer `published` et `private` sans supprimer le cours.
2. Supprimer uniquement les `lesson_progress` du couple `(QA_LEARNER, course QA)`.
3. Remettre l’enrollment QA learner à `not-started`, sans le supprimer.
4. Retirer uniquement les messages de discussion explicitement créés pour le test
   courant, par leurs IDs exacts.
5. Préserver les membres, la ressource PDF, le média, la source Forge et les comptes
   Auth. Les médias abandonnés restent gérables dans Library ; aucune suppression
   automatique de Storage n’est prévue.

Toute opération de suppression doit vérifier l’ID exact, le slug, le titre préfixé
`[QA]` et l’appartenance du propriétaire QA avant mutation. Ne jamais supprimer par
préfixe seul ni effacer les comptes Auth dans un reset courant.

## Matrice à exécuter après provisioning

| Surface | Owner | Editor | Viewer | Learner |
| --- | --- | --- | --- | --- |
| Métadonnées, structure, leçons, Forge | autorisé selon capacités | autorisé selon capacités existantes | lecture seule | aucune mutation |
| Publication, visibilité, archive, suppression | propriétaire seulement | refusé si contrat owner-only | refusé | refusé |
| Source Forge | propriétaire seulement | selon contrat source owner-only : refusé | refusé | refusé et non listée |
| PDF et média | gestion | selon capacité existante | lecture si accès collaborateur | rendu/apprentissage seulement |
| Progression | N.A. | N.A. | N.A. | 0 % → partiel → terminé → reload |

Les contrôles navigateur à exécuter avec ces sessions couvrent aussi publication /
dépublication / republication, visibilité publique temporaire, source non exposée,
responsive (390, 430, 768, 1100, 1440), thème sombre et navigation clavier.
