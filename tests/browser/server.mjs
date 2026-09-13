import { Buffer } from "node:buffer";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const image =
  "centrifugo/centrifugo:v6.9.5@sha256:99730b3f481c7ee639dbd2147716e3c12bd3ad191df5e8427e050414806609a3";
const name = `react-centrifugo-tests-${randomUUID()}`;
const directory = await mkdtemp(path.join(tmpdir(), "react-centrifugo-tests-"));
const secret = randomBytes(32).toString("hex");
const apiKey = randomBytes(32).toString("hex");
const requests = new Map();

const sign = (claims, key = secret) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const data = `${header}.${payload}`;
  return `${data}.${createHmac("sha256", key).update(data).digest("base64url")}`;
};

const api = async (method, body) => {
  const response = await fetch(`http://127.0.0.1:4175/api/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });
  const data = await response.json();
  if (!response.ok || data.error !== undefined) {
    throw new Error(`Centrifugo ${method} failed: ${JSON.stringify(data)}`);
  }
  return data.result;
};

const handle = async (url, body) => {
  if (url === "/health") {
    return { ready: true };
  }
  if (url === "/connection-token" || url === "/subscription-token") {
    const key = `${url}:${body.user}`;
    const previous = requests.get(key) ?? [];
    requests.set(key, [...previous, randomUUID()]);
    const claims = {
      sub: body.user,
      exp:
        Math.floor(Date.now() / 1000) +
        (body.refresh && previous.length === 0 ? 3 : 300),
    };
    if (url === "/subscription-token") {
      claims.channel = body.channel;
    }
    return {
      token: sign(
        claims,
        body.invalid ? "deliberately-invalid-test-key" : secret,
      ),
    };
  }
  if (url === "/requests") {
    return {
      connection: (requests.get(`/connection-token:${body.user}`) ?? []).length,
      subscription: (requests.get(`/subscription-token:${body.user}`) ?? [])
        .length,
    };
  }
  if (url === "/publish") {
    return api("publish", body);
  }
  if (url === "/presence") {
    return api("presence", body);
  }
  if (url === "/disconnect-and-publish") {
    await api("disconnect", {
      user: body.user,
      disconnect: { code: 3000, reason: "browser recovery test" },
    });
    for (const message of body.messages) {
      await api("publish", { channel: body.channel, data: { text: message } });
    }
    return { published: body.messages.length };
  }
  throw new Error(`Unknown test endpoint: ${url}`);
};

const server = createServer(async (request, response) => {
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    const body = raw.length === 0 ? {} : JSON.parse(raw);
    const result = await handle(request.url, body);
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(result));
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: String(error) }));
  }
});

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  server.closeAllConnections();
  server.close();
  await run("docker", ["rm", "--force", name]).catch(() => {});
  await rm(directory, { recursive: true, force: true });
};
process.once("SIGTERM", () => stop().then(() => process.exit(0)));
process.once("SIGINT", () => stop().then(() => process.exit(0)));

try {
  await writeFile(
    path.join(directory, "config.json"),
    JSON.stringify({
      client: {
        token: { hmac_secret_key: secret },
        allowed_origins: ["http://127.0.0.1:4173"],
      },
      http_api: { key: apiKey },
      channel: {
        namespaces: [
          {
            name: "private",
            presence: true,
            history_size: 8,
            history_ttl: "60s",
            force_recovery: true,
          },
        ],
      },
    }),
  );
  const container = spawn(
    "docker",
    [
      "run",
      "--rm",
      "--name",
      name,
      "-p",
      "127.0.0.1:4175:8000",
      "-v",
      `${directory}:/centrifugo:ro`,
      image,
      "centrifugo",
      "-c",
      "/centrifugo/config.json",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let logs = "";
  container.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  container.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });
  container.once("error", (error) => {
    console.error(error);
    stop().then(() => process.exit(1));
  });
  container.once("exit", () => {
    if (stopping) return;
    console.error(`Centrifugo exited unexpectedly:\n${logs}`);
    stop().then(() => process.exit(1));
  });
  const deadline = Date.now() + 90_000;
  while (true) {
    try {
      await api("info", {});
      break;
    } catch (error) {
      if (Date.now() >= deadline)
        throw new Error(`Centrifugo did not start:\n${logs}`, { cause: error });
      await setTimeout(100);
    }
  }
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(4174, "127.0.0.1", resolve);
  });
  console.log("Browser test API ready; Centrifugo 6.9.5 is running.");
} catch (error) {
  console.error(error);
  await stop();
  process.exitCode = 1;
}
