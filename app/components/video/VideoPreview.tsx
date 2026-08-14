"use client";

import { useEffect, useRef, useState } from "react";

import { VideoSceneContent } from "@/components/video/VideoSceneContent";
import type { PreparedVideoAssets, VideoProject } from "@/types/videoProject";

type Props = {
  project: VideoProject;
  preparedAssets: PreparedVideoAssets;
};

const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;

export default function VideoPreview({ project, preparedAssets }: Props) {
  const stageFrameRef = useRef<HTMLDivElement | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const { metadata, playback, style } = project;

  useEffect(() => {
    const stageFrame = stageFrameRef.current;

    if (!stageFrame) return;

    const updateScale = () => {
      setStageScale(stageFrame.clientWidth / STAGE_WIDTH);
    };
    const observer = new ResizeObserver(updateScale);

    updateScale();
    observer.observe(stageFrame);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={stageFrameRef}
      className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-lg border bg-black"
    >
      {/* LESSON CHECKPOINT:
          Remotion renders at 1920x1080 and the Player scales it down.
          The live preview now does the exact same thing, so visual sizes match.
      */}
      <div
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `scale(${stageScale})`,
          transformOrigin: "top left",
        }}
      >
        <VideoSceneContent
          metadata={metadata}
          style={style}
          audioAnalysis={project.audioAnalysis}
          assetUrls={{
            audioUrl: preparedAssets.audio.url,
            backgroundUrl: preparedAssets.background.url,
            logoUrl: preparedAssets.logo.url,
          }}
          currentTime={playback.currentTime}
          duration={playback.duration}
          isPlaying={playback.isPlaying}
        />
      </div>
    </div>
  );
}
