import { expect, test, vi } from "vitest";
import { reportUnhandledError } from "src/utils/internal/reportUnhandledError";

test("reports the original failure in a microtask outside the caller's stack", () => {
  const scheduled: Array<() => void> = [];
  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
    scheduled.push(callback);
  });
  const failure = new Error("publication failed");

  expect(() => reportUnhandledError(failure)).not.toThrow();
  expect(scheduled).toHaveLength(1);
  expect(scheduled[0]).toThrow(failure);
});
