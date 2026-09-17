import type React from "react";
import type { Icon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useScheme } from "src/hooks/useScheme";
import { getToneColor } from "src/utils/getToneColor";

type PanelProps = {
  title: string;
  icon: Icon;
  aside?: ReactNode;
  children: ReactNode;
};

export const Panel: React.FunctionComponent<PanelProps> = ({
  title,
  icon: PanelIcon,
  aside,
  children,
}) => {
  const scheme = useScheme();

  return (
    <View
      accessibilityLabel={title}
      className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <View className="mb-3 flex-row items-center gap-2">
        <PanelIcon
          size={18}
          weight="duotone"
          color={getToneColor("positive", scheme)}
        />
        <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          {title}
        </Text>
        <View className="ml-auto flex-row items-center gap-2">{aside}</View>
      </View>
      {children}
    </View>
  );
};
