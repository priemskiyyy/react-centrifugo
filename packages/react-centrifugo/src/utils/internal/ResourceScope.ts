const captureError = (task: () => void): unknown[] => {
  try {
    task();
    return [];
  } catch (error) {
    return [error];
  }
};

const combineErrors = (errors: unknown[], message: string) => {
  if (errors.length === 1) {
    return errors[0];
  }

  return new AggregateError(errors, message);
};

export class ResourceScope {
  #active = true;
  #cleanups = new Set<() => void>();

  isActive = () => this.#active;

  addCleanup = (cleanup: () => void) => {
    const release = () => {
      if (!this.#cleanups.delete(release)) {
        return;
      }

      cleanup();
    };

    this.#cleanups.add(release);

    if (!this.#active) {
      release();
    }

    return release;
  };

  /** Ties a child to this scope; whichever ends first releases the other's hold. */
  adopt = (child: ResourceScope) => {
    const release = this.addCleanup(child.dispose);
    // Drop the hold without running it: the child is already disposing itself.
    child.addCleanup(() => {
      this.#cleanups.delete(release);
    });
    return child.dispose;
  };

  setup = <TResult>(initialize: () => TResult) => {
    try {
      return initialize();
    } catch (error) {
      throw combineErrors(
        [error, ...captureError(this.dispose)],
        "Resource setup and cleanup failed.",
      );
    }
  };

  dispose = () => {
    if (!this.#active) {
      return;
    }

    this.#active = false;
    const errors = [...this.#cleanups].reverse().flatMap(captureError);

    if (errors.length === 0) {
      return;
    }

    throw combineErrors(errors, "Resource cleanup failed.");
  };
}
