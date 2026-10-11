# I.10.A — Audit du contenu des leçons

## Conclusion

**Voie A : amélioration progressive.** Le Markdown reste le contrat de stockage et de lecture. Une migration vers un modèle de blocs n'est pas justifiée par les usages actuellement pris en charge.

## Persistance et brouillon

- `lessons.content` contient le corps Markdown de la leçon. `content_path` subsiste comme métadonnée héritée et dans la copie Remix, mais la lecture active utilise `content`.
- Titre, `description`, `objectives`, `type`, durée et statut sont des champs distincts. Les objectifs ne sont pas copiés dans le corps.
- `LessonEditor` crée un brouillon local depuis `CourseLesson`. `saveLessonAction` valide ce brouillon avec `lessonSchema`, vérifie la capacité d'édition et met à jour la ligne `lessons` seulement lors de la sauvegarde explicite. Il n'y a pas de sérialiseur de blocs ni de sauvegarde automatique.

## Édition et rendu avant I.10.A

- L'éditeur utilisait un grand `textarea` Markdown, avec un lien vers l'aperçu apprenant par route. Le contenu Forge appliqué modifiait le brouillon local, puis exigeait une sauvegarde distincte.
- Le lecteur et l'aperçu de route utilisent tous deux `LessonContent`. Son parseur React couvre titres, paragraphes, listes, citations, blocs de code, code en ligne et liens. React échappe le texte ; les liens ne deviennent actifs qu'en HTTP(S). Il ne produit pas de HTML brut.
- Le parseur ne distinguait pas les callouts et modifiait certaines chaînes avant analyse. La proposition Forge affichait le Markdown dans un `pre`, sans rendu pédagogique.

## Forge et analyse de structure

- La génération de leçon reçoit le titre, les objectifs, le module, le parcours, le contenu existant et jusqu'à quatre sources sélectionnées. Le service borne `patch.content` à 3 800 caractères et renvoie une proposition `explicit_only`.
- Les transformations et l'analyse pédagogique utilisent le même circuit proposition → examen → application au brouillon local → sauvegarde. Une sélection de texte peut cibler une opération ; elle est vérifiée contre le brouillon courant avant application.
- L'analyse de structure lit titres, objectifs, résumés et ordre, mais pas les corps. Son contrat comporte un constat (`reason`) et une suggestion, sans texte prêt à appliquer. Seule une navigation vers le champ objectif peut donc être proposée en toute sécurité sans nouveau contrat de mutation.

## Limites connues

- Le parseur est volontairement un sous-ensemble de Markdown, sans images ni tables. L'insertion d'images attend le travail média prévu ultérieurement.
- Les propositions de structure ne contiennent pas de nouveau titre ou objectif validé prêt à appliquer. Renommage, fusion et création de leçon restent des recommandations jusqu'à l'existence d'un contrat de proposition et d'un brouillon structurel adapté.
- L'édition assistée par barre d'outils conserve une surface de texte Markdown ; elle ne fournit pas de blocs manipulables ou de mise en forme WYSIWYG.
