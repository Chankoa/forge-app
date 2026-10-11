import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonMarkdown } from "../components/learning/LessonContent";
import { validateRichContent } from "../lib/courses/lesson-rich-content";
import { insertLessonMarkdown } from "../lib/courses/lesson-markdown";

const resourceId = "11111111-1111-4111-8111-111111111111";
const resources = { [resourceId]: { url: "https://cdn.example.com/lesson.mp3" } };

test("rich directives validate supported image, audio, video, and practice blocks", () => {
  const content = [
    `:::image\nresource=${resourceId}\nalt=Une guitare\ncaption=Vue de l’instrument\n:::`,
    `:::audio\nresource=${resourceId}\ntitle=Riff principal\nbpm=92\n:::`,
    ":::video\nurl=https://www.youtube.com/watch?v=abc123\ntitle=Démonstration\n:::",
    ":::practice\ntitle=Exercice de mise en place\nbpm=96\nmeter=4/4\nduration=4 mesures\n:::\nTravaillez le motif.\n:::",
  ].join("\n\n");
  assert.equal(validateRichContent(content, { allowResourceIds: [resourceId], trustedUrls: ["https://www.youtube.com/watch?v=abc123"] }), true);
});

test("invalid directives, unsupported fields, unsafe URLs, and fabricated resources fail safely", () => {
  assert.equal(validateRichContent(":::image\nresource=not-a-resource\nalt=Image\n:::"), false);
  assert.equal(validateRichContent(":::practice\ntitle=Exercice\nunknown=valeur\n:::"), false);
  assert.equal(validateRichContent(":::video\nurl=https://evil.example/video\ntitle=Vidéo\n:::", { trustedUrls: ["https://evil.example/video"] }), false);
  assert.equal(validateRichContent("<script>alert(1)</script>"), false);
  assert.equal(validateRichContent(":::unsupported\ntitle=Non supporté\n:::") , false);
});

test("renderer handles media, practice metadata, placeholders, and safe video embeds", () => {
  const content = [
    `:::image\nresource=${resourceId}\nalt=Une image\n:::`,
    `:::audio\nresource=${resourceId}\ntitle=Audio pédagogique\nbpm=92\n:::`,
    ":::video\nurl=https://www.youtube.com/watch?v=abc123\ntitle=Vidéo pédagogique\n:::",
    ":::practice\ntitle=Exercice\nbpm=96\nmeter=4/4\n:::\nTravaillez le motif.\n:::",
    "```tab\ne|------|\nB|------|\n```",
  ].join("\n\n");
  const html = renderToStaticMarkup(createElement(LessonMarkdown, { content, mode: "author", resources }));
  assert.match(html, /<img[^>]+alt="Une image"/);
  assert.match(html, /<audio[^>]+controls/);
  assert.match(html, /youtube-nocookie\.com\/embed\/abc123/);
  assert.match(html, /class="lesson-practice"/);
  assert.match(html, /96 BPM · 4\/4/);
  assert.match(html, /class="lesson-tab"/);
});

test("learner mode hides unresolved placeholders and does not render a broken player", () => {
  const html = renderToStaticMarkup(createElement(LessonMarkdown, { content: ":::audio\nstatus=placeholder\ntitle=À ajouter\ncaption=Ajouter un extrait\n:::" }));
  assert.doesNotMatch(html, /<audio/);
  assert.doesNotMatch(html, /Audio à ajouter/);
});

test("rich insertion preserves surrounding content and creates controlled syntax", () => {
  for (const action of ["image", "audio", "video", "tab", "practice"] as const) {
    const result = insertLessonMarkdown("Avant\n\nAprès", 7, 7, action);
    assert.match(result.content, /Avant/);
    assert.match(result.content, /Après/);
    assert.doesNotMatch(result.content, /<iframe|<script/i);
  }
  assert.match(insertLessonMarkdown("", 0, 0, "tab").content, /```tab/);
  assert.match(insertLessonMarkdown("", 0, 0, "practice").content, /:::practice/);
});
