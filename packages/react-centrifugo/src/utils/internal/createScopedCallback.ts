import { UnauthorizedError } from "centrifuge";

export const createScopedCallback = <TArguments extends unknown[], TResult>(
  callback: (...args: TArguments) => Promise<TResult> | undefined,
  isActive: () => boolean,
) => {
  const requireActiveScope = () => {
    if (!isActive()) {
      throw new UnauthorizedError("The realtime resource has been released.");
    }
  };

  return (...args: TArguments): Promise<TResult> =>
    Promise.resolve()
      .then(() => {
        // Released resources must not read fresh credentials or accept late results.
        requireActiveScope();

        const result = callback(...args);

        if (result === undefined) {
          throw new UnauthorizedError("The realtime callback was removed.");
        }

        return result;
      })
      .then((result) => {
        requireActiveScope();

        return result;
      });
};
