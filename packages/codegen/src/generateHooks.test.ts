import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import ts from "typescript";
import { Effect, Either, Exit, Fiber, Stream } from "effect";
import { generateHooks } from "src/generateHooks";
import { watchHooks } from "src/utils/watchHooks";

const directories: string[] = [];

const createProject = (
  events = 'export type Events = { "message.created": { channel: `rooms:${string}`; payload: { text: string } } };',
) => {
  const directory = mkdtempSync(
    path.join(tmpdir(), "react-centrifugo-codegen-"),
  );
  directories.push(directory);
  const write = (name: string, content: string) =>
    writeFileSync(path.join(directory, name), content);
  const read = (name: string) =>
    readFileSync(path.join(directory, name), "utf8");
  write(
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: { strict: true, noLib: true },
      include: ["*.ts"],
    }),
  );
  write("events.ts", events);
  write("runtime.ts", "export const useChannelEvent = () => {};\n");
  const configuration = {
    events: { file: "events.ts", type: "Events" },
    dispatcher: { file: "runtime.ts", export: "useChannelEvent" },
    output: "generated",
  };
  const configure = (hookNames?: Record<string, string>) => {
    write(
      "realtime.config.json",
      JSON.stringify({ ...configuration, hookNames }),
    );
  };
  configure();

  return {
    directory,
    write,
    read,
    configure,
    configFile: path.join(directory, "realtime.config.json"),
  };
};

const startWatching = (
  configFile: string,
  onError: (error: unknown) => void,
) => {
  const fiber = Effect.runFork(
    Effect.gen(function* () {
      const updates = yield* watchHooks(configFile);
      yield* Stream.runForEach(updates, (result) =>
        Effect.sync(() => {
          if (Either.isLeft(result)) {
            onError(result.left);
          }
        }),
      );
    }).pipe(Effect.scoped),
  );

  return () => Effect.runPromise(Fiber.interrupt(fiber));
};

afterEach(() => {
  directories
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    );
});

test("resolves imported, re-exported, and intersected event maps without copying payload types", () => {
  const project = createProject('export type { Events } from "./shared";');
  project.write(
    "shared.ts",
    'type Messages = { "message.created": { channel: `rooms:${string}`; payload: { text: string } } }; export type Events = Messages & { "presence.changed": { channel: "presence"; payload: boolean } };',
  );

  expect(generateHooks(project.configFile).events).toBe(2);
  const hook = project.read("generated/useMessageCreated.ts");
  expect(hook).toContain(
    'import type { Events as RealtimeEvents } from "../events.js"',
  );
  expect(hook).toContain('RealtimeEvents["message.created"]');
  expect(hook).toContain('channel: EventDefinition["channel"]');
  expect(hook).not.toContain("text: string");
  expect(project.read("generated/index.ts")).toContain(
    'from "./useMessageCreated.js"',
  );
  expect(generateHooks(project.configFile).changed).toEqual([]);
});

test.each(["mts", "cts"])(
  "resolves %s event maps with NodeNext module resolution",
  (extension) => {
    const project = createProject();
    project.write(`events.${extension}`, project.read("events.ts"));
    project.write(
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noLib: true,
          module: "NodeNext",
          moduleResolution: "NodeNext",
        },
        include: ["*.ts"],
      }),
    );
    project.write(
      "realtime.config.json",
      JSON.stringify({
        events: { file: `events.${extension}`, type: "Events" },
        dispatcher: { file: "runtime.ts", export: "useChannelEvent" },
        output: "generated",
      }),
    );

    expect(generateHooks(project.configFile).events).toBe(1);
    expect(project.read("generated/useMessageCreated.ts")).toContain(
      'RealtimeEvents["message.created"]',
    );
  },
);

test("check reports drift without writing, and regeneration removes only owned stale hooks", () => {
  const project = createProject();
  const check = generateHooks(project.configFile, { check: true });
  expect(check.changed).toContain("useMessageCreated.ts");
  expect(existsSync(path.join(project.directory, "generated"))).toBe(false);
  generateHooks(project.configFile);
  project.write("generated/manual.ts", "export const keep = true;\n");
  project.configure({ "message.created": "useNewMessage" });
  expect(generateHooks(project.configFile, { check: true }).changed).toContain(
    "useMessageCreated.ts",
  );
  expect(
    existsSync(path.join(project.directory, "generated/useMessageCreated.ts")),
  ).toBe(true);

  generateHooks(project.configFile);
  expect(
    existsSync(path.join(project.directory, "generated/useMessageCreated.ts")),
  ).toBe(false);
  expect(project.read("generated/manual.ts")).toBe(
    "export const keep = true;\n",
  );
  expect(project.read("generated/index.ts")).toContain("useNewMessage");
});

test("refuses to overwrite edited generated files before modifying anything", () => {
  const project = createProject();
  generateHooks(project.configFile);
  const originalIndex = project.read("generated/index.ts");
  project.write(
    "generated/useMessageCreated.ts",
    "export const handwritten = true;\n",
  );
  project.configure({ "message.created": "useNewMessage" });

  expect(() => generateHooks(project.configFile)).toThrow("Refusing to modify");
  expect(project.read("generated/index.ts")).toBe(originalIndex);
  expect(
    existsSync(path.join(project.directory, "generated/useNewMessage.ts")),
  ).toBe(false);
});

test("rejects colliding hook names and supports explicit overrides", () => {
  const project = createProject(
    'type Definition = { channel: string; payload: string }; export type Events = { "message.created": Definition; "message-created": Definition };',
  );
  expect(() => generateHooks(project.configFile)).toThrow(
    "Multiple events generate",
  );
  expect(existsSync(path.join(project.directory, "generated"))).toBe(false);
  project.configure({ "message-created": "useLegacyMessage" });
  expect(generateHooks(project.configFile).events).toBe(2);
});

test.each([
  ["export type Events = MissingType;", "resolve to an object"],
  [
    "export type Events = { [key: string]: { channel: string; payload: string } };",
    "finite",
  ],
  [
    "export type Events = { bad?: { channel: string; payload: string } };",
    "required",
  ],
  [
    "export type Events = { bad: { channel: number; payload: string } };",
    "string channel",
  ],
  ["export type Events = { bad: { channel: string } };", "payload"],
  [
    "declare const key: unique symbol; export type Events = { [key]: { channel: string; payload: string } };",
    "string keys",
  ],
  [
    "export type Events = { 42: { channel: string; payload: string } };",
    "string keys",
  ],
  [
    "export type Events = { [Key in 42]: { channel: string; payload: string } };",
    "string keys",
  ],
  [
    "export type Events<T> = { first: { channel: string; payload: T } };",
    "type argument",
  ],
])("rejects invalid event maps: %s", (source, message) => {
  const project = createProject(source);
  expect(() => generateHooks(project.configFile)).toThrow(message);
  expect(existsSync(path.join(project.directory, "generated"))).toBe(false);
});

test("supports string keys that look numeric and defaulted generic event maps", () => {
  const project = createProject(
    'export type Events<Key extends string = "42"> = { [Event in Key]: { channel: string; payload: string } };',
  );
  project.configure({ "42": "useNumericName" });

  expect(generateHooks(project.configFile).events).toBe(1);
  expect(project.read("generated/useNumericName.ts")).toContain(
    'RealtimeEvents["42"]',
  );
});

test("watch follows changes in imported types and config", async () => {
  const project = createProject('export type { Events } from "./shared";');
  project.write(
    "shared.ts",
    "export type Events = { first: { channel: string; payload: string } };",
  );
  const onError = vi.fn();
  const close = startWatching(project.configFile, onError);

  try {
    await vi.waitFor(() =>
      expect(project.read("generated/index.ts")).toContain("useFirst"),
    );
    project.write(
      "shared.ts",
      "export type Events = { second: { channel: string; payload: number } };",
    );
    await vi.waitFor(
      () => expect(project.read("generated/index.ts")).toContain("useSecond"),
      { timeout: 5000 },
    );
    project.configure({ second: "useCustomSecond" });
    await vi.waitFor(
      () =>
        expect(project.read("generated/index.ts")).toContain("useCustomSecond"),
      { timeout: 5000 },
    );
    expect(onError).not.toHaveBeenCalled();
  } finally {
    await close();
  }
}, 15000);

test("watch includes configured event files outside the tsconfig roots and reloads compiler options", async () => {
  const project = createProject('export type { Events } from "@events";');
  project.write(
    "first.ts",
    "export type Events = { first: { channel: string; payload: string } };",
  );
  project.write(
    "second.ts",
    "export type Events = { second: { channel: string; payload: string } };",
  );
  const configureProject = (file: string) =>
    project.write(
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noLib: true,
          baseUrl: ".",
          paths: { "@events": [file] },
        },
        files: ["runtime.ts"],
      }),
    );
  configureProject("first.ts");
  const onError = vi.fn();
  const close = startWatching(project.configFile, onError);

  try {
    await vi.waitFor(() =>
      expect(project.read("generated/index.ts")).toContain("useFirst"),
    );
    project.write(
      "first.ts",
      "export type Events = { updated: { channel: string; payload: string } };",
    );
    await vi.waitFor(
      () => expect(project.read("generated/index.ts")).toContain("useUpdated"),
      { timeout: 5000 },
    );
    configureProject("second.ts");
    await vi.waitFor(
      () => expect(project.read("generated/index.ts")).toContain("useSecond"),
      { timeout: 5000 },
    );
    expect(onError).not.toHaveBeenCalled();
  } finally {
    await close();
  }
}, 15000);

test("watch recovers after invalid event types and invalid configuration", async () => {
  const project = createProject();
  const onError = vi.fn();
  const close = startWatching(project.configFile, onError);

  try {
    await vi.waitFor(() =>
      expect(project.read("generated/index.ts")).toContain("useMessageCreated"),
    );
    const original = project.read("generated/index.ts");
    project.write(
      "events.ts",
      "export type Events = { 42: { channel: string; payload: string } };",
    );
    await vi.waitFor(() => expect(onError).toHaveBeenCalled(), {
      timeout: 5000,
    });
    expect(project.read("generated/index.ts")).toBe(original);
    onError.mockClear();
    project.write(
      "events.ts",
      "export type Events = { recovered: { channel: string; payload: string } };",
    );
    await vi.waitFor(
      () =>
        expect(project.read("generated/index.ts")).toContain("useRecovered"),
      { timeout: 5000 },
    );
    project.write("realtime.config.json", "{");
    await vi.waitFor(() => expect(onError).toHaveBeenCalled(), {
      timeout: 5000,
    });
    project.configure({ recovered: "useConfiguredAgain" });
    await vi.waitFor(
      () =>
        expect(project.read("generated/index.ts")).toContain(
          "useConfiguredAgain",
        ),
      { timeout: 5000 },
    );
  } finally {
    await close();
  }
}, 15000);

test("failed configuration watcher acquisition closes the project watchers", async () => {
  const project = createProject();
  const { watchFile, watchDirectory } = ts.sys;
  if (typeof watchFile !== "function" || typeof watchDirectory !== "function") {
    throw new Error("The test requires native file watching.");
  }

  const cleanups: Array<() => void> = [];
  const track = (watcher: ts.FileWatcher) => {
    const close = vi.fn(() => watcher.close());
    cleanups.push(close);
    return { close };
  };
  const failure = new Error("configuration watcher failed");
  vi.spyOn(ts.sys, "watchFile").mockImplementation((filename, ...args) => {
    if (filename === project.configFile) {
      throw failure;
    }

    return track(watchFile(filename, ...args));
  });
  vi.spyOn(ts.sys, "watchDirectory").mockImplementation((...args) =>
    track(watchDirectory(...args)),
  );

  try {
    const result = await Effect.runPromiseExit(
      watchHooks(project.configFile).pipe(Effect.scoped),
    );
    expect(Exit.isFailure(result)).toBe(true);
    expect(cleanups.length).toBeGreaterThan(0);
    cleanups.forEach((close) => expect(close).toHaveBeenCalled());
  } finally {
    cleanups.forEach((close) => close());
  }
});
