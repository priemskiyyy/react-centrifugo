import { expect, test } from "vitest";
import { formatEventTime } from "src/formatting/formatEventTime";

test("renders wall-clock time with milliseconds", () => {
  expect(formatEventTime(Date.UTC(2026, 8, 14, 16, 50, 39, 234))).toMatch(
    /^\d{2}:\d{2}:\d{2}[.,]234$/,
  );
});
