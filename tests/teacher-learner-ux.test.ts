import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("teacher lesson feedback uses the same semantic primitive as learner completion", () => {
  const editor = readFileSync("components/authoring/LessonEditor.tsx", "utf8");
  const learningActions = readFileSync("components/learning/LearningActions.tsx", "utf8");

  assert.match(editor, /import \{ InlineFeedback \} from "@\/components\/ui\/InlineFeedback"/);
  assert.match(editor, /<InlineFeedback tone=\{message\.includes\("échoué"\) \? "error" : "success"\}>\{message\}<\/InlineFeedback>/);
  assert.match(learningActions, /<InlineFeedback tone="success"><Check size=\{17\} \/> Leçon terminée<\/InlineFeedback>/);
});
