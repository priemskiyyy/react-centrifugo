import { expect, test } from "vitest";
import { getHookNames } from "src/utils/getHookNames";

test("inherited object properties are not hook name overrides", () => {
  expect(getHookNames(["toString", "constructor"])).toEqual([
    { event: "toString", name: "useToString" },
    { event: "constructor", name: "useConstructor" },
  ]);
});

test("rejects filenames that collide on case-insensitive filesystems", () => {
  expect(() => getHookNames(["message", "MESSAGE"])).toThrow("Multiple events");
});
