import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DomainMetadata } from "../components/course/DomainMetadata";

test("course domain reads as editorial metadata without a redundant field label", () => {
  const html = renderToStaticMarkup(createElement(DomainMetadata, { domain: "Intelligence artificielle" }));
  assert.match(html, /Intelligence artificielle/);
  assert.doesNotMatch(html, /Domaine/);
});

test("optional subdomain renders only when real data exists", () => {
  const html = renderToStaticMarkup(createElement(DomainMetadata, { domain: "Intelligence artificielle", subdomain: "Numérique" }));
  assert.match(html, /Numérique/);
  assert.equal(renderToStaticMarkup(createElement(DomainMetadata, {})), "");
});
