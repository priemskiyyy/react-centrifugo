import { expect, test, vi } from "vitest";
import { EventLog } from "src/utils/EventLog";

const event = (context: unknown) =>
  ({
    source: "channel",
    channel: "rooms:one",
    type: "publication",
    timestamp: 123,
    context,
  }) satisfies Parameters<EventLog["add"]>[0];

test("retains the newest events with independent IDs and copies payloads immediately", () => {
  const log = new EventLog(2);
  const data = { text: "original" };
  log.add(event({ data }), true);
  data.text = "mutated";
  log.add(event({ data: "second" }), true);
  expect(log.get()[1]?.context).toContain("original");
  expect(new Set(log.get().map((entry) => entry.id)).size).toBe(2);
  log.add(event({ data: "third" }), true);
  expect(log.get()).toHaveLength(2);
  expect(log.get()[0]?.context).toContain("third");
  expect(log.get()[1]?.context).toContain("second");
});

test("updates are batched, limits can shrink, and clearing does not replay queued entries", async () => {
  const log = new EventLog(3);
  const notify = vi.fn();
  const stop = log.subscribe(notify);
  log.add(event(1), false);
  log.add(event(2), false);
  log.setLimit(1);
  expect(log.get()).toHaveLength(1);
  await Promise.resolve();
  expect(notify).toHaveBeenCalledTimes(1);
  log.add(event(3), false);
  log.clear();
  stop();
  await Promise.resolve();
  expect(log.get()).toEqual([]);
  expect(notify).toHaveBeenCalledTimes(1);
});

test.each([
  [0, 1],
  [-1, 1],
  [1.5, 1],
  [Infinity, 1_000],
  [NaN, 200],
  [1_001, 1_000],
])(
  "clamps out-of-range limits instead of throwing: %s -> %s",
  (limit, expected) => {
    const log = new EventLog(limit);
    for (let index = 0; index < 1_001; index += 1) {
      log.add(event(index), false);
    }
    expect(log.get()).toHaveLength(expected);
    log.setLimit(limit);
    expect(log.get()).toHaveLength(expected);
  },
);
