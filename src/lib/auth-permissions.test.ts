/// <reference types="node" />
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { allowedSetores, createPermissionRequestGuard } from "./auth-permissions";

describe("administrative permission loading", () => {
  test("matricula remains available for Cristiane and Mariana's assigned sectors", () => {
    assert.deepEqual(allowedSetores([
      { data: true }, { data: false }, { data: true }, { data: true }, { data: false },
    ]), ["eventos", "portaria", "matricula"]);
  });

  test("an old session cannot overwrite the current permission result", () => {
    const guard = createPermissionRequestGuard();
    const oldRequest = guard.begin();
    const currentRequest = guard.begin();
    assert.equal(oldRequest(), false);
    assert.equal(currentRequest(), true);
  });

  test("sign out invalidates pending permission responses", () => {
    const guard = createPermissionRequestGuard();
    const pending = guard.begin();
    guard.invalidate();
    assert.equal(pending(), false);
  });

  test("failed or non-boolean responses do not grant matricula", () => {
    assert.deepEqual(allowedSetores([
      { data: false }, { data: false }, { data: false }, { data: true, error: new Error("denied") },
    ]), []);
  });
});