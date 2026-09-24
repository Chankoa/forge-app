import assert from "node:assert/strict";
import test from "node:test";
import { businessDomainLabel, courseDomainUpdate, matchExistingDomain, parseDomainSelection } from "../lib/forge/domain-mapping";

test("suggested domain maps only to a unique persisted ID or exact normalized name", () => {
  const domains = [{ id: "id-1", name: "Création web" }, { id: "id-2", name: "Cuisine" }];
  assert.equal(matchExistingDomain("creation WEB", domains), "id-1");
  assert.equal(matchExistingDomain("id-2", domains), "id-2");
  assert.equal(matchExistingDomain("Management & organisation", domains), "");
  assert.equal(matchExistingDomain("Cuisine", [...domains, { id: "id-3", name: "cuisine" }]), "");
});

test("create may leave the domain unset and only accepts a real selected ID", () => {
  assert.equal(parseDomainSelection(""), null);
  assert.equal(parseDomainSelection(null), null);
  assert.equal(parseDomainSelection(" 4a93e31c-c2ca-41fe-bd22-f98bceba83d0 "), "4a93e31c-c2ca-41fe-bd22-f98bceba83d0");
  assert.throws(() => parseDomainSelection("Management"));
});

test("business domain suggestion is retained without false mapping or placeholder", () => {
  const label = businessDomainLabel("Management d'équipe");
  assert.equal(label, "Management d'équipe");
  assert.equal(matchExistingDomain(label!, [{ id: "marketing", name: "Digital marketing" }]), "");
  assert.equal(businessDomainLabel("Domaine suggéré"), null);
  assert.equal(businessDomainLabel(null), null);
});

test("owner can update or clear domain while old forms leave it untouched", () => {
  const id = "4a93e31c-c2ca-41fe-bd22-f98bceba83d0";
  assert.deepEqual(courseDomainUpdate(parseDomainSelection(id)), { domain_id: id });
  assert.deepEqual(courseDomainUpdate(parseDomainSelection("")), { domain_id: null });
  assert.deepEqual(courseDomainUpdate(undefined), {});
});
