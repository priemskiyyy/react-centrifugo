/**
 * Copies a live SDK context into plain, size-bounded data. Reads own property
 * descriptors so getters, toJSON, and proxies never run. Redacts sensitive keys
 * and hides payloads unless capture is on.
 */
export const inspectContext = (context: unknown, capturePayloads: boolean) => {
  const seen = new WeakSet<object>();
  let remaining = 200;

  const inspect = (value: unknown, depth: number): unknown => {
    remaining -= 1;

    if (remaining < 0 || depth > 6) {
      return "[Truncated]";
    }

    if (typeof value === "string") {
      if (value.length <= 2_000) {
        return value;
      }

      return `${value.slice(0, 2_000)}… [Truncated]`;
    }

    if (typeof value === "bigint") {
      return `${value}n`;
    }

    if (typeof value === "function" || typeof value === "symbol") {
      return `[${typeof value}]`;
    }

    if (typeof value !== "object" || value === null) {
      return value;
    }

    if (seen.has(value)) {
      return "[Circular or repeated reference]";
    }

    seen.add(value);
    const entries = Object.entries(Object.getOwnPropertyDescriptors(value));
    const result: Record<string, unknown> = Object.create(null);

    for (const [key, descriptor] of entries.slice(0, 50)) {
      if (remaining < 0) {
        result["…"] = "[Truncated]";
        break;
      }

      if (/token|authorization|password|secret|cookie/i.test(key)) {
        result[key] = "[Redacted]";
        continue;
      }

      if (!capturePayloads && /^(data|info)$/i.test(key)) {
        result[key] = "[Payload capture is off]";
        continue;
      }

      if (!("value" in descriptor)) {
        result[key] = "[Accessor]";
        continue;
      }

      result[key] = inspect(descriptor.value, depth + 1);
    }

    if (entries.length > 50) {
      result["…"] = "[Truncated]";
    }

    if (Array.isArray(value)) {
      return Object.entries(result).flatMap(([key, item]) =>
        key === "length" ? [] : [item],
      );
    }

    return result;
  };

  return inspect(context, 0);
};
