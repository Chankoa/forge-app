import assert from "node:assert/strict";
import test from "node:test";
import { authContinuationPath, safeNext } from "../lib/auth/safe-next";
test("safeNext permits local canonical paths", () => assert.equal(safeNext("/app/explore"), "/app/explore"));
test("safeNext rejects external and protocol-relative values", () => { assert.equal(safeNext("https://bad.example"), "/app"); assert.equal(safeNext("//bad.example"), "/app"); });
test("email callback keeps Create and blocks open redirects", () => { assert.equal(authContinuationPath("/app/create?from=public"), "/app/create?from=public"); assert.equal(authContinuationPath("https://evil.test/app/create"), "/app"); assert.equal(authContinuationPath("//evil.test"), "/app"); });
