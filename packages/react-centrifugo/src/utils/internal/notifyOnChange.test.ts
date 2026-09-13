import { expect, test, vi } from "vitest";
import { notifyOnChange } from "src/utils/internal/notifyOnChange";

test("captures the initial value without notifying and suppresses unchanged values", () => {
  let value = 0;
  const read = vi.fn(() => value);
  const listener = vi.fn();
  const notify = notifyOnChange(read, listener);

  expect(read).toHaveBeenCalledTimes(1);
  expect(listener).not.toHaveBeenCalled();
  notify();
  value = 1;
  notify();
  notify();
  expect(listener).toHaveBeenCalledTimes(1);
});

test("uses Object.is semantics for NaN, signed zero, and object identity", () => {
  let value: unknown = NaN;
  const listener = vi.fn();
  const notify = notifyOnChange(() => value, listener);

  notify();
  expect(listener).not.toHaveBeenCalled();
  value = 0;
  notify();
  value = -0;
  notify();
  const object = {};
  value = object;
  notify();
  notify();
  value = {};
  notify();
  expect(listener).toHaveBeenCalledTimes(4);
});

test("advances the baseline before callbacks can synchronously notify again", () => {
  let value = 0;
  const observed: number[] = [];
  const notify = notifyOnChange(
    () => value,
    () => {
      observed.push(value);
      notify();

      if (value === 1) {
        value = 2;
        notify();
      }
    },
  );

  value = 1;
  notify();
  notify();
  expect(observed).toEqual([1, 2]);
});

test("a failed listener does not cause the same value to be reported twice", () => {
  let value = 0;
  const failure = new Error("listener failed");
  const listener = vi.fn(() => {
    throw failure;
  });
  const notify = notifyOnChange(() => value, listener);

  value = 1;
  expect(notify).toThrow(failure);
  expect(notify).not.toThrow();
  expect(listener).toHaveBeenCalledTimes(1);
});
