import assert from "node:assert/strict";
import test from "node:test";
import { hasUnclosedCodeFence, insertLessonMarkdown, type LessonInsertAction } from "../lib/courses/lesson-markdown";

test("editor insertions preserve text around a selection", () => {
  for (const action of ["paragraph", "heading2", "heading3", "bold", "italic", "bullets", "numbers", "callout", "quote", "code", "divider", "link"] satisfies LessonInsertAction[]) {
    const next = insertLessonMarkdown("Avant\n\nTexte choisi\n\nAprès", 7, 19, action);
    assert.ok(next.content.startsWith("Avant\n\n"), action);
    assert.ok(next.content.endsWith("\n\nAprès"), action);
    assert.ok(next.selectionStart <= next.selectionEnd, action);
  }
});

test("heading, list, code and callout insert predictable Markdown", () => {
  assert.match(insertLessonMarkdown("", 0, 0, "heading2").content, /^## Titre de section$/);
  assert.match(insertLessonMarkdown("", 0, 0, "heading3").content, /^### Sous-section$/);
  assert.equal(insertLessonMarkdown("Texte choisi", 0, 12, "bold").content, "**Texte choisi**");
  assert.equal(insertLessonMarkdown("Texte choisi", 0, 12, "italic").content, "*Texte choisi*");
  assert.equal(insertLessonMarkdown("a\nb", 0, 3, "bullets").content, "- a\n- b");
  assert.equal(insertLessonMarkdown("a\nb", 0, 3, "numbers").content, "1. a\n2. b");
  assert.equal(insertLessonMarkdown("", 0, 0, "code").content, "```\nVotre code ici\n```");
  assert.equal(insertLessonMarkdown("", 0, 0, "callout").content, "> [!NOTE]\n> Point à retenir");
  assert.equal(insertLessonMarkdown("Texte", 0, 5, "link").content, "[Texte](https://exemple.fr)");
  assert.equal(insertLessonMarkdown("Texte sélectionné", 0, 17, "divider").content, "---\n\nTexte sélectionné");
});

test("code insertion adapts its fence and unfinished fences are flagged", () => {
  const next = insertLessonMarkdown("code ``` exemple", 0, 16, "code").content;
  assert.ok(next.startsWith("````\n"));
  assert.equal(hasUnclosedCodeFence("```js\nconst a = 1;"), true);
  assert.equal(hasUnclosedCodeFence("```js\nconst a = 1;\n```"), false);
});
