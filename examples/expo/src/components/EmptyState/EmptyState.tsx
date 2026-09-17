import type React from "react";
import type { Icon } from "phosphor-react-native";
import { Text, View } from "react-native";

type EmptyStateProps = {
  icon: Icon;
  title: string;
  description: string;
};

export const EmptyState: React.FunctionComponent<EmptyStateProps> = ({
  icon: EmptyIcon,
  title,
  description,
}) => (
  <View className="items-center gap-1.5 px-4 py-6">
    <EmptyIcon size={28} weight="thin" color="#a1a1aa" />
    <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
      {title}
    </Text>
    <Text className="text-center text-xs text-zinc-500 dark:text-zinc-400">
      {description}
    </Text>
  </View>
);
