import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const metadata = JSON.parse(
  readFileSync(
    new URL("../packages/react-centrifugo/package.json", import.meta.url),
    "utf8",
  ),
);
assert.equal(metadata.name, "react-centrifugo");
assert.equal(metadata.license, "MIT");
assert.equal(
  metadata.repository.url,
  "git+https://github.com/priemskiyyy/react-centrifugo.git",
);
assert.equal(metadata.repository.directory, "packages/react-centrifugo");
assert.equal(
  metadata.homepage,
  "https://priemskiyyy.github.io/react-centrifugo/",
);
assert.equal(metadata.publishConfig.access, "public");
assert.match(metadata.version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/);
const changelog = readFileSync(
  new URL("../CHANGELOG.md", import.meta.url),
  "utf8",
);
assert(
  changelog.includes(`## ${metadata.version}`),
  "The package version needs a changelog entry.",
);
const tag = process.env.RELEASE_TAG;
if (tag !== undefined) {
  assert.equal(
    tag,
    `react-centrifugo-v${metadata.version}`,
    "Release tag must match the package version.",
  );
}
const prerelease = process.env.RELEASE_PRERELEASE;
if (prerelease !== undefined) {
  assert.equal(
    prerelease,
    String(metadata.version.includes("-")),
    "The GitHub prerelease flag must match the package version suffix.",
  );
}
console.log(
  `Release metadata is valid for react-centrifugo ${metadata.version}.`,
);
