import type React from "react";
import type { Tone } from "example-shared";
import type { Icon } from "phosphor-react-native";
import { Text, View } from "react-native";
import { useScheme } from "src/hooks/useScheme";
import { toneContainerStyles } from "src/utils/toneContainerStyles";
import { cva } from "class-variance-authority";
import clsx from "clsx";
import { getToneColor } from "src/utils/getToneColor";

const badgeTextStyles = cva("text-xs font-medium", {
  variants: {
    tone: {
      neutral: "text-zinc-700 dark:text-zinc-300",
      positive: "text-emerald-700 dark:text-emerald-300",
      warning: "text-amber-800 dark:text-amber-300",
      danger: "text-rose-700 dark:text-rose-300",
    } satisfies Record<Tone, string>,
  },
});

type BadgeProps = {
  tone: Tone;
  icon?: Icon;
  children: string;
};

export const Badge: React.FunctionComponent<BadgeProps> = ({
  tone,
  icon: BadgeIcon,
  children,
}) => {
  const scheme = useScheme();

  return (
    <View
      className={clsx(
        "flex-row items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        toneContainerStyles({ tone }),
      )}
    >
      {BadgeIcon === undefined ? null : (
        <BadgeIcon size={12} weight="bold" color={getToneColor(tone, scheme)} />
      )}
      <Text className={badgeTextStyles({ tone })}>{children}</Text>
    </View>
  );
};
