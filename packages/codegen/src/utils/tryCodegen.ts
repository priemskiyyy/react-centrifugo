import { Effect, identity } from "effect";
import { CodegenError } from "src/errors/CodegenError";
import { CodegenFailure } from "src/errors/CodegenFailure";

/**
 * Runs synchronous codegen work. A CodegenFailure becomes a typed error the CLI
 * prints as one line; anything else becomes a defect so the bug reaches the user
 * with its stack instead of posing as a configuration problem.
 */
export const tryCodegen = <TResult>(task: () => TResult) =>
  Effect.try({ try: task, catch: identity }).pipe(
    Effect.catchAll((cause) => {
      if (cause instanceof CodegenFailure) {
        return Effect.fail(new CodegenError({ message: cause.message, cause }));
      }

      return Effect.die(cause);
    }),
  );
