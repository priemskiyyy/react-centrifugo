import { CodegenFailure } from "src/errors/CodegenFailure";

export const getHookNames = (
  events: string[],
  overrides: Record<string, string> = {},
) => {
  const names = new Set<string>();

  Object.keys(overrides).forEach((event) => {
    if (!events.includes(event)) {
      throw new CodegenFailure(
        `Hook name override refers to unknown event "${event}".`,
      );
    }
  });

  return events.map((event) => {
    const defaultName = `use${event
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join("")}`;
    const override = Object.hasOwn(overrides, event)
      ? overrides[event]
      : undefined;
    const name = override ?? defaultName;

    if (!/^use[A-Z][a-zA-Z0-9]*$/.test(name)) {
      throw new CodegenFailure(
        `Cannot generate a valid hook name for "${event}". Add a hookNames override.`,
      );
    }

    // Compared case-insensitively: these become filenames, and a case-insensitive
    // filesystem would silently overwrite one hook with another.
    if (names.has(name.toLowerCase())) {
      throw new CodegenFailure(
        `Multiple events generate the hook name "${name}". Add a hookNames override for one of them.`,
      );
    }

    names.add(name.toLowerCase());
    return { event, name };
  });
};
