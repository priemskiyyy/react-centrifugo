import ts from "typescript";
import type { GenerateHooksOptions } from "src/types/GenerateHooksOptions";
import { readConfiguration } from "src/utils/readConfiguration";
import { getProjectConfiguration } from "src/utils/getProjectConfiguration";
import { createEventMapSource } from "src/utils/createEventMapSource";
import { generateHooksFromProgram } from "src/utils/generateHooksFromProgram";

export const generateHooks = (
  configFile: string,
  options: GenerateHooksOptions = {},
) => {
  const configuration = readConfiguration(configFile);
  const { project } = getProjectConfiguration(configuration);
  const source = createEventMapSource(configuration);
  const compilerOptions = { ...project.options, noEmit: true };
  const host = ts.createCompilerHost(compilerOptions);
  host.readFile = source.readFile;
  host.fileExists = source.fileExists;
  const program = ts.createProgram({
    rootNames: source.getRootNames(project.fileNames),
    options: compilerOptions,
    projectReferences: project.projectReferences ?? [],
    host,
  });

  return generateHooksFromProgram(
    configuration,
    program,
    source.filename,
    options,
  );
};
