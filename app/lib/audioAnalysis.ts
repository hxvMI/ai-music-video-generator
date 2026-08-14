import type {
  AudioAnalysisPoint,
  VideoAudioAnalysis,
} from "../types/videoProject";

const ANALYSIS_SAMPLE_RATE = 22050;
const WINDOW_SECONDS = 0.08;
const HOP_SECONDS = 0.08;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeValues(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (!Number.isFinite(range) || range <= 0) {
    return values.map(() => 0);
  }

  return values.map((value) => clamp((value - min) / range, 0, 1));
}

function round(value: number, places = 4) {
  const scale = 10 ** places;

  return Math.round(value * scale) / scale;
}

function getMonoChannel(buffer: AudioBuffer) {
  const channelCount = buffer.numberOfChannels;
  const frameCount = buffer.length;
  const mono = new Float32Array(frameCount);

  for (let channel = 0; channel < channelCount; channel += 1) {
    const source = buffer.getChannelData(channel);

    for (let index = 0; index < frameCount; index += 1) {
      mono[index] += source[index] / channelCount;
    }
  }

  return mono;
}

function calculateWindowRms(samples: Float32Array, start: number, end: number) {
  let total = 0;
  const length = Math.max(end - start, 1);

  for (let index = start; index < end; index += 1) {
    total += samples[index] * samples[index];
  }

  return Math.sqrt(total / length);
}

function detectDropTimes(points: AudioAnalysisPoint[]) {
  const dropTimes: number[] = [];
  const minimumSpacingSeconds = 0.42;
  let previousDropTime = -Infinity;

  for (const point of points) {
    const isStrongHit = point.onset > 0.72 && point.energy > 0.38;

    if (isStrongHit && point.time - previousDropTime >= minimumSpacingSeconds) {
      dropTimes.push(round(point.time, 3));
      previousDropTime = point.time;
    }
  }

  return dropTimes;
}

export async function analyzeAudioFile(file: File): Promise<VideoAudioAnalysis> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new OfflineAudioContext(1, 1, ANALYSIS_SAMPLE_RATE);
  const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  const samples = getMonoChannel(decodedBuffer);
  const windowSize = Math.max(
    1,
    Math.floor(decodedBuffer.sampleRate * WINDOW_SECONDS)
  );
  const hopSize = Math.max(1, Math.floor(decodedBuffer.sampleRate * HOP_SECONDS));
  const rawEnergy: number[] = [];

  for (let start = 0; start < samples.length; start += hopSize) {
    const end = Math.min(start + windowSize, samples.length);
    rawEnergy.push(calculateWindowRms(samples, start, end));
  }

  const normalizedEnergy = normalizeValues(rawEnergy);
  const rawOnsets = normalizedEnergy.map((energy, index) => {
    const previous = normalizedEnergy[Math.max(index - 1, 0)];

    return Math.max(energy - previous, 0);
  });
  const normalizedOnsets = normalizeValues(rawOnsets);
  const points = normalizedEnergy.map<AudioAnalysisPoint>((energy, index) => ({
    time: round((index * hopSize) / decodedBuffer.sampleRate, 3),
    energy: round(energy),
    onset: round(normalizedOnsets[index] ?? 0),
  }));
  const dropTimes = detectDropTimes(points);
  const peakEnergy = Math.max(...normalizedEnergy, 0);
  const averageEnergy =
    normalizedEnergy.reduce((total, value) => total + value, 0) /
    Math.max(normalizedEnergy.length, 1);

  // LESSON CHECKPOINT:
  // This is our TypeScript version of B.A.R.D.'s beat_data idea. We turn audio
  // into compact, serializable timeline points so Remotion can render the same
  // beat-reactive camera/effects that the browser preview shows.
  return {
    durationSeconds: round(decodedBuffer.duration, 3),
    hopSeconds: round(hopSize / decodedBuffer.sampleRate, 3),
    points,
    dropTimes,
    summary: {
      averageEnergy: round(averageEnergy),
      peakEnergy: round(peakEnergy),
      dropCount: dropTimes.length,
    },
  };
}
