import path from "node:path";

export const getImportSpecifier = (directory: string, filename: string) => {
  const relative = path
    .relative(directory, filename)
    .split(path.sep)
    .join("/")
    .replace(/(?:\.d)?\.mts$/, ".mjs")
    .replace(/(?:\.d)?\.cts$/, ".cjs")
    .replace(/(?:\.d)?\.[jt]sx?$/, ".js");

  if (relative.startsWith(".")) {
    return relative;
  }

  return `./${relative}`;
};
