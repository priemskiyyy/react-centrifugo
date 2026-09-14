/** Fails typecheck when a union dispatch misses a case. */
export const assertUnreachable = (value: never): never => {
  throw new Error(`Unreachable case: ${JSON.stringify(value)}`);
};
