import assert from "node:assert/strict";
import test from "node:test";
import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";

test("native Button keeps its type, HTML attributes, and internal classes", () => {
  const html = renderToStaticMarkup(Button({
    children: "Sauvegarder",
    type: "submit",
    variant: "secondary",
    className: "course-cover-manager__forge",
    title: "Enregistrer",
    "aria-describedby": "help",
    "data-operation": "save",
  }));

  assert.match(html, /^<button /);
  assert.match(html, /class="button button--secondary course-cover-manager__forge"/);
  assert.match(html, /type="submit"/);
  assert.match(html, /title="Enregistrer"/);
  assert.match(html, /aria-describedby="help"/);
  assert.match(html, /data-operation="save"/);
});

test("Button preserves all supported visual variants", () => {
  for (const variant of ["primary", "secondary", "ghost"] as const) {
    const html = renderToStaticMarkup(Button({ children: "Action", variant }));
    assert.match(html, new RegExp(`class="button button--${variant}"`));
  }
});

test("link Button forwards navigation and anchor attributes", () => {
  const props = {
    children: "Explorer",
    href: "/app/explore",
    className: "explore-feature__primary-action",
    prefetch: false,
    scroll: false,
    title: "Explorer",
    "aria-label": "Explorer les parcours",
    "data-testid": "explore-link",
  };
  const element = Button(props);
  const html = renderToStaticMarkup(element);

  assert.equal(element.type, Link);
  assert.equal(element.props.prefetch, false);
  assert.equal(element.props.scroll, false);
  assert.match(html, /^<a /);
  assert.match(html, /href="\/app\/explore"/);
  assert.match(html, /class="button button--primary explore-feature__primary-action"/);
  assert.match(html, /title="Explorer"/);
  assert.match(html, /aria-label="Explorer les parcours"/);
  assert.match(html, /data-testid="explore-link"/);
});

test("disabled link Button is non-navigable and keeps its explanatory attributes", () => {
  const element = Button({
    children: "Explorer",
    href: "/app/explore",
    disabled: true,
    onClick: () => assert.fail("a disabled link must not retain its click handler"),
    tabIndex: 0,
    title: "Explorer indisponible",
    "data-testid": "disabled-link",
  });
  const html = renderToStaticMarkup(element);

  assert.equal(element.props.onClick, undefined);
  assert.equal(element.props.tabIndex, undefined);
  assert.match(html, /^<span /);
  assert.doesNotMatch(html, /href=/);
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /title="Explorer indisponible"/);
  assert.match(html, /data-testid="disabled-link"/);
});

test("IconButton composes classes and derives an accessible name from its label", () => {
  const html = renderToStaticMarkup(IconButton({
    children: "×",
    label: "Fermer le panneau",
    className: "workspace-panel__close",
    type: "button",
    "aria-expanded": true,
    "data-panel": "forge",
  }));

  assert.match(html, /^<button /);
  assert.match(html, /class="icon-button workspace-panel__close"/);
  assert.match(html, /aria-label="Fermer le panneau"/);
  assert.match(html, /title="Fermer le panneau"/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /data-panel="forge"/);
});
