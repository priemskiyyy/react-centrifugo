import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL("..", import.meta.url));
const artifacts = path.join(workspace, ".artifacts");
const consumer = mkdtempSync(path.join(tmpdir(), "react-centrifugo-consumer-"));
const rootPackage = JSON.parse(
  readFileSync(path.join(workspace, "package.json"), "utf8"),
);

const run = (command, args, cwd = consumer) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
      { cause: result.error },
    );
  }

  return result.stdout;
};

const write = (name, content) =>
  writeFileSync(path.join(consumer, name), content);
const json = (name, value) =>
  write(name, `${JSON.stringify(value, null, 2)}\n`);

const verifyWatchShutdown = (cli) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "watch"], {
      cwd: consumer,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let ready = false;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Watcher failed to start or stop:\n${output}`));
    }, 10000);

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();

      if (ready || !output.includes("Watching event types")) {
        return;
      }

      ready = true;
      child.kill("SIGINT");
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);

      if (!ready || signal !== null || (code !== 0 && code !== 130)) {
        reject(
          new Error(
            `Watcher exited unexpectedly (${code}, ${signal}):\n${output}`,
          ),
        );
        return;
      }

      resolve();
    });
  });

try {
  mkdirSync(artifacts, { recursive: true });
  const tarballs = ["react-centrifugo", "codegen"].map((directory) => {
    const packageDirectory = path.join(workspace, "packages", directory);
    process.stdout.write(
      run("pnpm", ["exec", "publint", packageDirectory], workspace),
    );
    const [packed] = JSON.parse(
      run(
        "npm",
        ["pack", "--ignore-scripts", "--json", "--pack-destination", artifacts],
        packageDirectory,
      ),
    );
    assert(packed.files.some((file) => file.path === "README.md"));
    assert(packed.files.some((file) => file.path === "LICENSE"));
    assert(!packed.files.some((file) => file.path.startsWith("src/")));
    return path.join(artifacts, packed.filename);
  });

  json("package.json", {
    name: "react-centrifugo-package-consumer",
    private: true,
    type: "module",
    dependencies: Object.fromEntries(
      [
        "react",
        "react-dom",
        "centrifuge",
        "typescript",
        "vite",
        "@types/react",
        "@types/react-dom",
      ].map((name) => [name, rootPackage.devDependencies[name]]),
    ),
  });
  process.stdout.write(
    "Installing packed packages in an isolated consumer...\n",
  );
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    ...tarballs,
  ]);

  const runtime = readFileSync(
    path.join(consumer, "node_modules/react-centrifugo/dist/index.js"),
    "utf8",
  );
  assert.match(runtime, /^"use client";/);
  assert.doesNotMatch(runtime, /from ["']src\//);
  assert.doesNotMatch(runtime, /from ["']effect/);

  json("tsconfig.json", {
    compilerOptions: {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      lib: ["ES2022", "DOM"],
    },
    include: ["*.ts", "*.tsx", "generated/*.ts"],
  });
  json("realtime.config.json", {
    events: { file: "events.ts", type: "Events" },
    dispatcher: { file: "runtime.ts", export: "useChannelEvent" },
    output: "generated",
  });
  write(
    "events.ts",
    'export type Events = { "message.created": { channel: `rooms:${string}`; payload: { text: string } } };\n',
  );
  write(
    "runtime.ts",
    'import { createChannelEventHooks } from "react-centrifugo"; import type { Events } from "./events.js"; export const { useChannelEvent } = createChannelEventHooks<Events>({ decode: () => null });\n',
  );
  write(
    "contracts.ts",
    `import { useChannel } from "react-centrifugo";
import { useMessageCreated } from "./generated/index.js";
export const useContracts = () => {
  useChannel<{ text: string }>("raw", (data) => { data.text.toUpperCase(); });
  useChannel("raw", (data) => { data.toFixed(); }, { parse: Number });
  useMessageCreated("rooms:one", (data) => { data.text.toUpperCase(); });
  // @ts-expect-error Generated channel contract is enforced.
  useMessageCreated("wrong", () => {});
  // @ts-expect-error Generated payload cannot be overridden with a generic.
  useMessageCreated<number>("rooms:one", () => {});
  // @ts-expect-error A parser must produce the event payload.
  useMessageCreated("rooms:one", () => {}, { parse: Number });
};\n`,
  );
  write(
    "main.tsx",
    `import { createRoot } from "react-dom/client";
import { CentrifugeProvider } from "react-centrifugo";
import { useMessageCreated } from "./generated/index.js";
const Messages = () => { useMessageCreated("rooms:one", () => {}); return <p>Connected</p>; };
createRoot(document.body).render(<CentrifugeProvider configuration={{ session: { id: "consumer", enabled: false }, transport: "ws://localhost" }}><Messages /></CentrifugeProvider>);\n`,
  );
  write(
    "index.html",
    '<html><body><script type="module" src="/main.tsx"></script></body></html>\n',
  );
  write(
    "ssr.mjs",
    `import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { CentrifugeProvider, useChannel, useConnectionState } from "react-centrifugo";
const Child = () => { useChannel("rooms:one", () => {}); return createElement("span", null, useConnectionState()); };
const html = renderToString(createElement(CentrifugeProvider, { configuration: { session: { id: "server" }, transport: "ws://localhost" } }, createElement(Child)));
assert.equal(html, "<span>disconnected</span>");\n`,
  );

  const codegen = path.join(consumer, "node_modules/react-centrifugo-codegen");
  const metadata = JSON.parse(
    readFileSync(path.join(codegen, "package.json"), "utf8"),
  );
  const cli = path.join(codegen, metadata.bin["react-centrifugo-codegen"]);
  const stale = spawnSync(process.execPath, [cli, "check"], {
    cwd: consumer,
    encoding: "utf8",
  });
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /Generated hooks are stale/);
  assert.equal(stale.stdout, "");
  const invalidArguments = spawnSync(
    process.execPath,
    [cli, "generate", "--config"],
    {
      cwd: consumer,
      encoding: "utf8",
    },
  );
  assert.equal(invalidArguments.status, 1);
  assert.match(invalidArguments.stderr, /--config/);
  assert.equal(invalidArguments.stdout, "");
  run(process.execPath, [cli, "generate"]);
  run(process.execPath, [cli, "check"]);
  run(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"]);
  run(process.execPath, ["ssr.mjs"]);
  run(process.execPath, ["node_modules/vite/bin/vite.js", "build"]);
  await verifyWatchShutdown(cli);
  process.stdout.write(
    "Packed consumer passed: imports, generated types, SSR, browser build, CLI drift detection, and watcher shutdown.\n",
  );
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
