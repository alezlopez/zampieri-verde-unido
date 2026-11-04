import { describe, expect, test } from "bun:test";
import { allowedSetores, createPermissionRequestGuard } from "./auth-permissions";

describe("administrative permission loading", () => {
  test("matricula remains available for Cristiane and Mariana's assigned sectors", () => {
    expect(allowedSetores([
      { data: true }, { data: false }, { data: true }, { data: true }, { data: false },
    ])).toEqual(["eventos", "portaria", "matricula"]);
  });

  test("an old session cannot overwrite the current permission result", () => {
    const guard = createPermissionRequestGuard();
    const oldRequest = guard.begin();
    const currentRequest = guard.begin();
    expect(oldRequest()).toBe(false);
    expect(currentRequest()).toBe(true);
  });

  test("sign out invalidates pending permission responses", () => {
    const guard = createPermissionRequestGuard();
    const pending = guard.begin();
    guard.invalidate();
    expect(pending()).toBe(false);
  });

  test("failed or non-boolean responses do not grant matricula", () => {
    expect(allowedSetores([
      { data: false }, { data: false }, { data: false }, { data: true, error: new Error("denied") },
    ])).toEqual([]);
  });
});