import { UnauthorizedError } from "centrifuge";
import { expect, test, vi } from "vitest";
import { createScopedCallback } from "src/utils/internal/createScopedCallback";
import { ResourceScope } from "src/utils/internal/ResourceScope";

test("defers execution and forwards arguments and the resolved value", async () => {
  const scope = new ResourceScope();
  const result = { token: "current" };
  const callback = vi.fn(async (channel: string, attempt: number) => {
    expect(channel).toBe("rooms:one");
    expect(attempt).toBe(2);
    return result;
  });
  const invoke = createScopedCallback(callback, scope.isActive);
  const pending = invoke("rooms:one", 2);

  expect(callback).not.toHaveBeenCalled();
  await expect(pending).resolves.toBe(result);
  expect(callback).toHaveBeenCalledTimes(1);
  scope.dispose();
});

test.each(["before scheduling", "after scheduling"])(
  "release %s prevents a queued callback from reading credentials",
  async (when) => {
    const scope = new ResourceScope();
    const callback = vi.fn(async () => "token");
    const invoke = createScopedCallback(callback, scope.isActive);

    if (when === "before scheduling") {
      scope.dispose();
    }

    const pending = invoke();
    scope.dispose();
    await expect(pending).rejects.toBeInstanceOf(UnauthorizedError);
    expect(callback).not.toHaveBeenCalled();
  },
);

test("rejects a result that arrives after the scope ends", async () => {
  const scope = new ResourceScope();
  let resolve: (token: string) => void = () => {
    throw new Error("Credential resolver is not initialized");
  };
  const credentials = new Promise<string>((complete) => {
    resolve = complete;
  });
  const callback = vi.fn(() => credentials);
  const pending = createScopedCallback(callback, scope.isActive)();
  await Promise.resolve();
  expect(callback).toHaveBeenCalledTimes(1);

  scope.dispose();
  resolve("obsolete");
  await expect(pending).rejects.toBeInstanceOf(UnauthorizedError);
});

test("distinguishes a removed callback from a callback that resolves to undefined", async () => {
  const removed = createScopedCallback(
    () => undefined,
    () => true,
  );
  await expect(removed()).rejects.toThrow("callback was removed");

  const emptyData = createScopedCallback(
    async () => undefined,
    () => true,
  );
  await expect(emptyData()).resolves.toBeUndefined();
});

test.each(["throw", "reject"])(
  "preserves the original error from a callback that can %s",
  async (mode) => {
    const failure = new Error("credentials unavailable");
    const callback = createScopedCallback(
      () => {
        if (mode === "throw") {
          throw failure;
        }

        return Promise.reject(failure);
      },
      () => true,
    );

    await expect(callback()).rejects.toBe(failure);
  },
);
