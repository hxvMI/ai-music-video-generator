import type { AudioTranscriptionResponse } from "@/types/videoProject";

// Leave room for multipart headers below Vercel's 4.5 MB request limit.
export const MAX_TRANSCRIPTION_UPLOAD_BYTES = 4_000_000;
export const TRANSCRIPTION_SAMPLE_RATE = 16_000;
export const TRANSCRIPTION_CHUNK_SECONDS = 90;

export function encodeTranscriptionWav(samples: Float32Array, sampleRate: number) {
  // A mono PCM WAV needs a 44-byte header, followed by two bytes per sample.
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const label = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index));
  };
  label(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true);
  label(8, "WAVE"); label(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  label(36, "data"); view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index++) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return buffer;
}

export async function prepareTranscriptionUploads(file: File, signal: AbortSignal) {
  if (file.size <= MAX_TRANSCRIPTION_UPLOAD_BYTES) return [{ file, offset: 0 }];
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try { decoded = await context.decodeAudioData(await file.arrayBuffer()); }
  finally { await context.close(); }
  signal.throwIfAborted();
  // Downmix and resample only the transcription copy; playback and export keep the original.
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * TRANSCRIPTION_SAMPLE_RATE), TRANSCRIPTION_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded; source.connect(offline.destination); source.start();
  const mono = (await offline.startRendering()).getChannelData(0);
  signal.throwIfAborted();
  const chunks = [];
  const length = TRANSCRIPTION_SAMPLE_RATE * TRANSCRIPTION_CHUNK_SECONDS;
  // Keep each chunk's position in the song; the provider starts its timestamps at zero.
  for (let start = 0; start < mono.length; start += length) {
    const wav = encodeTranscriptionWav(mono.subarray(start, start + length), TRANSCRIPTION_SAMPLE_RATE);
    chunks.push({ file: new File([wav], `transcription-${chunks.length + 1}.wav`, { type: "audio/wav" }),
      offset: start / TRANSCRIPTION_SAMPLE_RATE });
  }
  return chunks;
}

export function mergeTranscriptionChunks(chunks: Array<{ result: AudioTranscriptionResponse; offset: number }>): AudioTranscriptionResponse {
  const first = chunks[0].result;
  // If one chunk has no timestamps, keep the full transcript rather than showing partial lyrics.
  const allTimed = chunks.every(({ result }) => result.segments.length > 0);
  return { ...first, text: chunks.map(({ result }) => result.text).join("\n"),
    segments: allTimed ? chunks.flatMap(({ result, offset }, index) => result.segments.map((cue) => ({
      ...cue, id: `chunk-${index + 1}-${cue.id}`, startSeconds: cue.startSeconds + offset, endSeconds: cue.endSeconds + offset,
    }))) : [] };
}
