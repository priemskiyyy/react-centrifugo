import type React from "react";
import { formatConnectionState, getConnectionTone } from "example-shared";
import { CircleNotch, Plugs, PlugsConnected } from "phosphor-react-native";
import { useConnectionState } from "react-centrifugo";
import { match } from "ts-pattern";
import { Badge } from "src/components/Badge/Badge";

export const ConnectionBadge: React.FunctionComponent = () => {
  const connection = useConnectionState();
  const icon = match(connection)
    .with("connected", () => PlugsConnected)
    .with("connecting", () => CircleNotch)
    .with("disconnected", () => Plugs)
    .exhaustive();

  return (
    <Badge tone={getConnectionTone(connection)} icon={icon}>
      {formatConnectionState(connection)}
    </Badge>
  );
};
