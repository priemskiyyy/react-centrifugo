import { createTestSessionConfiguration } from "src/utils/tests/createTestSessionConfiguration";
import { once } from "node:events";
import { expect, test, vi } from "vitest";
import { WebSocket, WebSocketServer } from "ws";
import { RealtimeClientStore } from "src/utils/RealtimeClientStore";
import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";

type Command = {
  id: number;
  connect?: { token?: string; data?: { locale: string } };
  subscribe?: {
    channel: string;
    recover?: boolean;
    offset?: number;
    epoch?: string;
  };
  unsubscribe?: { channel: string };
};

test("the real SDK connects, delivers publications, recovers, and unsubscribes over WebSocket", async () => {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected an ephemeral TCP port");
  }
  const commands: Command[] = [];
  const sockets: WebSocket[] = [];
  server.on("connection", (socket) => {
    sockets.push(socket);
    socket.on("message", (buffer) => {
      buffer
        .toString()
        .split("\n")
        .filter(Boolean)
        .forEach((line) => {
          const command = JSON.parse(line) as Command;
          commands.push(command);
          if (command.connect !== undefined) {
            if (sockets.length === 2) {
              socket.send(
                JSON.stringify({
                  id: command.id,
                  error: { code: 109, message: "token expired" },
                }),
              );
              return;
            }
            socket.send(
              JSON.stringify({
                id: command.id,
                connect: {
                  client: `client-${sockets.length}`,
                  version: "fixture",
                },
              }),
            );
            return;
          }
          if (command.subscribe !== undefined) {
            socket.send(
              JSON.stringify({
                id: command.id,
                subscribe: {
                  recoverable: true,
                  positioned: true,
                  epoch: "epoch",
                  offset: command.subscribe.offset ?? 0,
                  recovered: command.subscribe.recover ?? false,
                },
              }),
            );
            return;
          }
          if (command.unsubscribe !== undefined) {
            socket.send(JSON.stringify({ id: command.id, unsubscribe: {} }));
          }
        });
    });
  });
  const store = new RealtimeClientStore();
  const connecting = vi.fn();
  const connected = vi.fn();
  const disconnected = vi.fn();
  const stopClientEvents = [
    store.api.client.events.subscribe("connecting", connecting),
    store.api.client.events.subscribe("connected", connected),
    store.api.client.events.subscribe("disconnected", disconnected),
  ];
  const publication = vi.fn();
  const subscribed = vi.fn();
  const unsubscribe = store.api.channels
    .get("rooms:one")
    .events.subscribe("publication", publication);
  const stopSubscribed = store.api.channels
    .get("rooms:one")
    .events.subscribe("subscribed", subscribed);
  let token = "first-token";
  let locale = "en";
  const configuration: CentrifugeConfiguration = {
    session: { id: "test" },
    transport: `ws://127.0.0.1:${address.port}`,
    options: {
      websocket: WebSocket,
      getToken: async () => token,
      getData: async () => ({ locale }),
      minReconnectDelay: 1,
      maxReconnectDelay: 1,
    },
  };
  const stop = store.session.set(createTestSessionConfiguration(configuration));

  try {
    await vi.waitFor(() =>
      expect(store.api.channels.get("rooms:one").status.get().state).toBe(
        "subscribed",
      ),
    );
    expect(commands.find((command) => command.connect)?.connect).toMatchObject({
      token: "first-token",
      data: { locale: "en" },
    });
    const client = store.api.client.get();
    const subscription = client?.getSubscription("rooms:one");
    expect(connected).toHaveBeenCalledExactlyOnceWith({
      client: "client-1",
      transport: "websocket",
    });
    const socket = sockets[0];
    if (socket === undefined) {
      throw new Error("Expected a connected socket");
    }
    socket.send(
      JSON.stringify({
        push: {
          channel: "rooms:one",
          pub: { data: { text: "hello" }, offset: 7 },
        },
      }),
    );
    await vi.waitFor(() =>
      expect(publication).toHaveBeenCalledWith(
        expect.objectContaining({ data: { text: "hello" }, offset: 7 }),
      ),
    );

    token = "fresh-token";
    locale = "de";
    socket.close(3005, "connection expired");
    await vi.waitFor(() => expect(subscribed).toHaveBeenCalledTimes(2));
    expect(
      commands.filter((command) => command.connect).at(-1)?.connect,
    ).toMatchObject({ token: "fresh-token", data: { locale: "de" } });
    expect(
      commands.filter((command) => command.subscribe).at(-1)?.subscribe,
    ).toMatchObject({ recover: true, offset: 7, epoch: "epoch" });
    expect(connected).toHaveBeenCalledTimes(2);
    expect(connecting.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(disconnected).not.toHaveBeenCalled();
    expect(store.api.client.get()).toBe(client);
    expect(client?.getSubscription("rooms:one")).toBe(subscription);

    unsubscribe();
    expect(store.api.client.get()?.getSubscription("rooms:one")).not.toBeNull();
    stopSubscribed();
    await vi.waitFor(() =>
      expect(
        commands.some(
          (command) => command.unsubscribe?.channel === "rooms:one",
        ),
      ).toBe(true),
    );
    expect(store.api.client.get()?.getSubscription("rooms:one")).toBeNull();
    client?.disconnect();
    expect(disconnected).toHaveBeenCalledExactlyOnceWith({
      code: 0,
      reason: "disconnect called",
    });
    expect(store.api.connection.get()).toBe("disconnected");
    expect(store.api.client.get()).toBe(client);
  } finally {
    unsubscribe();
    stopSubscribed();
    stop();
    stopClientEvents.forEach((cleanup) => cleanup());
    server.clients.forEach((socket) => socket.terminate());
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
