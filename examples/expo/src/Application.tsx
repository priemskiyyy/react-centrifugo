import type React from "react";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { CentrifugeProvider } from "react-centrifugo";
import { Dashboard } from "src/components/Dashboard/Dashboard";
import { Header } from "src/components/Header/Header";
import { PublishHint } from "src/components/PublishHint/PublishHint";
import { useAppActive } from "src/hooks/useAppActive";
import "src/global.css";

const DEFAULT_ENDPOINT = "ws://localhost:8000/connection/websocket";

export const Application: React.FunctionComponent = () => {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [roomId, setRoomId] = useState("demo");
  const [enabled, setEnabled] = useState(false);
  const isAppActive = useAppActive();

  return (
    <SafeAreaProvider>
      {/* The session ID carries the endpoint, so changing it starts a new session. */}
      <CentrifugeProvider
        configuration={{
          session: { id: endpoint, enabled: enabled && isAppActive },
          transport: endpoint,
        }}
      >
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
          <StatusBar style="auto" />
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="mx-auto w-full max-w-3xl gap-4 p-4"
            automaticallyAdjustKeyboardInsets
            nestedScrollEnabled={false}
            keyboardShouldPersistTaps="handled"
          >
            <Header
              endpoint={endpoint}
              roomId={roomId}
              enabled={enabled}
              onEndpointChange={setEndpoint}
              onRoomChange={setRoomId}
              onSessionToggle={() => setEnabled((current) => !current)}
            />
            <View key={roomId}>
              <Dashboard roomId={roomId} />
            </View>
            <PublishHint />
          </ScrollView>
        </SafeAreaView>
      </CentrifugeProvider>
    </SafeAreaProvider>
  );
};
