import { useRealtimeStore } from "src/hooks/internal/useRealtimeStore";

/**
 * Diagnostics for the nearest provider, meant for devtools integrations.
 * Snapshots are plain copies. Event contexts are live SDK objects, so copy
 * what you keep.
 *
 * @example
 * ```ts
 * const diagnostics = useRealtimeDiagnostics();
 * useEffect(() => diagnostics.events.subscribe((event) => {
 *   console.log(event.type, event.channel);
 * }), [diagnostics]);
 * ```
 */
export const useRealtimeDiagnostics = () => useRealtimeStore().diagnostics;
