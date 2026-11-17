import { describe, expect, it } from "vitest";
import { encodeTranscriptionWav, mergeTranscriptionChunks, MAX_TRANSCRIPTION_UPLOAD_BYTES,
  TRANSCRIPTION_CHUNK_SECONDS, TRANSCRIPTION_SAMPLE_RATE } from "../app/lib/transcriptionUpload";
import type { AudioTranscriptionResponse } from "../app/types/videoProject";

function transcript(text: string): AudioTranscriptionResponse {
  return { text, segments: [{ id: "one", text, startSeconds: 1, endSeconds: 3 }],
    provider: "cloudflare", model: "test", transcriptId: "test" };
}

describe("transcription upload preparation", () => {
  it("writes mono PCM audio with a valid header and clipped samples", () => {
    const buffer = encodeTranscriptionWav(new Float32Array([-2, 0, 2]), 16000);
    const view = new DataView(buffer);
    expect(new TextDecoder().decode(buffer.slice(0, 4))).toBe("RIFF");
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getInt16(44, true)).toBe(-32768);
    expect(view.getInt16(48, true)).toBe(32767);
    expect(44 + TRANSCRIPTION_SAMPLE_RATE * TRANSCRIPTION_CHUNK_SECONDS * 2).toBeLessThan(MAX_TRANSCRIPTION_UPLOAD_BYTES);
  });
  it("restores song-relative timing and unique IDs across chunks", () => {
    const result = mergeTranscriptionChunks([{ result: transcript("First"), offset: 0 },
      { result: transcript("Second"), offset: 90 }]);
    expect(result.text).toBe("First\nSecond");
    expect(result.segments.map((cue) => cue.startSeconds)).toEqual([1, 91]);
    expect(new Set(result.segments.map((cue) => cue.id)).size).toBe(2);
  });
  it("retains all lyrics if any chunk has no timing", () => {
    const result = mergeTranscriptionChunks([{ result: transcript("First"), offset: 0 },
      { result: { ...transcript("Second"), segments: [] }, offset: 90 }]);
    expect(result.segments).toEqual([]);
    expect(result.text).toBe("First\nSecond");
  });
});
