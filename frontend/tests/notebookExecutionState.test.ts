import { describe, expect, test } from "bun:test";
import {
  buildRunningMap,
  completeRunningCellStates,
} from "../src/components/WorkWindow/notebook/execution/notebookExecutionState";

describe("notebook execution state", () => {
  test("updates only the targeted cell state", () => {
    const current = {
      first: {
        isRunning: false,
        lastStatus: "ok" as const,
        startedAtMs: null,
        lastDurationMs: 12,
      },
    };

    expect(
      buildRunningMap(current, "second", {
        isRunning: true,
        lastStatus: null,
        startedAtMs: 100,
        lastDurationMs: null,
      }),
    ).toEqual({
      first: current.first,
      second: {
        isRunning: true,
        lastStatus: null,
        startedAtMs: 100,
        lastDurationMs: null,
      },
    });
  });

  test("completes running cells and preserves already finished cells", () => {
    const finished = completeRunningCellStates(
      {
        running: {
          isRunning: true,
          lastStatus: null,
          startedAtMs: 125,
          lastDurationMs: null,
        },
        settled: {
          isRunning: false,
          lastStatus: "ok",
          startedAtMs: null,
          lastDurationMs: 40,
        },
      },
      "error",
      200,
    );

    expect(finished).toEqual({
      running: {
        isRunning: false,
        lastStatus: "error",
        startedAtMs: null,
        lastDurationMs: 75,
      },
      settled: {
        isRunning: false,
        lastStatus: "ok",
        startedAtMs: null,
        lastDurationMs: 40,
      },
    });
  });
});
