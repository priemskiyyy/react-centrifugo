import path from "node:path";
import ts from "typescript";
import type { CodegenConfiguration } from "src/types/CodegenConfiguration";
import { getImportSpecifier } from "src/utils/getImportSpecifier";
import { CodegenFailure } from "src/errors/CodegenFailure";

export const createEventMapSource = (configuration: CodegenConfiguration) => {
  const extension = path
    .extname(configuration.events.file)
    .replace("tsx", "ts");
  const filename = `${configuration.events.file}.react-centrifugo${extension}`;

  if (ts.sys.fileExists(filename)) {
    throw new CodegenFailure(
      `The compiler's virtual event-map path is already in use: ${filename}`,
    );
  }

  const eventModule = getImportSpecifier(
    path.dirname(filename),
    configuration.events.file,
  );
  // Let the compiler resolve keyof and generic defaults without inspecting private symbol metadata.
  const content = `import type { ${configuration.events.type} as SourceEvents } from ${JSON.stringify(eventModule)};
export type EventMap = SourceEvents;
export type EventKeys = keyof EventMap;
`;

  const readFile: typeof ts.sys.readFile = (target, encoding) => {
    if (target === filename) {
      return content;
    }

    return ts.sys.readFile(target, encoding);
  };

  const fileExists = (target: string) => {
    if (target === filename) {
      return true;
    }

    return ts.sys.fileExists(target);
  };
  const getRootNames = (files: Iterable<string>) => [
    ...new Set([
      ...files,
      configuration.events.file,
      configuration.dispatcher.file,
      filename,
    ]),
  ];

  return { filename, readFile, fileExists, getRootNames };
};
