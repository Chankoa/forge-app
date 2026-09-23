import assert from "node:assert/strict";
import test from "node:test";
import { matchExistingDomain } from "../lib/forge/domain-mapping";

test("suggested domain maps only to a unique persisted ID or exact normalized name", () => {
  const domains = [{ id: "id-1", name: "Création web" }, { id: "id-2", name: "Cuisine" }];
  assert.equal(matchExistingDomain("creation WEB", domains), "id-1");
  assert.equal(matchExistingDomain("id-2", domains), "id-2");
  assert.equal(matchExistingDomain("Management & organisation", domains), "");
  assert.equal(matchExistingDomain("Cuisine", [...domains, { id: "id-3", name: "cuisine" }]), "");
});
