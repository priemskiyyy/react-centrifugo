/** JSON for the expanded row, cut off after 12k characters. */
export const formatContextText = (value: unknown) => {
  const text = JSON.stringify(value, null, 2) ?? "undefined";

  if (text.length <= 12_000) {
    return text;
  }

  return `${text.slice(0, 12_000)}\n… [Truncated]`;
};
