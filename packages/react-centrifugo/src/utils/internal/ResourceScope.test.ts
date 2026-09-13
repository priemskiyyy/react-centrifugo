import { expect, test, vi } from "vitest";
import { ResourceScope } from "src/utils/internal/ResourceScope";

test("scope methods remain bound when passed as callbacks", () => {
  const { setup, addCleanup, adopt, dispose, isActive } = new ResourceScope();
  const child = new ResourceScope();
  const cleanup = vi.fn();
  const resource = setup(() => {
    addCleanup(() => cleanup("parent"));
    return "resource";
  });
  child.addCleanup(() => cleanup("child"));
  adopt(child);

  expect(isActive()).toBe(true);
  expect(resource).toBe("resource");
  dispose();
  dispose();

  expect(isActive()).toBe(false);
  expect(child.isActive()).toBe(false);
  expect(cleanup.mock.calls).toEqual([["child"], ["parent"]]);
});

test("adopted scopes cascade cleanup and release their parent registration when ended early", () => {
  const parent = new ResourceScope();
  const early = new ResourceScope();
  const child = new ResourceScope();
  const descendant = new ResourceScope();
  const disposeEarly = vi.spyOn(early, "dispose");
  const cleanup = vi.fn();
  parent.addCleanup(() => cleanup("parent"));
  early.addCleanup(() => cleanup("early"));
  child.addCleanup(() => cleanup("child"));
  descendant.addCleanup(() => cleanup("descendant"));
  parent.adopt(early);
  const stopChild = parent.adopt(child);
  child.adopt(descendant);

  early.dispose();
  expect(disposeEarly).toHaveBeenCalledTimes(1);
  expect(parent.isActive()).toBe(true);
  expect(early.isActive()).toBe(false);
  disposeEarly.mockClear();
  parent.dispose();
  stopChild();
  parent.dispose();

  expect(disposeEarly).not.toHaveBeenCalled();
  expect(parent.isActive()).toBe(false);
  expect(child.isActive()).toBe(false);
  expect(descendant.isActive()).toBe(false);
  expect(cleanup.mock.calls).toEqual([
    ["early"],
    ["descendant"],
    ["child"],
    ["parent"],
  ]);
});

test.each(["parent", "child"])(
  "adopting after the %s has ended leaves no active child or retained cleanup",
  (ended) => {
    const parent = new ResourceScope();
    const child = new ResourceScope();
    const cleanup = vi.fn();
    child.addCleanup(cleanup);

    if (ended === "parent") {
      parent.dispose();
    } else {
      child.dispose();
    }

    const stop = parent.adopt(child);
    expect(child.isActive()).toBe(false);
    expect(parent.isActive()).toBe(ended !== "parent");
    parent.dispose();
    stop();

    expect(cleanup).toHaveBeenCalledTimes(1);
  },
);

test("a failed child cleanup still releases the rest of its parent's resources", () => {
  const parent = new ResourceScope();
  const child = new ResourceScope();
  const cleanup = vi.fn();
  const failure = new Error("child cleanup failed");
  parent.addCleanup(cleanup);
  child.addCleanup(() => {
    throw failure;
  });
  parent.adopt(child);

  expect(parent.dispose).toThrow(failure);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(parent.isActive()).toBe(false);
  expect(child.isActive()).toBe(false);
  expect(parent.dispose).not.toThrow();
});

test("a scope releases resources in reverse order and allows early release", () => {
  const scope = new ResourceScope();
  const cleanup = vi.fn();
  scope.addCleanup(() => cleanup("first"));
  const release = scope.addCleanup(() => cleanup("second"));
  scope.addCleanup(() => {
    expect(scope.isActive()).toBe(false);
    cleanup("third");
  });

  release();
  release();
  scope.dispose();
  scope.dispose();
  scope.addCleanup(() => cleanup("late"));

  expect(cleanup.mock.calls).toEqual([
    ["second"],
    ["third"],
    ["first"],
    ["late"],
  ]);
});

test("a failed cleanup cannot prevent the remaining resources from being released", () => {
  const scope = new ResourceScope();
  const cleanup = vi.fn();
  const firstError = new Error("first cleanup failed");
  const secondError = new Error("second cleanup failed");
  scope.addCleanup(cleanup);
  scope.addCleanup(() => {
    throw firstError;
  });
  scope.addCleanup(() => {
    throw secondError;
  });

  expect(() => scope.dispose()).toThrow(
    new AggregateError([secondError, firstError], "Resource cleanup failed."),
  );
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(scope.isActive()).toBe(false);
  expect(() => scope.dispose()).not.toThrow();
});

test("failed setup releases registered resources and preserves the original error", () => {
  const scope = new ResourceScope();
  const failure = new Error("setup failed");
  const cleanup = vi.fn();

  expect(() =>
    scope.setup(() => {
      scope.addCleanup(cleanup);
      throw failure;
    }),
  ).toThrow(failure);
  expect(scope.isActive()).toBe(false);
  expect(cleanup).toHaveBeenCalledTimes(1);
  scope.dispose();
  expect(cleanup).toHaveBeenCalledTimes(1);
});

test("a rollback failure preserves both setup and cleanup errors and completes other cleanups", () => {
  const scope = new ResourceScope();
  const setupFailure = new Error("setup failed");
  const cleanupFailure = new Error("cleanup failed");
  const cleanup = vi.fn();
  let reported: unknown;

  try {
    scope.setup(() => {
      scope.addCleanup(cleanup);
      scope.addCleanup(() => {
        throw cleanupFailure;
      });
      throw setupFailure;
    });
  } catch (error) {
    reported = error;
  }

  expect(reported).toBeInstanceOf(AggregateError);
  if (!(reported instanceof AggregateError)) {
    throw new Error("Expected both failures");
  }
  expect(reported.errors).toEqual([setupFailure, cleanupFailure]);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(scope.isActive()).toBe(false);
});
