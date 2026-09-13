#!/usr/bin/env node
import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Cause, Console, Effect } from "effect";
import { codegenCommand } from "src/commands/codegenCommand";
import packageJson from "../package.json";

const run = Command.run(codegenCommand, {
  name: "React Centrifugo Codegen",
  version: packageJson.version,
});

run(process.argv).pipe(
  Effect.tapErrorTag("CodegenError", (error) => Console.error(error.message)),
  Effect.tapDefect((cause) => Console.error(Cause.pretty(cause))),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain({ disableErrorReporting: true }),
);
