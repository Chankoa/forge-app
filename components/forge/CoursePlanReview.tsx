"use client";

import { useId, useState } from "react";
import { operationLabels, validateProposedValue, type CourseTarget, type CourseWorkflowData, type ApplyReport } from "@/lib/forge/orchestrator/contracts";
import { validSelection } from "@/lib/forge/orchestrator/validation";

export function CoursePlanReview({ data, pending, consumed, report, targetLabel, onUpdate, onSelectAll, onApply, onRevise }: {
  data: CourseWorkflowData; pending: boolean; consumed: boolean; report: ApplyReport | null;
  targetLabel(target: CourseTarget): string;
  onUpdate(id: string, patch: { after?: string; selected?: boolean }): void;
  onSelectAll(selected: boolean): void; onApply(): void; onRevise(instruction: string): void;
}) {
  const id = useId();
  const [instruction, setInstruction] = useState("");
  const { plan } = data;
  const selected = plan.operations.filter((operation) => operation.selected);
  const selectionValid = validSelection(plan, selected.map((operation) => operation.id));
  const valuesValid = plan.operations.every(validateProposedValue);
  const blocked = pending || consumed;
  const results = { success: "Enregistrée et vérifiée", failed: "Échec ou enregistrement non vérifié", stale: "Le parcours a changé depuis cette analyse.", skipped: "Non sélectionnée ou ignorée après une opération dépendante." };
  return <section className="course-plan-review" aria-label="Plan de modifications à examiner" aria-busy={pending}>
    <h3>Plan à examiner</h3><p>{plan.summary}</p>
    <p className="caption">L’application enregistre immédiatement les modifications sélectionnées. Sur un parcours publié, elles sont visibles dès l’enregistrement. En cas d’échec, les modifications précédentes restent enregistrées.</p>
    {plan.warnings.map((warning, index) => <p className="caption" key={index}>{warning}</p>)}
    {plan.operations.length === 0 ? <p>Aucune modification applicable proposée. Les autres recommandations restent à examiner manuellement.</p> : <>
      <label className="course-plan-review__select"><input type="checkbox" checked={selected.length === plan.operations.length} disabled={blocked} onChange={(event) => onSelectAll(event.target.checked)} />Tout sélectionner</label>
      <ol className="course-plan-review__operations">{plan.operations.map((operation) => {
        const result = report?.results.find((item) => item.id === operation.id);
        return <li key={operation.id} data-plan-operation={operation.id} tabIndex={-1}>
          <label className="course-plan-review__select"><input type="checkbox" checked={operation.selected} disabled={blocked} onChange={(event) => onUpdate(operation.id, { selected: event.target.checked })} /><strong>{operationLabels[operation.type]}</strong></label>
          {data.changedIds.includes(operation.id) && <span className="caption">Proposition révisée</span>}
          <p className="caption"><strong>Cible :</strong> {targetLabel(operation.target)}</p><strong>Pourquoi</strong><p>{operation.reason}</p>
          <div className="course-plan-review__before"><strong>Avant</strong><p>{operation.before || "Non renseigné"}</p></div>
          <label htmlFor={`${id}-${operation.id}`}>Après{operation.type === "update_lesson_objective" ? " — un objectif par ligne" : ""}</label>
          <textarea id={`${id}-${operation.id}`} value={operation.after} disabled={blocked} maxLength={4000} rows={operation.type.includes("rename") ? 2 : 4} aria-invalid={!validateProposedValue(operation)} onChange={(event) => onUpdate(operation.id, { after: event.target.value })} />
          {!validateProposedValue(operation) && <p className="form-error">Renseignez un texte valide et respectez la longueur du champ.</p>}
          {operation.dependencies.length > 0 && <p className="caption">Nécessite aussi : {operation.dependencies.map((dependency) => operationLabels[plan.operations.find((item) => item.id === dependency)!.type]).join(", ")}.</p>}
          {result && <p role="status">{results[result.status]}</p>}
        </li>;
      })}</ol>
      <p role="status">{selected.length} modification{selected.length > 1 ? "s" : ""} sélectionnée{selected.length > 1 ? "s" : ""}</p>
      {selected.length > 0 && !selectionValid && <p className="form-error">Sélectionnez aussi les opérations nécessaires indiquées ci-dessus.</p>}
      <button type="button" className="button button--primary" disabled={blocked || !selectionValid || !valuesValid} onClick={onApply}>{pending ? "Traitement…" : "Appliquer et enregistrer la sélection"}</button>
    </>}
    {consumed && <p className="caption">Ce plan a été traité. Relancez l’analyse pour proposer d’autres modifications.</p>}
    <form className="course-plan-review__revision" onSubmit={(event) => { event.preventDefault(); if (!blocked && instruction.trim()) onRevise(instruction.trim()); }}>
      <label htmlFor={`${id}-instruction`}>Demander un ajustement du plan</label>
      <textarea id={`${id}-instruction`} value={instruction} maxLength={2000} disabled={blocked} onChange={(event) => setInstruction(event.target.value)} placeholder="Par exemple : ne touche pas au premier module." />
      <button className="button button--secondary" type="submit" disabled={blocked || !instruction.trim()}>Réviser la proposition</button>
    </form>
  </section>;
}
