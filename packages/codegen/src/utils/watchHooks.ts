import ts from "typescript";
import { Effect, Either, Queue, ScopedRef, Stream } from "effect";
import { CodegenError } from "src/errors/CodegenError";
import { tryCodegen } from "src/utils/tryCodegen";
import { readConfiguration } from "src/utils/readConfiguration";
import { getProjectConfiguration } from "src/utils/getProjectConfiguration";
import { createEventMapSource } from "src/utils/createEventMapSource";
import { generateHooksFromProgram } from "src/utils/generateHooksFromProgram";

type GenerationResult = ReturnType<typeof generateHooksFromProgram>;

/**
 * The queue holds deferred work rather than values so that replacing the project
 * watcher is serialised against generation through the same channel.
 */
type WatchTask = Effect.Effect<GenerationResult | undefined, CodegenError>;

type WatchUpdate = Either.Either<GenerationResult, CodegenError>;

export const watchHooks = (configFile: string) =>
  Effect.gen(function* () {
    const { watchFile } = ts.sys;

    if (typeof watchFile !== "function") {
      return yield* new CodegenError({
        message: "File watching is not supported in this environment.",
      });
    }

    const tasks = yield* Effect.acquireRelease(
      Queue.unbounded<WatchTask>(),
      Queue.shutdown,
    );

    const acquireProjectWatcher = Effect.acquireRelease(
      tryCodegen(() => {
        const configuration = readConfiguration(configFile);
        const { filename } = getProjectConfiguration(configuration);
        const source = createEventMapSource(configuration);
        const host =
          ts.createWatchCompilerHost<ts.SemanticDiagnosticsBuilderProgram>(
            filename,
            { noEmit: true },
            {
              ...ts.sys,
              readFile: source.readFile,
              fileExists: source.fileExists,
              watchFile: (target, ...args) => {
                if (target === source.filename) {
                  return { close: () => {} };
                }

                return watchFile(target, ...args);
              },
            },
            (rootNames, ...args) =>
              ts.createSemanticDiagnosticsBuilderProgram(
                source.getRootNames(rootNames ?? []),
                ...args,
              ),
            (diagnostic) => {
              tasks.unsafeOffer(
                Effect.fail(
                  new CodegenError({
                    message: ts.flattenDiagnosticMessageText(
                      diagnostic.messageText,
                      "\n",
                    ),
                  }),
                ),
              );
            },
            () => {},
          );

        host.afterProgramCreate = (builder) => {
          const program = builder.getProgram();
          tasks.unsafeOffer(
            tryCodegen(() =>
              generateHooksFromProgram(configuration, program, source.filename),
            ),
          );
        };

        return ts.createWatchProgram(host);
      }),
      (watcher) => Effect.sync(() => watcher.close()),
    );

    const project = yield* ScopedRef.fromAcquire(acquireProjectWatcher);

    yield* Effect.acquireRelease(
      tryCodegen(() =>
        watchFile(configFile, () => {
          tasks.unsafeOffer(
            ScopedRef.set(project, acquireProjectWatcher).pipe(
              Effect.as(undefined),
            ),
          );
        }),
      ),
      (watcher) => Effect.sync(() => watcher.close()),
    );

    return Stream.fromQueue(tasks).pipe(
      Stream.mapEffect(Effect.either),
      // Replacing the watcher yields no result; only failures and real runs surface.
      Stream.filter(
        (result): result is WatchUpdate =>
          Either.isLeft(result) || result.right !== undefined,
      ),
    );
  });
