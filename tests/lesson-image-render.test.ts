import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonMarkdown } from "../components/learning/LessonContent";
import { insertMediaResource } from "../lib/courses/lesson-markdown";
import { parseRichDirective, resourceIdsInRichContent } from "../lib/courses/lesson-rich-content";

const ID = "a10fd946-f15a-4662-a19c-2d3691ef9a69";
const directive = (extra = "") => `:::image\nresource=${ID}\nalt=Une guitare${extra}\n:::`;
const resources = { [ID]: { id: ID, kind: "image" as const, url: "https://signed.example/img.png?token=x", title: null, altText: null, caption: null, durationSeconds: null, status: "ready" as const } };
const render = (content: string, mode: "author" | "learner" = "author", res: Record<string, { kind?: string; url: string | null }> = resources) => renderToStaticMarkup(createElement(LessonMarkdown, { content, mode, resources: res as never }));

test(":::image directive is parsed", () => {
  const parsed = parseRichDirective(directive().split("\n"), 0);
  assert.equal(parsed?.kind, "image");
  assert.equal(parsed?.fields.resource, ID);
});

test("valid resource renders an image with alt and optional caption, no raw directive", () => {
  const html = render(directive("\ncaption=Vue de l’instrument"));
  assert.match(html, /<img src="https:\/\/signed\.example\/img\.png\?token=x" alt="Une guitare"/);
  assert.match(html, /<figcaption>Vue de l’instrument<\/figcaption>/);
  assert.doesNotMatch(html, /:::|resource=/);
  assert.doesNotMatch(render(directive()), /figcaption/);
});

test("directive wrapped in an untyped code fence still renders as media (existing saved lessons)", () => {
  const content = `Intro\n\n\`\`\`\n\n${directive()}\n\n\`\`\`\n\nSuite`;
  for (const mode of ["author", "learner"] as const) {
    const html = render(content, mode);
    assert.match(html, /<img /);
    assert.doesNotMatch(html, /:::|<pre|<code/);
  }
});

test("ordinary code fences and typed fences are unchanged", () => {
  assert.match(render("```\nconsole.log(1)\n```"), /<pre><code>console\.log\(1\)<\/code><\/pre>/);
  assert.match(render(`\`\`\`js\n${directive()}\n\`\`\``), /<pre><code>:::image/);
  assert.match(render(`\`\`\`\n${directive()}\ntexte\n\`\`\``), /<pre><code>/);
});

test("unresolved resource never exposes the raw directive, id or url", () => {
  const author = render(directive(), "author", {});
  assert.match(author, /Image indisponible/);
  assert.doesNotMatch(author, new RegExp(`:::|${ID}|resource=`));
  assert.equal(render(directive(), "learner", {}).includes(ID), false);
  assert.doesNotMatch(render(directive(), "learner", {}), /:::|<img/);
});

test("non-image resource referenced by :::image is rejected", () => {
  const html = render(directive(), "learner", { [ID]: { ...resources[ID], kind: "audio" as never } });
  assert.doesNotMatch(html, /<img|:::/);
});

test("preview and learner share one renderer contract", () => {
  const author = render(directive());
  const learner = render(directive(), "learner");
  assert.equal(author, learner);
});

test("only valid directives collect media ids; resolution stays scoped by the repository", () => {
  assert.deepEqual(resourceIdsInRichContent(directive()), [ID]);
  assert.deepEqual(resourceIdsInRichContent("```\nnothing\n```"), []);
});

test("media insertion never lands inside a code fence", () => {
  const content = "Avant\n\n```\n\n```\n\nAprès";
  const cursor = content.indexOf("```\n\n```") + 5;
  const result = insertMediaResource(content, cursor, cursor, "image", ID, "Alt");
  const fenceClose = result.content.indexOf("```", result.content.indexOf("```") + 3);
  assert.ok(result.content.indexOf(":::image") > fenceClose);
  const plain = insertMediaResource("Texte", 5, 5, "image", ID, "Alt");
  assert.equal(plain.content, `Texte\n\n:::image\nresource=${ID}\nalt=Alt\n:::`);
});
