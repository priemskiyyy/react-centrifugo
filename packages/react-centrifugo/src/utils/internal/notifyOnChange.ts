/** Notifies only after the initial value changes, using Object.is equality. */
export const notifyOnChange = <TValue>(
  read: () => TValue,
  listener: () => void,
) => {
  let previous = read();

  return () => {
    const current = read();

    if (Object.is(current, previous)) {
      return;
    }

    previous = current;
    return listener();
  };
};
