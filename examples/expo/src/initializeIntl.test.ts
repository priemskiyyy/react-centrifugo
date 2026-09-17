import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

test("shared formatters load when Hermes lacks plural and relative-time formatting", async () => {
  vi.resetModules();
  vi.stubGlobal("Intl", {
    getCanonicalLocales: Intl.getCanonicalLocales,
    Locale: Intl.Locale,
    NumberFormat: Intl.NumberFormat,
    DateTimeFormat: Intl.DateTimeFormat,
  });

  await import("./initializeIntl");
  const { formatRelativeTime } = await import("../../shared/src/formatting");
  const now = Date.parse("2026-09-15T12:00:00Z");
  expect(formatRelativeTime("2026-09-15T11:59:00Z", now)).toBe("1 minute ago");
  expect(formatRelativeTime("2026-09-15T11:58:00Z", now)).toBe("2 minutes ago");
  expect(formatRelativeTime("2026-09-14T12:00:00Z", now)).toBe("yesterday");
});
