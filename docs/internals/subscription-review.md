# Subscription architecture review

Design history from 2026-09-13. Some APIs below were replaced in later passes; the [architecture document](architecture.md) describes the current implementation.

## Findings and changes

| Finding                                                                                | Implemented change                                                                                                             | Regression coverage                                                                                                                              |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Each consumer installed a native listener, causing an SDK warning during valid use.    | A stable typed listener table shares one native bridge per observed event. Consumer registrations survive session replacement. | Twenty-five consumers, identical callbacks, replacement, native listener removal, and no warning.                                                |
| Native acquisition crossed from channel to session and back through `beforeSubscribe`. | `RealtimeChannels` creates, binds, starts, and removes subscriptions in one local flow. Logical channels are plain records.    | Initial state delivery, options ending a session, cancellation during binding, setup failure, retry, and immediate resubscription after removal. |
| Consumer and native lifetimes overlapped through several scopes.                       | Consumer scopes own table membership. Native scopes own bridges. A consumer no longer jointly owns a native listener.          | Removing a listener, all channel consumers, or the session during dispatch suppresses later delivery.                                            |
| The generic resource store and switching adapters obscured session ordering.           | The client store directly owns replacement, observation, and startup. The session is a record with its full configuration.     | Replacement during options, state, observer callbacks, and cleanup registered before or after channel acquisition.                               |
| Every observable required cleanup-aware `onChange`.                                    | Snapshot values expose `get` and `subscribe`. Cleanup-aware observation stays on `client.onChange`.                            | Immediate observation, late cleanup, observer removal, nested replacement, isolated callback failures, and cleanup before disconnect.            |
| A status hook installed an unused callback listener.                                   | The extra effect subscription exists only when an optional callback is present.                                                | Callback absence, appearance, identity changes, removal, and unmount.                                                                            |
| Nested snapshot updates delivered the latest value twice to later observers.           | A nested update supersedes the older notification pass.                                                                        | Later listeners receive the final value once, including a change back to the original value.                                                     |

## Removed abstractions

The runtime no longer contains the `RealtimeChannel` or `RealtimeSession` lifecycle classes, `ResourceStore`, `createObservable`, `createObservableView`, `createObservableSelection`, `createEventSelection`, or `createEventSource`. Their useful behavior now lives in the actual owners and the shared event dispatcher. Tests tied only to removed helper APIs were replaced with owner-level behavior tests; credential checks exercise the client store and consumer cleanup directly.

`ResourceScope` and `ValueStore` remain focused primitives. The logical channel map remains necessary for shared demand and passive status observation. There is no additional lifecycle event bus, runtime Effect dependency, or snapshot scheduler.

## Identity and structure cleanup

The follow-up pass removed the remaining counter bookkeeping. Channel retention uses separate sets of event consumer and status observer IDs. Session attempts are identified by their own scopes, and a snapshot record combines its value with the identity of that change. Nested updates back to an earlier value remain distinguishable without a revision number.

Session ownership is grouped under `session.get`, `session.set`, and `session.subscribe`. The previous private getter/setter forwarding layer is gone. These methods remain internal; React context still exposes only observation views. Regression tests cover bound methods, reads during disposal, stale releases, failed registrations alongside active consumers, and a newer session that ends before an older setup resumes.

## Single session state

Session ownership now has one stored lifecycle record, rather than separate current and pending fields. The record is inactive, preparing with `client: null`, or active with a native client. Replacing it disposes the previous scope, so setup cancellation follows the actual lifetime without additional pending-identity checks.

Replacement is explicit: release the previous session, then prepare the new client. If preparation fails, the store remains inactive. This matches provider effect cleanup. Session observers see only visible value changes; a preparing session and an inactive session both read as `null`, with duplicate notifications suppressed. Tests cover failure with and without a previous session, cleanup ordering, nested replacement, and retry.

## Event binding and attachment cleanup

Repeated `EventListeners.bind` calls exposed an identity mismatch: the source record changed while bridges compared only the owner scope, causing event delivery to stop. Bindings now have a unique ID that is reused for the same emitter and scope. Every bridge and dispatch guard uses that binding ID. Rebinding another emitter under the same scope and retrying a partially failed binding both work.

Group lookup and native binding are separate methods. Native binding reserves its bridge before previous-listener cleanup, preventing duplicate or orphaned bridges if cleanup reenters binding or replaces a consumer. Regression tests cover repeated binding, mutation during dispatch and removal, stale owner disposal, retry, listener counts, and final cleanup.

Channel `subscription` metadata is now named `attachment` and contains only its scope and a session ID. Active session records receive an internal symbol ID; the public configuration's session ID remains unchanged. Native subscription cleanup captures the SDK client directly.

## Remaining checks are intentional

Cancellation checks follow real callback boundaries. Options can end or replace a session; native event binding can end acquisition; status notification and observer cleanup can acquire newer resources. Reserving before callbacks and checking identity afterward prevent duplicate subscriptions and stale startup. Renaming these checks into generic helpers would hide the ordering again.

The provider's live credential forwarding and internal session configuration type still describe a useful normalization boundary. Public hooks, typed generation, parsing, SDK contexts, passive status, SSR, StrictMode, and transport recovery retain their existing contracts. The Effect CLI is independent of runtime ownership and is included in package validation.
