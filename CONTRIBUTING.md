# Contributing

Use Node 24 and the pnpm version in `package.json`. Run `pnpm install --frozen-lockfile`, then `pnpm check` before submitting a change.

## Layout

- `packages/react-centrifugo`: React hooks over `@priemskiyyy/simulcast` and its Centrifugo adapter.
- `examples/react`: a small application with generated hooks.
- `tests/browser`: a browser fixture backed by a real Centrifugo container.
- `docs`: VitePress documentation.

Hooks live in `hooks/`, runtime owners and helpers in `utils/`, and shared contracts in `types/`. Internal contracts belong in each folder's `internal/` directory. Package roots export the supported public API explicitly.

## Code

Prefer descriptive names, early returns, and inferred types. Use `src/...` imports within each package. Keep lifecycle decisions in the owner responsible for cleanup. Avoid introducing a shared abstraction for a single use.

Add behavior tests for changes to subscription ownership, callbacks, or cleanup. Type-contract tests cover generic inference and invalid combinations. Keep hook JSDoc short and include an example.

Generated hooks, their manifest, and the codegen configuration schema are committed. If they change, regenerate them and include the output in the same change.

## Browser tests

Docker is required. Run `pnpm exec playwright install chromium firefox webkit` once, then `pnpm test:browser`. The suite starts its own Centrifugo container and test servers, and removes them on exit. Ports 4173–4175 must be free.

The fixture uses temporary signing keys and a server API bound to loopback. It is test infrastructure, not an authentication example for production.

## Changes and releases

Keep commits focused on one behavior or concern. Include relevant checks in the pull request description. Public API changes need documentation and a changelog entry. Release instructions are in [RELEASING.md](RELEASING.md).
