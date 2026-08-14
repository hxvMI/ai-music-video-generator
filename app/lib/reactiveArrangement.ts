import type {
  AudioAnalysisPoint,
  CameraPreset,
  EffectPreset,
  ReactiveTimeline,
  ReactiveZone,
  ReactiveZoneKind,
  VideoAudioAnalysis,
  VisualizerPreset,
} from "@/types/videoProject";

export const MAX_REACTIVE_ZONES = 12;
export const MIN_REACTIVE_ZONE_SECONDS = 1;

export const REACTIVE_ZONE_LABELS: Record<ReactiveZoneKind, string> = {
  intro: "Intro",
  steady: "Steady",
  build: "Build",
  drop: "Drop",
  breakdown: "Breakdown",
  outro: "Outro",
};

export const REACTIVE_ZONE_COLORS: Record<ReactiveZoneKind, string> = {
  intro: "#64748B",
  steady: "#0891B2",
  build: "#D97706",
  drop: "#DC2626",
  breakdown: "#7C3AED",
  outro: "#475569",
};

type ZonePreset = {
  intensity: number;
  visualizerPreset: VisualizerPreset;
  cameraPreset: CameraPreset;
  effectPreset: EffectPreset;
};

const ZONE_PRESETS: Record<ReactiveZoneKind, ZonePreset> = {
  intro: {
    intensity: 0.35,
    visualizerPreset: "minimal",
    cameraPreset: "steady",
    effectPreset: "clean",
  },
  steady: {
    intensity: 0.58,
    visualizerPreset: "waveform",
    cameraPreset: "float",
    effectPreset: "glow",
  },
  build: {
    intensity: 0.78,
    visualizerPreset: "stacked",
    cameraPreset: "pulse",
    effectPreset: "glow",
  },
  drop: {
    intensity: 1,
    visualizerPreset: "spectrum",
    cameraPreset: "shake",
    effectPreset: "flash",
  },
  breakdown: {
    intensity: 0.42,
    visualizerPreset: "cinematic",
    cameraPreset: "drift",
    effectPreset: "vignette",
  },
  outro: {
    intensity: 0.3,
    visualizerPreset: "minimal",
    cameraPreset: "steady",
    effectPreset: "clean",
  },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundTime(value: number) {
  return Math.round(value * 1000) / 1000;
}

function getPointNearTime(
  analysis: VideoAudioAnalysis,
  time: number
): AudioAnalysisPoint {
  const index = clamp(
    Math.round(time / Math.max(analysis.hopSeconds, 0.01)),
    0,
    analysis.points.length - 1
  );

  return analysis.points[index] ?? { time, energy: 0, onset: 0 };
}

function getAverageEnergy(
  analysis: VideoAudioAnalysis,
  startSeconds: number,
  endSeconds: number
) {
  const points = analysis.points.filter(
    (point) => point.time >= startSeconds && point.time < endSeconds
  );

  if (points.length === 0) return analysis.summary.averageEnergy;

  return (
    points.reduce((total, point) => total + point.energy, 0) / points.length
  );
}

function getGapKind(
  analysis: VideoAudioAnalysis,
  startSeconds: number,
  endSeconds: number
): ReactiveZoneKind {
  const energy = getAverageEnergy(analysis, startSeconds, endSeconds);

  return energy < analysis.summary.averageEnergy * 0.78
    ? "breakdown"
    : "steady";
}

function createZone(
  kind: ReactiveZoneKind,
  startSeconds: number,
  endSeconds: number
): ReactiveZone {
  return {
    id: "",
    kind,
    startSeconds: roundTime(startSeconds),
    endSeconds: roundTime(endSeconds),
    ...ZONE_PRESETS[kind],
  };
}

function assignZoneIds(zones: ReactiveZone[]) {
  return zones.map((zone, index) => ({
    ...zone,
    id: `zone-${index + 1}-${zone.kind}`,
  }));
}

function selectMajorDrops(analysis: VideoAudioAnalysis) {
  const duration = analysis.durationSeconds;
  const introMargin = clamp(duration * 0.1, 6, 16);
  const outroMargin = clamp(duration * 0.1, 6, 16);
  const minimumSpacing = clamp(duration / 8, 10, 18);
  const ranked = analysis.dropTimes
    .filter(
      (time) =>
        time > introMargin + 3 && time < duration - outroMargin - 3
    )
    .map((time) => {
      const point = getPointNearTime(analysis, time);

      return {
        time,
        score: point.onset * 0.65 + point.energy * 0.35,
      };
    })
    .sort((left, right) => right.score - left.score);
  const selected: number[] = [];

  for (const candidate of ranked) {
    if (
      selected.every(
        (selectedTime) =>
          Math.abs(selectedTime - candidate.time) >= minimumSpacing
      )
    ) {
      selected.push(candidate.time);
    }

    if (selected.length === 4) break;
  }

  return selected.sort((left, right) => left - right);
}

export function buildAutomaticReactiveTimeline(
  analysis: VideoAudioAnalysis | null
): ReactiveTimeline {
  const duration = analysis?.durationSeconds ?? 0;

  if (!analysis || duration <= 0 || analysis.points.length === 0) {
    return {
      mode: "auto",
      zones: [],
    };
  }

  if (duration < 12) {
    return {
      mode: "auto",
      zones: assignZoneIds([createZone("steady", 0, duration)]),
    };
  }

  const introLength = clamp(duration * 0.1, 5, 14);
  const outroLength = clamp(duration * 0.09, 5, 14);
  const outroStart = Math.max(introLength, duration - outroLength);
  const majorDrops = selectMajorDrops(analysis).filter(
    (time) => time > introLength && time < outroStart
  );
  const zones: ReactiveZone[] = [createZone("intro", 0, introLength)];
  let cursor = introLength;
  const baseZoneCount = 3 + majorDrops.length * 2;
  let remainingInternalGapZones = Math.max(
    MAX_REACTIVE_ZONES - baseZoneCount,
    0
  );

  for (const dropTime of majorDrops) {
    const idealBuildStart = Math.max(cursor, dropTime - 6);
    const gapDuration = idealBuildStart - cursor;

    if (gapDuration >= 4 && remainingInternalGapZones > 0) {
      zones.push(
        createZone(
          getGapKind(analysis, cursor, idealBuildStart),
          cursor,
          idealBuildStart
        )
      );
      cursor = idealBuildStart;
      remainingInternalGapZones -= 1;
    }

    if (dropTime - cursor >= MIN_REACTIVE_ZONE_SECONDS) {
      zones.push(createZone("build", cursor, dropTime));
    }

    const dropEnd = Math.min(
      outroStart,
      Math.max(dropTime + 4, Math.min(dropTime + 8, outroStart))
    );

    if (dropEnd - dropTime >= MIN_REACTIVE_ZONE_SECONDS) {
      zones.push(createZone("drop", dropTime, dropEnd));
      cursor = dropEnd;
    } else {
      cursor = dropTime;
    }
  }

  if (outroStart - cursor >= MIN_REACTIVE_ZONE_SECONDS) {
    zones.push(
      createZone(
        getGapKind(analysis, cursor, outroStart),
        cursor,
        outroStart
      )
    );
  } else if (zones.length > 0) {
    zones[zones.length - 1] = {
      ...zones[zones.length - 1],
      endSeconds: roundTime(outroStart),
    };
  }

  zones.push(createZone("outro", outroStart, duration));

  return {
    mode: "auto",
    zones: assignZoneIds(zones.slice(0, MAX_REACTIVE_ZONES)),
  };
}

export function getActiveReactiveZone(
  zones: ReactiveZone[],
  currentTime: number
) {
  if (zones.length === 0) return null;

  return (
    zones.find(
      (zone, index) =>
        currentTime >= zone.startSeconds &&
        (currentTime < zone.endSeconds || index === zones.length - 1)
    ) ?? zones[zones.length - 1]
  );
}

export function getReactiveZoneIntensity(
  zones: ReactiveZone[],
  currentTime: number
) {
  const activeIndex = zones.findIndex(
    (zone, index) =>
      currentTime >= zone.startSeconds &&
      (currentTime < zone.endSeconds || index === zones.length - 1)
  );

  if (activeIndex < 0) return 1;

  const activeZone = zones[activeIndex];
  const previousZone = zones[activeIndex - 1];
  const nextZone = zones[activeIndex + 1];
  const transitionSeconds = 0.45;

  if (
    activeZone.kind !== "drop" &&
    previousZone &&
    currentTime < activeZone.startSeconds + transitionSeconds
  ) {
    const progress = clamp(
      (currentTime - activeZone.startSeconds) / transitionSeconds,
      0,
      1
    );

    return (
      previousZone.intensity +
      (activeZone.intensity - previousZone.intensity) * progress
    );
  }

  if (
    nextZone &&
    nextZone.kind !== "drop" &&
    currentTime > activeZone.endSeconds - transitionSeconds
  ) {
    const progress = clamp(
      (currentTime - (activeZone.endSeconds - transitionSeconds)) /
        transitionSeconds,
      0,
      1
    );

    return (
      activeZone.intensity +
      (nextZone.intensity - activeZone.intensity) * progress
    );
  }

  return activeZone.intensity;
}

export function updateReactiveZone(
  zones: ReactiveZone[],
  zoneId: string,
  updates: Partial<
    Pick<
      ReactiveZone,
      | "kind"
      | "intensity"
      | "visualizerPreset"
      | "cameraPreset"
      | "effectPreset"
    >
  >
) {
  return zones.map((zone) => {
    if (zone.id !== zoneId) return zone;

    const kindChanged = updates.kind && updates.kind !== zone.kind;
    const nextPreset = kindChanged ? ZONE_PRESETS[updates.kind!] : null;

    return {
      ...zone,
      ...(nextPreset ?? {}),
      ...updates,
      intensity: clamp(
        updates.intensity ?? nextPreset?.intensity ?? zone.intensity,
        0,
        1
      ),
    };
  });
}

export function moveReactiveBoundary(
  zones: ReactiveZone[],
  leftZoneIndex: number,
  requestedTime: number
) {
  const leftZone = zones[leftZoneIndex];
  const rightZone = zones[leftZoneIndex + 1];

  if (!leftZone || !rightZone) return zones;

  const safeTime = roundTime(
    clamp(
      requestedTime,
      leftZone.startSeconds + MIN_REACTIVE_ZONE_SECONDS,
      rightZone.endSeconds - MIN_REACTIVE_ZONE_SECONDS
    )
  );

  return zones.map((zone, index) => {
    if (index === leftZoneIndex) {
      return { ...zone, endSeconds: safeTime };
    }

    if (index === leftZoneIndex + 1) {
      return { ...zone, startSeconds: safeTime };
    }

    return zone;
  });
}

export function splitReactiveZone(zones: ReactiveZone[], zoneId: string) {
  if (zones.length >= MAX_REACTIVE_ZONES) return zones;

  const zoneIndex = zones.findIndex((zone) => zone.id === zoneId);
  const zone = zones[zoneIndex];

  if (
    !zone ||
    zone.endSeconds - zone.startSeconds < MIN_REACTIVE_ZONE_SECONDS * 2
  ) {
    return zones;
  }

  const midpoint = roundTime((zone.startSeconds + zone.endSeconds) / 2);
  const nextZones = [
    ...zones.slice(0, zoneIndex),
    { ...zone, endSeconds: midpoint },
    { ...zone, startSeconds: midpoint },
    ...zones.slice(zoneIndex + 1),
  ];

  return assignZoneIds(nextZones);
}

export function removeReactiveZone(zones: ReactiveZone[], zoneId: string) {
  if (zones.length <= 1) return zones;

  const zoneIndex = zones.findIndex((zone) => zone.id === zoneId);
  const zone = zones[zoneIndex];

  if (!zone) return zones;

  const nextZones = zones.filter((item) => item.id !== zoneId);

  if (zoneIndex === 0) {
    nextZones[0] = {
      ...nextZones[0],
      startSeconds: zone.startSeconds,
    };
  } else {
    nextZones[zoneIndex - 1] = {
      ...nextZones[zoneIndex - 1],
      endSeconds: zone.endSeconds,
    };
  }

  return assignZoneIds(nextZones);
}

export function isValidReactiveTimeline(
  zones: ReactiveZone[],
  duration: number
) {
  if (zones.length === 0) return duration <= 0;
  if (zones.length > MAX_REACTIVE_ZONES) return false;
  if (Math.abs(zones[0].startSeconds) > 0.001) return false;
  if (
    Math.abs(zones[zones.length - 1].endSeconds - duration) > 0.001
  ) {
    return false;
  }

  return zones.every((zone, index) => {
    const nextZone = zones[index + 1];
    const hasValidDuration =
      zone.endSeconds - zone.startSeconds >= MIN_REACTIVE_ZONE_SECONDS;
    const joinsNext =
      !nextZone ||
      Math.abs(zone.endSeconds - nextZone.startSeconds) <= 0.001;

    return hasValidDuration && joinsNext;
  });
}
