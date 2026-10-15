import assert from "node:assert/strict";
import test from "node:test";
import { appendToast, removeToast, type ToastMessage } from "../lib/ui/toast";

const toast = (id: number): ToastMessage => ({ id, message: `Message ${id}`, kind: "success" });

test("shared toast queue retains only the three most recent transient notices", () => {
  assert.deepEqual(appendToast([toast(1), toast(2), toast(3)], toast(4)).map(({ id }) => id), [2, 3, 4]);
});

test("toast dismissal removes only the selected notice", () => {
  assert.deepEqual(removeToast([toast(1), toast(2), toast(3)], 2).map(({ id }) => id), [1, 3]);
});
