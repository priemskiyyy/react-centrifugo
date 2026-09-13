import { reportUnhandledError } from "src/utils/internal/reportUnhandledError";

export const invokeIsolated = (
  callback: () => void | Promise<unknown>,
): void => {
  try {
    const result = callback();
    if (result === undefined) {
      return;
    }

    Promise.resolve(result).catch(reportUnhandledError);
  } catch (error) {
    reportUnhandledError(error);
  }
};
