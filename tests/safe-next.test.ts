import assert from "node:assert/strict";
import test from "node:test";
import { safeNext } from "../lib/auth/safe-next";
test("safeNext permits local canonical paths", () => assert.equal(safeNext("/app/explore"), "/app/explore"));
test("safeNext rejects external and protocol-relative values", () => { assert.equal(safeNext("https://bad.example"), "/app"); assert.equal(safeNext("//bad.example"), "/app"); });