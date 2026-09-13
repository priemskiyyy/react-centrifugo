export type RealtimeEventHandler<TContext> = (
  context: TContext,
) => void | Promise<unknown>;
