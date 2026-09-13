import path from "node:path";
import ts from "typescript";
import type { CodegenConfiguration } from "src/types/CodegenConfiguration";
import { CodegenFailure } from "src/errors/CodegenFailure";

export const getProjectConfiguration = (
  configuration: CodegenConfiguration,
) => {
  let filename = configuration.tsconfig;

  if (filename === undefined) {
    filename = ts.findConfigFile(
      path.dirname(configuration.events.file),
      ts.sys.fileExists,
    );
  }

  if (filename === undefined) {
    throw new CodegenFailure(
      "No tsconfig.json found. Set tsconfig in your codegen configuration.",
    );
  }

  const result = ts.readConfigFile(filename, ts.sys.readFile);
  if (result.error !== undefined) {
    throw new CodegenFailure(
      ts.flattenDiagnosticMessageText(result.error.messageText, "\n"),
    );
  }

  const project = ts.parseJsonConfigFileContent(
    result.config,
    ts.sys,
    path.dirname(filename),
  );
  if (project.errors.length > 0) {
    throw new CodegenFailure(
      project.errors
        .map((error) =>
          ts.flattenDiagnosticMessageText(error.messageText, "\n"),
        )
        .join("\n"),
    );
  }

  return { filename, project };
};
