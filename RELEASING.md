# Releasing the packages

The three packages share one version line. Each has its own GitHub release tag and publishing workflow. Pushes and verification runs do not publish npm packages.

| Package                     | Version file                             | GitHub release tag                     | Workflow               | Verified artifact directory   |
| --------------------------- | ---------------------------------------- | -------------------------------------- | ---------------------- | ----------------------------- |
| `react-centrifugo`          | `packages/react-centrifugo/package.json` | `react-centrifugo-v<version>`          | `runtime.publish.yml`  | `.artifacts/release`          |
| `react-centrifugo-codegen`  | `packages/codegen/package.json`          | `react-centrifugo-codegen-v<version>`  | `codegen.publish.yml`  | `.artifacts/codegen-release`  |
| `react-centrifugo-devtools` | `packages/devtools/package.json`         | `react-centrifugo-devtools-v<version>` | `devtools.publish.yml` | `.artifacts/devtools-release` |

Publish the runtime before devtools; devtools declares the matching runtime minor as a peer dependency.

## Prepare a release

1. Update the package versions and their entries in `CHANGELOG.md` together. Use a version such as `0.2.0-beta.1` for a prerelease; the GitHub prerelease flag must match the version suffix.
2. Run `pnpm check:release` with Docker running. The browser suite uses a pinned Centrifugo image in Chromium, Firefox, and WebKit.
3. Merge the reviewed commits into `main`, preserving the commit history. Verify GitHub Actions on that revision.
4. Create a GitHub release using the matching tag from the table. Mark prerelease versions as prereleases.
5. Approve the publish job in the GitHub `npm` environment once its verification jobs pass.

Each workflow builds and tests its package, then publishes the verified tarball with provenance after checking its checksum. Prereleases use the `next` dist-tag; stable releases use `latest`. Package verification installs tarballs into clean consumers and checks generated hooks, CLI commands, SSR, and browser bundling. Runtime compatibility checks also test the minimum and current React versions.

Do not reuse a published version. Prepare a new patch version and changelog entry for a release fix.

## npm trusted publishers

All packages use the GitHub owner `priemskiyyy`, repository `react-centrifugo`, and environment `npm`. Each package authorizes its own workflow filename from the table and permits `npm publish`.

Trusted publishing uses GitHub's short-lived OIDC identity. The repository does not need an npm token secret. See [npm's setup instructions](https://docs.npmjs.com/trusted-publishers/).

The first publication of a new package requires an authenticated npm maintainer because the package must exist before configuring its trusted publisher. Publish the verified tarball from its artifact directory, then register the workflow. Do not create a GitHub release for that same version afterward: its workflow would attempt to publish an existing version. An annotated Git tag can record the source revision without triggering publication.

```sh
npm login
cd .artifacts/release
shasum -a 256 -c SHA256SUMS
npm publish react-centrifugo-<version>.tgz --access public --tag latest
```

Use `.artifacts/codegen-release` or `.artifacts/devtools-release` and the matching tarball for that package's first publication. Use `--tag next` for a prerelease.

## Support claims

The browser suite exercises Chromium, Firefox, and WebKit with the pinned Centrifugo version in `tests/browser/server.mjs`. CI tests the minimum and current React versions. React Native device support remains unverified.

The lifecycle test checks socket, subscription, and listener cleanup across repeated cycles. It is not a heap benchmark or a claim of unlimited throughput.
