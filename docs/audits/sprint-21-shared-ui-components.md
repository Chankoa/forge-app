# Sprint 21 — Composants UI partagés

Date : 2026-11-01.

## État initial

- Branche `main`, HEAD `b7bf654` (`refactor(styles): consolidate course navigation CSS overrides`, Sprint 20.4).
- `git status --short` était vide avant ce lot : aucun travail non committé à préserver ni chevauchement avec le Sprint 20.4.
- Aucun token, feuille CSS, règle de cascade, permission, donnée métier ou logique Forge n'est modifié.

## Inventaire ciblé

| Famille | Usages examinés | Décision |
|---|---|---|
| Feedback inline erreur/succès | `CourseEditor`, `PublicationPanel`, `CourseCollaboratorManager`, `CourseCoverManager`, `LearningActions` et de nombreux formulaires/Forge | Duplication confirmée : même élément `p`, mêmes classes globales `form-error` / `completion-state`, et rôles live-region répétés. Retenue. |
| États vides | bibliothèque, Classroom, discussion, dashboard, cockpit, éditeur de leçon, catalogue | Écartée : les CTA, icônes, textes et structures sont propres aux domaines. Une primitive imposerait une structure métier ou masquerait des besoins d'accessibilité différents. |
| Chargements | PDF, previews média, upload de couverture, Forge, création de parcours | Écartée : les états `pending`, `aria-busy`, annulations et limites de cycle de vie diffèrent. |
| Toasts / confirmations | `ToastProvider`, publication, suppression, remix, Forge | Écartée : les toasts temporaires et les confirmations/dialogues ont des contrats de focus et d'annonces distincts. |

## Composant retenu

Une seule primitive a été introduite : [`InlineFeedback`](../../components/ui/InlineFeedback.tsx).

```ts
type InlineFeedbackTone = "error" | "success";

type InlineFeedbackProps = {
  tone: InlineFeedbackTone;
  children: ReactNode;
  className?: string;
};
```

- `tone="error"` rend `p.form-error[role="alert"]`.
- `tone="success"` rend `p.completion-state[role="status"]`.
- `children` accepte un contenu composé, y compris une action si un consommateur local en a un besoin établi ; aucune action n'est imposée.
- `className` complète les classes existantes sans modifier leur ordre ni leurs styles.

Le composant reste sans état et sans directive client. Il peut donc être importé par les compositions client existantes sans introduire une nouvelle frontière interactive.

## Usages migrés

| Fichier | États migrés | Effet |
|---|---|---|
| `components/authoring/CourseEditor.tsx` | sauvegarde locale, erreur de sauvegarde | L'erreur, auparavant annoncée avec `role="status"`, devient un `alert` cohérent. |
| `components/authoring/PublicationPanel.tsx` | publication/dépublication | Balisage et rendu inchangés. |
| `components/course/CourseCollaboratorManager.tsx` | recherche et modification de collaborateurs | L'erreur devient un `alert` cohérent. |
| `components/course/CourseCoverManager.tsx` | upload/suppression de couverture | L'erreur devient un `alert` cohérent. |
| `components/learning/LearningActions.tsx` | inscription et progression | Les erreurs reçoivent explicitement le rôle `alert`; le message de complétion statique reste local et inchangé. |

Les usages Forge, les erreurs de dialogs et les formulaires spécialisés n'ont pas été migrés : ils portent des contraintes propres (stale, chargement, focus, confirmation ou styles contextuels) qui ne sont pas démontrées équivalentes dans ce lot.

## Tests et validation

- [`tests/inline-feedback.test.ts`](../../tests/inline-feedback.test.ts) couvre les deux tons, les classes existantes, les rôles accessibles et la composition de `className`.
- Test ciblé : **2/2 passent**.
- Suite complète : **528/528 passent**.
- `npm run typecheck` : **code 0**.
- `npm run lint` : **code 0**.
- `npm run build` : **non finalisé dans cet exécuteur**. Deux tentatives ont été interrompues pendant `Creating an optimized production build ...`; chacune laisse un `.next/lock` vide, sans processus Node survivant ni `.next/BUILD_ID`. Le verrou a été vérifié avant sa suppression ciblée. La validation reste à faire dans un terminal indépendant avec `npm run build` (sans `next dev` concurrent).
- `git diff --check` : **code 0**.
- La validation visuelle authentifiée n'a pas été exécutée : l'automatisation navigateur Windows était indisponible à la suite de la restriction de politique d'URL constatée au Sprint 20.3. Aucun résultat visuel n'est donc revendiqué.

Les résultats finaux des commandes de validation sont consignés dans le compte rendu du sprint.

## Limites et suites reportées

- Les états vides, chargements, dialogues et toasts restent volontairement locaux.
- Une éventuelle primitive de confirmation doit être étudiée séparément avec ses contrats de focus et de fermeture.
- Les styles `form-error` et `completion-state` restent inchangés ; la normalisation de leurs tokens/couleurs ne fait pas partie de ce sprint.
