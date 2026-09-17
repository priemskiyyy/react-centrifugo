import type React from "react";
import { cva } from "class-variance-authority";
import clsx from "clsx";
import { Planet } from "phosphor-react-native";
import { Pressable, Text, TextInput, View } from "react-native";
import { ConnectionBadge } from "src/components/ConnectionBadge/ConnectionBadge";
import { useScheme } from "src/hooks/useScheme";
import { getToneColor } from "src/utils/getToneColor";
import { haptic } from "src/utils/haptic";

type HeaderProps = {
  endpoint: string;
  roomId: string;
  enabled: boolean;
  onEndpointChange: (endpoint: string) => void;
  onRoomChange: (roomId: string) => void;
  onSessionToggle: () => void;
};

// Font-size-only utilities avoid the lineHeight that offsets iOS input baselines.
const FIELD_CLASS_NAME =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 py-0 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

const sessionButtonStyles = cva(
  "min-h-11 justify-center rounded-lg px-4 active:opacity-70",
  {
    variants: {
      enabled: {
        true: "bg-zinc-900 dark:bg-zinc-100",
        false: "bg-emerald-600",
      },
    },
  },
);
const sessionLabelStyles = cva("text-sm font-semibold text-white", {
  variants: { enabled: { true: "dark:text-zinc-900", false: "" } },
});

export const Header: React.FunctionComponent<HeaderProps> = ({
  endpoint,
  roomId,
  enabled,
  onEndpointChange,
  onRoomChange,
  onSessionToggle,
}) => {
  const scheme = useScheme();

  const handleSessionPress = () => {
    haptic();
    onSessionToggle();
  };

  return (
    <View className="gap-3 border-b border-zinc-200 px-4 pb-4 pt-2 dark:border-zinc-800">
      <View className="flex-row items-center gap-2">
        <Planet
          size={24}
          weight="duotone"
          color={getToneColor("positive", scheme)}
        />
        <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Mission Control
        </Text>
        <View className="ml-auto">
          <ConnectionBadge />
        </View>
      </View>
      <TextInput
        style={{ textAlignVertical: "center" }}
        accessibilityLabel="WebSocket endpoint"
        className={clsx(FIELD_CLASS_NAME, "font-mono text-[12px]")}
        value={endpoint}
        editable={!enabled}
        accessibilityHint="Disconnect before editing the endpoint"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onEndpointChange}
      />
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">
        Disconnect to edit the endpoint. On a phone, use your computer’s LAN
        address.
      </Text>
      <View className="flex-row items-center gap-3">
        <TextInput
          style={{ textAlignVertical: "center" }}
          accessibilityLabel="Room"
          className={clsx(FIELD_CLASS_NAME, "flex-1 text-[14px]")}
          value={roomId}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onRoomChange}
        />
        <Pressable
          accessibilityRole="button"
          onPress={handleSessionPress}
          className={sessionButtonStyles({ enabled })}
        >
          <Text className={sessionLabelStyles({ enabled })}>
            {enabled ? "Disconnect" : "Connect"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
