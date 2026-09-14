import type { RealtimeDiagnosticEvent } from "react-centrifugo/devtools";
import { expect, test, vi } from "vitest";
import { describeContext } from "src/utils/describeContext";

const event = (
  context: unknown,
  overrides: Partial<RealtimeDiagnosticEvent> = {},
): RealtimeDiagnosticEvent => ({
  source: "channel",
  channel: "rooms:one",
  type: "publication",
  timestamp: 0,
  context,
  ...overrides,
});
const format = (context: unknown, capturePayloads: boolean) =>
  describeContext(event(context), capturePayloads).context;

test("payload capture is explicit and sensitive property names stay redacted", () => {
  const context = {
    offset: 3,
    data: {
      text: "hello",
      accessToken: "secret-value",
      nested: { password: "secret-password" },
    },
  };
  expect(format(context, false)).toContain("Payload capture is off");
  expect(format(context, false)).not.toContain("hello");
  expect(format(context, true)).toContain("hello");
  expect(format(context, true)).not.toContain("secret-value");
  expect(format(context, true)).not.toContain("secret-password");
});

test("inspection does not invoke getters, toJSON, or custom coercion", () => {
  const getter = vi.fn(() => {
    throw new Error("getter invoked");
  });
  const toJSON = vi.fn(() => {
    throw new Error("toJSON invoked");
  });
  const context = { toJSON, id: 1n };
  Object.defineProperty(context, "accessor", { enumerable: true, get: getter });
  const text = format(context, true);
  expect(text).toContain("[Accessor]");
  expect(text).toContain("1n");
  expect(getter).not.toHaveBeenCalled();
  expect(toJSON).not.toHaveBeenCalled();
});

test("cycles, deep values, wide arrays, and long text stay bounded", () => {
  const value: { self?: unknown } = {};
  value.self = value;
  expect(format(value, true)).toContain("Circular");
  const wide = Array.from({ length: 1_000 }, () => "x".repeat(20_000));
  expect(format(wide, true).length).toBeLessThan(12_100);
  expect(format(wide, true)).toContain("Truncated");
  expect(format(undefined, true)).toBe("undefined");
  expect(format(null, true)).toBe("null");
});

test("uninspectable proxies cannot interrupt publication delivery", () => {
  const proxy = new Proxy(
    {},
    {
      ownKeys: () => {
        throw new Error("blocked");
      },
    },
  );
  expect(describeContext(event(proxy), true)).toEqual({
    context: "[Unable to inspect this value]",
    summary: "",
    kind: "PUBLICATION",
  });
});

test("rows summarize their context and are classified by source, type, and code", () => {
  const client = (type: string, context: unknown) =>
    describeContext(
      event(context, { source: "client", channel: null, type }),
      false,
    );
  expect(
    client("disconnected", { code: 3500, reason: "invalid token" }),
  ).toMatchObject({ summary: "invalid token (3500)", kind: "ERROR" });
  expect(
    client("disconnected", { code: 0, reason: "disconnect called" }),
  ).toMatchObject({ summary: "disconnect called", kind: "LIFECYCLE" });
  expect(
    describeContext(
      event({ code: 2, reason: "client closed" }, { type: "unsubscribed" }),
      false,
    ).kind,
  ).toBe("LIFECYCLE");
  expect(
    client("error", {
      type: "transport",
      error: { code: 1, message: "transport closed" },
    }),
  ).toMatchObject({ summary: "transport closed (1)", kind: "ERROR" });
  expect(
    client("connected", { client: "c1", transport: "websocket" }),
  ).toMatchObject({ summary: "websocket", kind: "LIFECYCLE" });
  expect(
    describeContext(
      event(
        { id: "session-1" },
        { source: "runtime", type: "session.started" },
      ),
      false,
    ),
  ).toMatchObject({ summary: "session-1", kind: "RUNTIME" });
  const publication = { data: { text: "hi", token: "x" }, offset: 4 };
  expect(describeContext(event(publication), false)).toMatchObject({
    summary: "offset 4",
    kind: "PUBLICATION",
  });
  expect(describeContext(event(publication), true).summary).toBe(
    '{"text":"hi","token":"[Redacted]"} · offset 4',
  );
});
