"use client";

import { memo, useEffect, useRef, useState } from "react";
import { VideoSceneContent } from "./VideoSceneContent";
import { buildGeneratedBackgroundDataUrl, DEFAULT_BACKGROUND_PROMPT } from "@/lib/backgroundStudio";
import { DEFAULT_VIDEO_CAPTIONS } from "@/lib/videoCaptions";
import type { VideoProject } from "@/types/videoProject";

type Preset = Pick<VideoProject["style"], "theme" | "layout" | "visualMode" | "visualizerColor" | "visualizerPreset" | "cameraPreset" | "effectPreset">;
const backgroundUrl = buildGeneratedBackgroundDataUrl({ presetId: "cinematic-dark", prompt: DEFAULT_BACKGROUND_PROMPT });

function VisualPresetThumbnail({ preset }: { preset: Preset }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setScale(element.clientWidth / 1920));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Render the actual scene at a fixed timestamp so the gallery matches the applied preset.
  return (
    <div ref={frame} aria-hidden="true" className="preset-thumbnail">
      <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <VideoSceneContent metadata={{ songTitle: "YOUR TRACK", artistName: "Artist name" }}
          style={{ ...preset, randomSeed: 1, reactiveTimeline: { mode: "auto", zones: [] }, captions: DEFAULT_VIDEO_CAPTIONS }}
          assetUrls={{ audioUrl: null, backgroundUrl, logoUrl: null }} audioAnalysis={null}
          currentTime={12} duration={180} isPlaying={false} />
      </div>
    </div>
  );
}

export default memo(VisualPresetThumbnail);
