import { expect, test } from "vitest";
import { renderHooks } from "src/utils/renderHooks";

test.each([
  ["ts", "js"],
  ["tsx", "js"],
  ["mts", "mjs"],
  ["cts", "cjs"],
  ["d.mts", "mjs"],
])(
  "preserves TypeScript module format for %s imports",
  (sourceExtension, outputExtension) => {
    const files = renderHooks(
      {
        events: { file: `/project/events.${sourceExtension}`, type: "Events" },
        dispatcher: {
          file: `/project/runtime.${sourceExtension}`,
          export: "useChannelEvent",
        },
        output: "/project/generated",
      },
      ["message.created"],
    );
    expect(files.get("useMessageCreated.ts")).toContain(
      `from "../events.${outputExtension}"`,
    );
    expect(files.get("useMessageCreated.ts")).toContain(
      `from "../runtime.${outputExtension}"`,
    );
  },
);
