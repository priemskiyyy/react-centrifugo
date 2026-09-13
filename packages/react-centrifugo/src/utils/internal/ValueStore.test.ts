import { expect, test, vi } from "vitest";
import { ValueStore } from "src/utils/internal/ValueStore";

test("value methods stay bound and unchanged snapshots do not notify", () => {
  const value = new ValueStore(0);
  const { get, subscribe, set } = value;
  const listener = vi.fn();
  const stop = subscribe(listener);
  set(1);
  set(1);
  expect(get()).toBe(1);
  expect(listener).toHaveBeenCalledTimes(1);
  stop();
  stop();
  set(2);
  expect(listener).toHaveBeenCalledTimes(1);
});

test("removed listeners are skipped and listeners added during notification wait for the next change", () => {
  const value = new ValueStore(0);
  const later = vi.fn();
  const removed = vi.fn();
  let stopLater = () => {};
  const stopFirst = value.subscribe(() => {
    stopFirst();
    stopRemoved();
    stopLater();
    stopLater = value.subscribe(later);
  });
  const stopRemoved = value.subscribe(removed);
  value.set(1);
  expect(removed).not.toHaveBeenCalled();
  expect(later).not.toHaveBeenCalled();
  value.set(2);
  expect(later).toHaveBeenCalledTimes(1);
  stopLater();
});

test.each([2, 0])(
  "nested updates deliver the latest snapshot %s once to later listeners",
  (latest) => {
    const value = new ValueStore(0);
    const first: number[] = [];
    const second: number[] = [];
    value.subscribe(() => {
      first.push(value.get());
      if (value.get() === 1) {
        value.set(latest);
      }
    });
    value.subscribe(() => second.push(value.get()));
    value.set(1);
    expect(first).toEqual([1, latest]);
    expect(second).toEqual([latest]);
  },
);

test("snapshot listener failures leave later listeners and future updates intact", () => {
  const errors: Array<() => void> = [];
  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
    errors.push(callback);
  });
  const value = new ValueStore(0);
  const failure = new Error("listener failed");
  value.subscribe(() => {
    throw failure;
  });
  const listener = vi.fn();
  value.subscribe(listener);
  value.set(1);
  value.set(2);
  expect(listener).toHaveBeenCalledTimes(2);
  expect(errors).toHaveLength(2);
  expect(errors[0]).toThrow(failure);
});
