import path from "node:path";
import { Either, ParseResult, Schema } from "effect";
import ts from "typescript";
import { CodegenFailure } from "src/errors/CodegenFailure";
import { CodegenConfigurationSchema } from "src/schemas/CodegenConfigurationSchema";
import type { CodegenConfiguration } from "src/types/CodegenConfiguration";

const decodeConfiguration = Schema.decodeUnknownEither(
  CodegenConfigurationSchema,
  { onExcessProperty: "error", errors: "all" },
);

const parseConfiguration = (input: unknown, filename: string) => {
  const result = decodeConfiguration(input);

  if (Either.isRight(result)) {
    return result.right;
  }

  // One line per problem, addressed by path, instead of the whole config shape.
  const problems = ParseResult.ArrayFormatter.formatErrorSync(result.left)
    .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  throw new CodegenFailure(
    `Invalid codegen configuration: ${filename}\n${problems}`,
  );
};

export const readConfiguration = (filename: string): CodegenConfiguration => {
  const configPath = path.resolve(filename);
  const result = ts.readConfigFile(configPath, ts.sys.readFile);

  if (result.error !== undefined) {
    throw new CodegenFailure(
      ts.flattenDiagnosticMessageText(result.error.messageText, "\n"),
    );
  }

  const configuration = parseConfiguration(result.config, configPath);
  const directory = path.dirname(configPath);
  const resolvedConfiguration = {
    ...configuration,
    events: {
      ...configuration.events,
      file: path.resolve(directory, configuration.events.file),
    },
    dispatcher: {
      ...configuration.dispatcher,
      file: path.resolve(directory, configuration.dispatcher.file),
    },
    output: path.resolve(directory, configuration.output),
  };

  if (configuration.tsconfig === undefined) {
    return resolvedConfiguration;
  }

  return {
    ...resolvedConfiguration,
    tsconfig: path.resolve(directory, configuration.tsconfig),
  };
};
