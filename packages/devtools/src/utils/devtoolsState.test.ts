import { expect, test } from "vitest";
import { devtoolsReducer, initialDevtoolsState } from "src/utils/devtoolsState";

test("only user-driven open and close move focus, and close records when it happened", () => {
  expect(initialDevtoolsState(true).panel).toEqual({
    status: "OPEN",
    focusPanel: false,
  });
  const closed = devtoolsReducer(initialDevtoolsState(true), {
    type: "CLOSE",
    at: 42,
  });
  expect(closed.panel).toEqual({
    status: "CLOSED",
    focusLauncher: true,
    closedAt: 42,
  });
  expect(devtoolsReducer(closed, { type: "OPEN" }).panel).toEqual({
    status: "OPEN",
    focusPanel: true,
  });
});

test("recording toggles are independent of the panel", () => {
  const paused = devtoolsReducer(initialDevtoolsState(false), {
    type: "TOGGLE_PAUSE",
  });
  expect(paused.recording).toEqual({ isPaused: true, capturePayloads: false });
  expect(paused.panel).toEqual(initialDevtoolsState(false).panel);
  expect(
    devtoolsReducer(paused, { type: "SET_CAPTURE_PAYLOADS", enabled: true })
      .recording,
  ).toEqual({ isPaused: true, capturePayloads: true });
});
