// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { Centrifuge } from "centrifuge";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { CentrifugeProvider } from "src/context/CentrifugeProvider";
import { useChannel } from "src/hooks/useChannel";
import { useChannelStatus } from "src/hooks/useChannelStatus";
import { useConnectionState } from "src/hooks/useConnectionState";
import { useCentrifuge } from "src/hooks/useCentrifuge";

test("SSR is inert and hydrates from the same snapshots before connecting", async () => {
  const connect = vi
    .spyOn(Centrifuge.prototype, "connect")
    .mockImplementation(() => {});
  const onRecoverableError = vi.fn();
  const clients: Array<Centrifuge | null> = [];
  const Status = () => {
    useChannel("rooms:one", () => {});
    const connection = useConnectionState();
    const channel = useChannelStatus("rooms:one");
    const client = useCentrifuge();
    clients.push(client);
    const availability = client === null ? "inactive" : "active";
    return <span>{`${connection}/${channel.state}/${availability}`}</span>;
  };
  const view = (
    <CentrifugeProvider
      configuration={{
        session: { id: "ssr" },
        transport: "ws://localhost:8000",
      }}
    >
      <Status />
    </CentrifugeProvider>
  );
  const html = renderToString(view);
  expect(html).toContain("disconnected/detached/inactive");
  expect(clients).toEqual([null]);
  expect(connect).not.toHaveBeenCalled();
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  let root: ReturnType<typeof hydrateRoot> | undefined;

  try {
    await act(async () => {
      root = hydrateRoot(container, view, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(clients[1]).toBeNull();
    expect(clients.at(-1)).toBeInstanceOf(Centrifuge);
    expect(container.textContent).toBe("disconnected/subscribing/active");
  } finally {
    act(() => root?.unmount());
    container.remove();
  }
});
