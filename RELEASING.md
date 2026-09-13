# Releasing react-centrifugo

The runtime and codegen packages are versioned independently. This process publishes the runtime only. No npm package is published by a pull request, a push, or a verification run.

## Prepare

1. Update `packages/react-centrifugo/package.json` and `CHANGELOG.md` together. Use a prerelease version such as `0.1.0-beta.1` for a beta; a GitHub prerelease label does not change the npm version.
2. Remove the first-release notices from the README and getting-started page when the initial version is ready to publish.
3. Run `pnpm check:release` with Docker running. The browser suite uses a pinned Centrifugo image in Chromium, Firefox, and WebKit.
4. Merge the reviewed commits into `main`, preserving the commit history. Verify GitHub Actions on that revision.

The checks produce `.artifacts/release/react-centrifugo-<version>.tgz` and `SHA256SUMS`. Compatibility checks install that tarball into clean consumers with the minimum and current React versions. The tests also verify nullable client types, typed events, SSR, and browser bundling.

## First npm publication

The npm name must exist before configuring its trusted publisher. An npm maintainer must perform the first publication from the verified tarball, using their own npm authentication:

```sh
cd .artifacts/release
shasum -a 256 -c SHA256SUMS
npm publish react-centrifugo-<version>.tgz --access public --tag next
```

Use `next` for a prerelease. Choose `latest` only for a stable release. The package name was available when release preparation began; availability is not a reservation.

After the first publication, configure an npm trusted publisher for:

- GitHub owner: `priemskiyyy`
- Repository: `react-centrifugo`
- Workflow filename: `runtime.publish.yml`
- Environment: `npm`

Use the GitHub `npm` environment to require maintainer review before publishing. Trusted publishing uses the workflow's short-lived identity; the repository does not need an npm token secret. See [npm's setup instructions](https://docs.npmjs.com/trusted-publishers/).

## Subsequent publications

Create a GitHub release with tag `react-centrifugo-v<version>` pointing at the reviewed commit. Mark prerelease versions as prereleases.

The publishing workflow checks that the tag and package version match, runs the release checks, and uploads the verified tarball. The `npm` environment then gates publication. The publish job checks the artifact's checksum and publishes that exact tarball with provenance. Prereleases use the `next` dist-tag; stable releases use `latest`.

Do not reuse a published version. If a release has a defect, prepare a new patch version and changelog entry.

## Support claims

The browser suite exercises Chromium, Firefox, and WebKit with the pinned Centrifugo version in `tests/browser/server.mjs`. CI tests the minimum and current React versions. React Native device support remains unverified; do not describe it as tested until a device suite is added.

The lifecycle test checks socket, subscription, and listener cleanup across repeated cycles. It is not a heap benchmark or a claim of unlimited throughput.
