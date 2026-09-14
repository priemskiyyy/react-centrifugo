// @vitest-environment jsdom
import { StrictMode, useEffect } from "react";
import { renderToString } from "react-dom/server";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Centrifuge } from "centrifuge";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  CentrifugeProvider,
  useCentrifuge,
  useChannel,
} from "react-centrifugo";
import { ReactCentrifugoDevtools } from "src/components/ReactCentrifugoDevtools";

beforeEach(() => {
  vi.spyOn(Centrifuge.prototype, "connect").mockImplementation(() => {});
});
afterEach(cleanup);

const Consumer = () => {
  useChannel("rooms:one", () => {});
  return null;
};

const Probe = ({
  onClient,
}: {
  onClient: (client: Centrifuge | null) => void;
}) => {
  const client = useCentrifuge();
  useEffect(() => onClient(client), [client, onClient]);
  return null;
};

const setup = () => {
  let current: Centrifuge | null = null;
  const onClient = (client: Centrifuge | null) => {
    current = client;
  };
  const View = ({
    consumer = true,
    devtools = true,
  }: {
    consumer?: boolean;
    devtools?: boolean;
  }) => (
    <StrictMode>
      <CentrifugeProvider
        configuration={{ session: { id: "test" }, transport: "ws://localhost" }}
      >
        <Probe onClient={onClient} />
        {consumer ? <Consumer /> : null}
        {devtools ? (
          <ReactCentrifugoDevtools initialIsOpen maxEvents={5} />
        ) : null}
      </CentrifugeProvider>
    </StrictMode>
  );
  const view = render(<View />);
  const client = () => {
    if (current === null) throw new Error("Missing client");
    return current;
  };
  const publish = async (text: string) => {
    await act(async () => {
      client()
        .getSubscription("rooms:one")
        ?.emit("publication", {
          channel: "rooms:one",
          data: { text, token: "hidden-token" },
        });
    });
  };
  return { view, View, client, publish };
};

test("the panel observes the same provider and cannot retain its last subscription", async () => {
  const { view, View, client, publish } = setup();
  expect(
    screen.getByRole("complementary", { name: "React Centrifugo devtools" }),
  ).toBeTruthy();
  expect(Object.keys(client().subscriptions())).toEqual(["rooms:one"]);
  await publish("hidden-payload");
  expect(screen.getByText("publication")).toBeTruthy();
  expect(document.body.textContent).not.toContain("hidden-payload");
  expect(document.body.textContent).not.toContain("hidden-token");
  await act(async () => view.rerender(<View consumer={false} />));
  expect(client().subscriptions()).toEqual({});
  expect(screen.getByText(/No channel listeners yet/)).toBeTruthy();
  view.unmount();
});

test("payload capture, filtering, pause, and clear operate only on the timeline", async () => {
  const { view, client, publish } = setup();
  fireEvent.click(screen.getByLabelText("Capture payloads"));
  await publish("visible-payload");
  expect(document.body.textContent).toContain("visible-payload");
  expect(document.body.textContent).not.toContain("hidden-token");
  fireEvent.change(screen.getByLabelText("Filter events"), {
    target: { value: "no-match" },
  });
  expect(screen.getByText("No matching events")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(document.body.textContent).toContain("visible-payload");
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  await publish("paused-message");
  expect(document.body.textContent).not.toContain("paused-message");
  expect(Object.keys(client().subscriptions())).toEqual(["rooms:one"]);
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Clear" })),
  );
  expect(screen.getByText("Recording paused")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  await publish("resumed-message");
  expect(document.body.textContent).toContain("resumed-message");
  view.unmount();
});

test("unmounting devtools releases its native listener and keeps application delivery", async () => {
  const { view, View, client } = setup();
  const subscription = client().getSubscription("rooms:one");
  expect(subscription?.listeners("publication")).toHaveLength(2);
  await act(async () => view.rerender(<View devtools={false} />));
  expect(subscription?.listeners("publication")).toHaveLength(1);
  expect(Object.keys(client().subscriptions())).toEqual(["rooms:one"]);
  view.unmount();
  expect(subscription?.listeners("publication")).toHaveLength(0);
});

test("server rendering has a stable empty snapshot and opens no connections", () => {
  const html = renderToString(
    <CentrifugeProvider
      configuration={{ session: { id: "server" }, transport: "ws://localhost" }}
    >
      <ReactCentrifugoDevtools initialIsOpen />
    </CentrifugeProvider>,
  );
  expect(html).toContain("Waiting for events");
  expect(Centrifuge.prototype.connect).not.toHaveBeenCalled();
});
