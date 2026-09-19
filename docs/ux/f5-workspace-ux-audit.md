# F5 — audit de composition

Départ : `efb80ab`, F4 fermé, working tree propre. Branche `f5-workspace-ux-ds-polish`.
Audit avant modification UI : 18 septembre 2026. Les neuf PNG 00–08, README User Journey, DS 1.1, références DS Light/Dark et les deux références unified ont été ouverts et inspectés.

Priorité : contrats F0–F4, composition User Journey, expression DS. Le README place le DS avant User Journey ; le brief F5 prévaut pour la composition. Collaboration, notifications, recherche globale, notes, statistiques fictives et génération de parcours absente ne seront pas ajoutées pour ressembler à une image.

## Matrice initiale

| Référence | UI actuelle | Delta | Priorité | Action |
| --- | --- | --- | --- | --- |
| 00 Public Home | Hero isolé centré verticalement, deux blocs, typographie serif, preview annoncée comme IA future | Grande zone vide, pas de rythme intro/action/aperçu, copy obsolète | P1 | Hero cadré, sans serif, preview éditoriale, liens existants clairement hiérarchisés, découverte sans faux contenu |
| 01 Workspace Home | Header + deux cards seules, navigation horizontale | Pas de hiérarchie hero/reprise/parcours ; app-body n'a pas de width explicite ; nav disparaît en mobile | P0 | Conteneur explicite, navigation latérale desktop et accessible mobile, hero et reprise avec données existantes |
| 02 Create Intent | Formulaire long dans surface à gauche | Intention mêlée aux informations, pas d'étapes spatiales ; largeur non centrée | P1 | Surface de création centrée, intention dominante et champs regroupés ; conserver création manuelle |
| 03 Generated Path | Preview locale titre/description | Aucune génération IA de parcours dans ce flux ; pas de lecture claire de la preview | P1 | Distinguer preview locale / informations / création, conserver honnêteté et contrat F2 |
| 04 Mes parcours | Grille deux colonnes, résumé absent, progression seulement texte | Cards peu hiérarchisées, relation et statut dispersés, pas de mesure visuelle | P1 | Cards compactes alignées, progression native, statut/relation, titre et CTA stables |
| 05 Course Overview | Header technique, description utilisée comme h2, programme plat entre rails | Hiérarchie titre/description/statistiques/programme faible | P1 | Header contextuel sobre, vrais comptes, programme structuré, navigation capabilities inchangée |
| 06 Course Learn | Rails fixes et empilement tablette/mobile, plusieurs zones scroll Forge | Centre comprimé, pas de drawer, Forge pas d'état expanded ; lecture insuffisamment cadrée | P0 | Largeurs en tokens, panneaux temporaires sous 1100px, rail 3 états, surface de lecture, un scroll de panneau |
| 07 Course Edit | Draft contrôlé F4, tabs simples, champs tous en colonne | Faible densité, save sans zone dédiée, ressources sans mise en forme | P1 | Tabs clavier et panels, grille métadonnées, save clair, ressources lisibles, préserver le draft |
| 08 Publication | Colonne checklist + bouton | Statut peu expressif, termes techniques, pas de séparation readiness/action | P1 | Bloc état et préparation puis CTA ; ignorer toute collaboration maquette |

## Constats transversaux

- Conteneur : `.app-body` max-width 1280 mais sans width ; distinguer page 1120, workspace 1600 et lecture 68ch.
- Rails : valeurs 250/280/320/64 dupliquées et overrides contradictoires. Collapsed récupère une largeur desktop mais reste incohérent aux breakpoints.
- Forge : max-height au résultat ET à ses sous-blocs ; actions peuvent être coupées. Un seul défilement du panneau ; résultat sans sous-scroll.
- DS : titres Georgia contrairement à Inter/system ; succès/erreur codés en couleurs Light ; manque surface-control et sémantique danger.
- Navigation : `.nav {display:none}` à 600px sans alternative ; état actif parcours doit suivre les sous-routes.
- Accessibilité : Escape Forge global ferme même depuis le contenu ; tabs sans relations tab/panel ni navigation clavier ; sidebar/rails nécessitent retour de focus.
- États : boutons disponibles déjà distingués des désactivés par F4, à conserver ; pending et erreurs restent explicites.
- Dark : thème appliqué au clic seulement ; persistance à rétablir au chargement sans changer les permissions.

## Comparaison de l'app avant code

Homepage réellement ouverte et capturée dans le navigateur local : grand vide vertical et serif confirmés. `/app` redirige vers login dans la session disponible. Audit des autres surfaces effectué sur les composants et styles réels, à compléter par comparaison authentifiée ; aucune validation visuelle authentifiée n'est revendiquée à ce stade. Connexion demandée à l'utilisateur, sans demande de secret. CLI agent-browser indisponible ; navigateur Codex utilisé pour les contrôles visuels.

## Divergences intentionnelles

Brand Forge et routes canoniques conservées. Aucune app Teacher/Learner. Pas de faux avatars, reviews, activité, images de parcours ou pourcentages inventés. Pas de recherche décorative non fonctionnelle. La preview 03 reste locale. PDF extraction, collaboration, remix et participants restent hors scope. La navigation de parcours conserve Vue d'ensemble / Apprendre / Modifier / Publication selon capabilities.

## Implémentation Terra

- Les tokens de surface et de typographie sont alignés sur les rôles DS 1.1; les titres utilisent désormais la famille sans-serif commune.
- Le workspace consomme l'API `WorkspacePanels`: Structure 240px, Forge 320px par défaut, Forge 440-500px agrandi et rails 52px repliés. L'Editor reçoit l'espace libéré.
- Sous 1100px, Structure et Forge deviennent des panneaux temporaires avec scrim, Escape, focus initial, restauration de focus et boucle Tab; l'Editor conserve sa largeur.
- La navigation principale reste défilable sur mobile au lieu d'être masquée. Les modes de parcours ont aussi un défilement horizontal explicite.
- Forge évite les sous-zones de défilement pour le texte, les listes et les propositions; seul le code long conserve un scroll local. Les actions de proposition restent visibles par positionnement sticky.
- Les tabs de leçon utilisent un roving tab index avec flèches, Home et End. Le thème persiste désormais au chargement client.

## Comparaison après implémentation

La QA visuelle authentifiée Light/Dark à 1440/900/390 reste à exécuter dans une session qui n'a pas expiré. Les statuts finaux seront séparés des validations live de provider et DB.
