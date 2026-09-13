import { beforeEach, expect, test, vi } from "vitest";
import { invokeIsolated } from "src/utils/internal/invokeIsolated";
import { reportUnhandledError } from "src/utils/internal/reportUnhandledError";

vi.mock("src/utils/internal/reportUnhandledError", () => ({
  reportUnhandledError: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(reportUnhandledError).mockClear();
});

test("invokes successful handlers synchronously and accepts successful promises", async () => {
  const syncHandler = vi.fn();
  const asyncHandler = vi.fn(() => Promise.resolve("handled"));
  expect(invokeIsolated(syncHandler)).toBeUndefined();
  expect(invokeIsolated(asyncHandler)).toBeUndefined();
  expect(syncHandler).toHaveBeenCalledTimes(1);
  expect(asyncHandler).toHaveBeenCalledTimes(1);
  await Promise.resolve();
  expect(reportUnhandledError).not.toHaveBeenCalled();
});

test.each(["throw", "reject"])(
  "reports a handler %s without interrupting the caller",
  async (mode) => {
    const failure = new Error("handler failed");
    const handler = () => {
      if (mode === "throw") {
        throw failure;
      }

      return Promise.reject(failure);
    };

    expect(() => invokeIsolated(handler)).not.toThrow();
    const next = vi.fn();
    invokeIsolated(next);
    await Promise.resolve();
    expect(next).toHaveBeenCalledTimes(1);
    expect(reportUnhandledError).toHaveBeenCalledExactlyOnceWith(failure);
  },
);
