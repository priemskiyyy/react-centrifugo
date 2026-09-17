import type React from "react";
import { useState } from "react";
import { SimulcastDevtools } from "@priemskiyyy/simulcast-devtools/react";
import { CentrifugeProvider } from "react-centrifugo";
import { Dashboard } from "src/components/Dashboard/Dashboard";
import { Header } from "src/components/Header/Header";
import { PublishHint } from "src/components/PublishHint/PublishHint";
import { SharedSubscriptionPanel } from "src/components/SharedSubscriptionPanel/SharedSubscriptionPanel";
import "src/styles.css";

const DEFAULT_ENDPOINT = "ws://localhost:8000/connection/websocket";

export const Application: React.FunctionComponent = () => {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [roomId, setRoomId] = useState("demo");
  const [enabled, setEnabled] = useState(false);
  const [dashboardMounted, setDashboardMounted] = useState(true);

  return (
    // The session ID carries the endpoint, so changing it starts a new session.
    <CentrifugeProvider
      configuration={{
        session: { id: endpoint, enabled },
        transport: endpoint,
      }}
    >
      <Header
        endpoint={endpoint}
        roomId={roomId}
        enabled={enabled}
        onEndpointChange={setEndpoint}
        onRoomChange={setRoomId}
        onSessionToggle={() => setEnabled((current) => !current)}
      />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <SharedSubscriptionPanel
          roomId={roomId}
          dashboardMounted={dashboardMounted}
          onDashboardToggle={() => setDashboardMounted((current) => !current)}
        />
        {dashboardMounted ? <Dashboard key={roomId} roomId={roomId} /> : null}
        <PublishHint />
      </main>
      <SimulcastDevtools />
    </CentrifugeProvider>
  );
};
