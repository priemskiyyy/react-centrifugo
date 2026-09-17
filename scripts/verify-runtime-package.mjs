import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = path.join(root, "packages/react-centrifugo");
const metadata = JSON.parse(
  readFileSync(path.join(directory, "package.json"), "utf8"),
);
const workspace = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);
const output = path.join(root, ".artifacts/release");
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 180_000,
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
};
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
run("pnpm", ["exec", "publint", directory], root);
const [packed] = JSON.parse(
  run(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", output],
    directory,
  ),
);
assert.equal(packed.name, "react-centrifugo");
assert.equal(packed.version, metadata.version);
assert(packed.files.some((file) => file.path === "LICENSE"));
assert(packed.files.some((file) => file.path === "README.md"));
assert(
  packed.files.every(
    (file) =>
      file.path.startsWith("dist/") ||
      ["LICENSE", "README.md", "package.json"].includes(file.path),
  ),
);
const tarball = path.join(output, packed.filename);
const versions = process.env.REACT_VERSION
  ? [process.env.REACT_VERSION]
  : ["19.2.0", workspace.devDependencies.react];
for (const react of new Set(versions)) {
  const consumer = mkdtempSync(
    path.join(tmpdir(), "react-centrifugo-release-"),
  );
  try {
    const write = (name, content) =>
      writeFileSync(path.join(consumer, name), content);
    write(
      "package.json",
      JSON.stringify({
        name: "release-consumer",
        private: true,
        type: "module",
        dependencies: {
          react,
          "react-dom": react,
          ...Object.fromEntries(
            [
              "centrifuge",
              "typescript",
              "vite",
              "@types/react",
              "@types/react-dom",
            ].map((name) => [name, workspace.devDependencies[name]]),
          ),
        },
      }),
    );
    console.log(
      `Checking packed runtime with React ${react} and Centrifuge ${workspace.devDependencies.centrifuge}...`,
    );
    run(
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball],
      consumer,
    );
    const installed = path.join(consumer, "node_modules/react-centrifugo");
    const bundle = readFileSync(path.join(installed, "dist/index.js"), "utf8");
    assert.match(bundle, /^"use client";/);
    assert.doesNotMatch(bundle, /from ["']src\//);
    assert.match(bundle, /from ["']@priemskiyyy\/simulcast-react["']/);
    const declarations = readFileSync(
      path.join(installed, "dist/index.d.ts"),
      "utf8",
    );
    assert.match(declarations, /@example/);
    assert.doesNotMatch(
      declarations,
      /useNativeChannel|useRealtimeClient|NativeEmitter/,
    );
    write(
      "tsconfig.json",
      JSON.stringify({
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
        include: ["*.ts", "*.tsx"],
      }),
    );
    write(
      "contracts.ts",
      `import type { Centrifuge } from "centrifuge";
import type { CentrifugeRealtimeClient } from "react-centrifugo";
import { useCentrifuge, useChannel, useChannelDemand, createChannelEventHooks } from "react-centrifugo";
declare module "@priemskiyyy/simulcast-react" {
  interface Register { client: CentrifugeRealtimeClient }
}
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const { useChannelEvent } = createChannelEventHooks<{ "message.created": { channel: \`rooms:\${string}\`; payload: { text: string } } }>({ decode: () => null });
export const useContracts = () => {
  const client = useCentrifuge();
  const nullableClient: Equal<typeof client, Centrifuge | null> = true;
  useChannel<{ text: string }>("room", (message, publication) => { message.text.toUpperCase(); publication.native.offset?.toFixed(); });
  useChannelDemand("room");
  useChannel("count", count => { count.toFixed(); }, { parse: Number });
  useChannelEvent("rooms:one", "message.created", message => { message.text.toUpperCase(); });
  // @ts-expect-error Channel must match the selected event.
  useChannelEvent("wrong", "message.created", () => {});
  // @ts-expect-error The client can be absent.
  client.publish("room", {});
  return nullableClient;
};\n`,
    );
    write(
      "ssr.mjs",
      `import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import * as api from "react-centrifugo";
assert.deepEqual(Object.keys(api).sort(), ["CentrifugeProvider", "createChannelEventHooks", "useCentrifuge", "useChannel", "useChannelDemand", "useChannelStatus", "useClientEvent", "useConnectionState", "useSubscriptionEvent"].sort());
const Child = () => { api.useChannel("room", () => {}); assert.equal(api.useCentrifuge(), null); return createElement("span", null, api.useConnectionState()); };
const html = renderToString(createElement(api.CentrifugeProvider, { configuration: { session: { id: "ssr" }, transport: "ws://localhost" } }, createElement(Child)));
assert.equal(html, "<span>disconnected</span>");\n`,
    );
    write(
      "main.tsx",
      `import { createRoot } from "react-dom/client";
import { CentrifugeProvider, useCentrifuge } from "react-centrifugo";
const Child = () => <span>{useCentrifuge() === null ? "inactive" : "active"}</span>;
createRoot(document.body).render(<CentrifugeProvider configuration={{ session: { id: "browser", enabled: false }, transport: "ws://localhost" }}><Child /></CentrifugeProvider>);\n`,
    );
    write(
      "index.html",
      '<html><body><script type="module" src="/main.tsx"></script></body></html>',
    );
    run(process.execPath, ["node_modules/typescript/bin/tsc"], consumer);
    run(process.execPath, ["ssr.mjs"], consumer);
    run(process.execPath, ["node_modules/vite/bin/vite.js", "build"], consumer);
  } finally {
    rmSync(consumer, { recursive: true, force: true });
  }
}
const checksum = createHash("sha256")
  .update(readFileSync(tarball))
  .digest("hex");
writeFileSync(
  path.join(output, "SHA256SUMS"),
  `${checksum}  ${packed.filename}\n`,
);
console.log(`Verified release artifact: ${tarball}`);
