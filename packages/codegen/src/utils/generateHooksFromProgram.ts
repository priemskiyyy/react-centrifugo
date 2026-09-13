import { existsSync } from "node:fs";
import type ts from "typescript";
import type { GenerateHooksOptions } from "src/types/GenerateHooksOptions";
import type { CodegenConfiguration } from "src/types/CodegenConfiguration";
import { readEventMap } from "src/utils/readEventMap";
import { renderHooks } from "src/utils/renderHooks";
import { writeGeneratedFiles } from "src/utils/writeGeneratedFiles";
import { CodegenFailure } from "src/errors/CodegenFailure";

export const generateHooksFromProgram = (
  configuration: CodegenConfiguration,
  program: ts.Program,
  eventMapSource: string,
  options: GenerateHooksOptions = {},
) => {
  if (!existsSync(configuration.dispatcher.file)) {
    throw new CodegenFailure(
      `Cannot read dispatcher: ${configuration.dispatcher.file}`,
    );
  }

  const events = readEventMap(program, eventMapSource);
  const files = renderHooks(configuration, events);
  const changed = writeGeneratedFiles(
    configuration.output,
    files,
    options.check ?? false,
  );

  return { events: events.length, changed, output: configuration.output };
};
