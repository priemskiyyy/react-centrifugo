import path from "node:path";
import { Command, Options } from "@effect/cli";
import { Console, Effect, Either, Stream } from "effect";
import { CodegenError } from "src/errors/CodegenError";
import { generateHooks } from "src/generateHooks";
import { tryCodegen } from "src/utils/tryCodegen";
import { watchHooks } from "src/utils/watchHooks";

const options = {
  config: Options.text("config").pipe(
    Options.withDefault("realtime.config.json"),
    Options.withDescription("Path to the codegen configuration."),
  ),
};

const generate = ({ config }: { config: string }) =>
  tryCodegen(() => generateHooks(config)).pipe(
    Effect.flatMap(({ events }) =>
      Console.log(`Generated ${events} event hooks.`),
    ),
  );

const generateCommand = Command.make("generate", options, generate).pipe(
  Command.withDescription(
    "Generate hooks from the application's TypeScript event map.",
  ),
);

const checkCommand = Command.make("check", options, ({ config }) =>
  Effect.gen(function* () {
    const result = yield* tryCodegen(() =>
      generateHooks(config, { check: true }),
    );

    if (result.changed.length > 0) {
      return yield* new CodegenError({
        message: `Generated hooks are stale: ${result.changed.join(", ")}. Run react-centrifugo-codegen generate.`,
      });
    }

    yield* Console.log(`Checked ${result.events} event hooks.`);
  }),
).pipe(
  Command.withDescription("Check generated hooks without changing files."),
);

const watchCommand = Command.make("watch", options, ({ config }) =>
  Effect.gen(function* () {
    const updates = yield* watchHooks(path.resolve(config));
    yield* Console.log(
      "Watching event types and configuration. Press Ctrl+C to stop.",
    );

    yield* Stream.runForEach(updates, (result) => {
      if (Either.isLeft(result)) {
        return Console.error(result.left.message);
      }

      const { events, changed } = result.right;

      if (changed.length === 0) {
        return Effect.void;
      }

      return Console.log(`Generated ${events} event hooks.`);
    });
  }).pipe(Effect.scoped),
).pipe(
  Command.withDescription(
    "Regenerate when event types or configuration change.",
  ),
);

export const codegenCommand = Command.make(
  "react-centrifugo-codegen",
  options,
  generate,
).pipe(
  Command.withSubcommands([generateCommand, checkCommand, watchCommand]),
  Command.withDescription("Generate typed React hooks for Centrifugo."),
);
