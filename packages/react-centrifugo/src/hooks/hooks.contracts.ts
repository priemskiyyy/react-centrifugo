import { expectTypeOf } from "vitest";
import type { Centrifuge } from "centrifuge";
import { useCentrifuge } from "src/hooks/useCentrifuge";
import { useChannel } from "src/hooks/useChannel";
import { createChannelEventHooks } from "src/hooks/createChannelEventHooks";

type Message = { text: string };
type Events = {
  "message.created": { channel: `rooms:${string}`; payload: Message };
  "presence.changed": { channel: "presence"; payload: boolean };
};

const { useChannelEvent } = createChannelEventHooks<Events>({
  decode: () => null,
});

export const useTypeContracts = () => {
  const client = useCentrifuge();
  expectTypeOf(client).toEqualTypeOf<Centrifuge | null>();

  useChannel("rooms:one", (data) => {
    expectTypeOf(data).toEqualTypeOf<unknown>();
  });
  useChannel<Message>("rooms:one", (data) => {
    expectTypeOf(data).toEqualTypeOf<Message>();
  });
  useChannel(
    "rooms:one",
    (data) => {
      expectTypeOf(data).toEqualTypeOf<number>();
    },
    { parse: Number },
  );
  useChannelEvent("rooms:one", "message.created", (data) => {
    expectTypeOf(data).toEqualTypeOf<Message>();
  });
  useChannelEvent("presence", "presence.changed", (data) => {
    expectTypeOf(data).toEqualTypeOf<boolean>();
  });

  // @ts-expect-error A channel cannot widen the selected event type.
  useChannelEvent("presence", "message.created", () => {});
  // @ts-expect-error A callback must consume the selected event's payload.
  useChannelEvent("rooms:one", "message.created", (data: boolean) => {
    return data;
  });
  // @ts-expect-error A parser must produce the declared event payload.
  useChannelEvent("rooms:one", "message.created", () => {}, { parse: Number });
  // @ts-expect-error An explicit wire contract must agree with the parser.
  useChannel<Message>("rooms:one", () => {}, { parse: Number });
};
