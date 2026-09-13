export const reportUnhandledError = (error: unknown): void => {
  // Throw outside the SDK's dispatch chain so later publications still arrive.
  queueMicrotask(() => {
    throw error;
  });
};
