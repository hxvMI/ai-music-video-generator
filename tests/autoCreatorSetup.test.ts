import { describe, expect, it } from "vitest";
import { buildAutoCreatorSetup, parseTrackInfoFromFileName } from "../app/lib/autoCreatorSetup";

describe("Auto Director", () => {
  it("understands artist-title and title-by-artist filenames", () => {
    expect(parseTrackInfoFromFileName("Artist - Night Drive.mp3")).toEqual({
      artistName: "Artist", songTitle: "Night Drive",
    });
    expect(parseTrackInfoFromFileName("Night Drive by Artist.wav")).toEqual({
      artistName: "Artist", songTitle: "Night Drive",
    });
  });
  it("provides a deterministic local setup with separate overlay anchors", () => {
    const input = { fileName: "Artist - Test.wav", lyricsText: "First line\nSecond line",
      audioAnalysis: { durationSeconds: 60, hopSeconds: 1, points: [], dropTimes: [],
        summary: { averageEnergy: 0.5, peakEnergy: 0.7, dropCount: 0 } } };
    const setup = buildAutoCreatorSetup(input);
    expect(setup).toEqual(buildAutoCreatorSetup(input));
    expect(setup.style.layout.titlePosition).toBe("top-left");
    expect(setup.style.captions.position).toBe("center");
    expect(setup.style.layout.visualizerLayers[0].position).toBe("bottom-center");
  });
});
