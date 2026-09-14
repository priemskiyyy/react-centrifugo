import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packages = {
  "react-centrifugo": {
    directory: "packages/react-centrifugo",
    homepage: "https://priemskiyyy.github.io/react-centrifugo/",
  },
  "react-centrifugo-codegen": {
    directory: "packages/codegen",
    homepage: "https://priemskiyyy.github.io/react-centrifugo/codegen",
  },
  "react-centrifugo-devtools": {
    directory: "packages/devtools",
    homepage: "https://priemskiyyy.github.io/react-centrifugo/devtools",
  },
};
const selected = process.argv.slice(2);
const names = selected.length === 0 ? Object.keys(packages) : selected;
const changelog = readFileSync(
  new URL("../CHANGELOG.md", import.meta.url),
  "utf8",
);

for (const name of names) {
  const configuration = packages[name];
  assert(configuration, `Unknown release package: ${name}`);
  const metadata = JSON.parse(
    readFileSync(
      new URL(`../${configuration.directory}/package.json`, import.meta.url),
      "utf8",
    ),
  );
  assert.equal(metadata.name, name);
  assert.equal(metadata.license, "MIT");
  assert.equal(
    metadata.repository.url,
    "git+https://github.com/priemskiyyy/react-centrifugo.git",
  );
  assert.equal(metadata.repository.directory, configuration.directory);
  assert.equal(metadata.homepage, configuration.homepage);
  assert.equal(
    metadata.bugs.url,
    "https://github.com/priemskiyyy/react-centrifugo/issues",
  );
  assert.equal(metadata.publishConfig.access, "public");
  assert.match(metadata.version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/);
  const entry = changelog
    .split("\n")
    .find((line) => line.startsWith(`## ${name} ${metadata.version} — `));
  assert(entry, `${name} ${metadata.version} needs a changelog entry.`);
  const tag = process.env.RELEASE_TAG;
  if (tag !== undefined) {
    assert(
      !entry.endsWith("Unreleased"),
      "Date the changelog entry before publishing a release.",
    );
    assert.equal(
      tag,
      `${name}-v${metadata.version}`,
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
  console.log(`Release metadata is valid for ${name} ${metadata.version}.`);
}
