import { describe, expect, it } from "vitest";
import { createAppEventBus } from "../createAppEventBus";
import { AppEvent } from "../events";

describe("typed EventBus", () => {
  it("emits typed payloads to subscribers", () => {
    const eventBus = createAppEventBus();
    const received: number[] = [];

    eventBus.on(AppEvent.CoreAssembleStarted, (payload) => {
      received.push(payload.sourceLength);
    });

    eventBus.emit(AppEvent.CoreAssembleStarted, { sourceLength: 42 });

    expect(received).toEqual([42]);
  });

  it("unsubscribes handlers to avoid leaks", () => {
    const eventBus = createAppEventBus();
    let count = 0;
    const unsubscribe = eventBus.on(AppEvent.VmStepCompleted, () => {
      count += 1;
    });

    expect(eventBus.listenerCount(AppEvent.VmStepCompleted)).toBe(1);
    eventBus.emit(AppEvent.VmStepCompleted, { stepCount: 1, instruction: "LD GR1,A" });
    unsubscribe();
    eventBus.emit(AppEvent.VmStepCompleted, { stepCount: 2, instruction: "ADDA GR1,B" });

    expect(count).toBe(1);
    expect(eventBus.listenerCount(AppEvent.VmStepCompleted)).toBe(0);
  });
});
