import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InlineFeedback } from "../components/ui/InlineFeedback";

test("InlineFeedback preserves the existing error class and announces errors", () => {
  const html = renderToStaticMarkup(InlineFeedback({ tone: "error", children: "La sauvegarde a échoué." }));

  assert.match(html, /^<p class="form-error" role="alert">/);
  assert.match(html, /La sauvegarde a échoué\./);
});

test("InlineFeedback preserves the success class, status role, and composed classes", () => {
  const html = renderToStaticMarkup(InlineFeedback({ tone: "success", className: "course-cockpit__feedback", children: "Modification enregistrée." }));

  assert.match(html, /^<p class="completion-state course-cockpit__feedback" role="status">/);
  assert.match(html, /Modification enregistrée\./);
});
