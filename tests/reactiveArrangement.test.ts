import { describe, expect, it } from "vitest";

import {
  getActiveReactiveZone,
  isValidReactiveTimeline,
  moveReactiveBoundary,
  splitReactiveZone,
  buildAutomaticReactiveTimeline,
  getReactiveZoneIntensity,
} from "../app/lib/reactiveArrangement";
import type { ReactiveZone } from "../app/types/videoProject";

function createZone(
  id: string,
  startSeconds: number,
  endSeconds: number
): ReactiveZone {
  return {
    id,
    kind: "steady",
    startSeconds,
    endSeconds,
    intensity: 0.5,
    visualizerPreset: "waveform",
    cameraPreset: "float",
    effectPreset: "clean",
  };
}

describe("reactive arrangement editing", () => {
  it("joins normal transitions smoothly and retains hard cuts into drops", () => {
    const zones = [{ ...createZone("a", 0, 5), intensity: 0.2 },
      { ...createZone("b", 5, 10), intensity: 0.8 }];
    expect(Math.abs(getReactiveZoneIntensity(zones, 4.999) -
      getReactiveZoneIntensity(zones, 5.001))).toBeLessThan(0.01);
    zones[1].kind = "drop";
    expect(getReactiveZoneIntensity(zones, 5)).toBe(0.8);
  });

  it("rejects invalid boundary and zone numeric values", () => {
    const zones = [createZone("a", 0, 5), createZone("b", 5, 10)];
    expect(moveReactiveBoundary(zones, 0, NaN)).toBe(zones);
    expect(isValidReactiveTimeline([{ ...zones[0], intensity: NaN }], 5)).toBe(false);
  });

  it("creates full-track arrangements for short, quiet, sparse and drop-heavy audio", () => {
    for (const duration of [0.4, 3, 12, 19, 60, 180, 300]) {
      for (const sparse of [false, true]) {
        const timeline = buildAutomaticReactiveTimeline({
          durationSeconds: duration, hopSeconds: 1,
          points: sparse ? [] : Array.from({ length: Math.ceil(duration) }, (_, time) => ({ time, energy: 0.5, onset: 0.8 })),
          dropTimes: Array.from({ length: 20 }, (_, i) => duration * (i + 1) / 21),
          summary: { averageEnergy: 0.5, peakEnergy: 0.8, dropCount: 20 },
        });
        expect(isValidReactiveTimeline(timeline.zones, duration)).toBe(true);
        expect(timeline.zones.length).toBeLessThanOrEqual(12);
      }
    }
  });
  it("keeps moved boundaries contiguous and enforces minimum duration", () => {
    const zones = [createZone("a", 0, 5), createZone("b", 5, 10)];
    const moved = moveReactiveBoundary(zones, 0, 9.8);

    expect(moved[0].endSeconds).toBe(9);
    expect(moved[1].startSeconds).toBe(9);
    expect(isValidReactiveTimeline(moved, 10)).toBe(true);
  });

  it("splits a zone without introducing a gap", () => {
    const split = splitReactiveZone([createZone("a", 0, 10)], "a");

    expect(split).toHaveLength(2);
    expect(split[0].endSeconds).toBe(split[1].startSeconds);
    expect(isValidReactiveTimeline(split, 10)).toBe(true);
  });

  it("selects the final zone at the exact end of the track", () => {
    const zones = [createZone("a", 0, 5), createZone("b", 5, 10)];

    expect(getActiveReactiveZone(zones, 10)?.id).toBe("b");
  });
});
