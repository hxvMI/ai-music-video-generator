"use client";

import { Audio, useCurrentFrame, useVideoConfig } from "remotion";

import { VideoSceneContent } from "../video/VideoSceneContent";
import type { MusicVideoCompositionProps } from "../../types/videoProject";

export default function MusicVideoComposition({
  manifest,
  assetUrls,
}: MusicVideoCompositionProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsedTime = frame / fps;
  const currentTime = manifest.timeline.startsAtSeconds + elapsedTime;
  const audioStartFrame = Math.round(manifest.timeline.startsAtSeconds * fps);
  const audioEndFrame = Math.round(manifest.timeline.endsAtSeconds * fps);
  const audioUrl = assetUrls.audioUrl;
  const canRenderAudio = audioUrl !== null && audioEndFrame > audioStartFrame;

  return (
    <>
      {canRenderAudio && (
        <Audio
          src={audioUrl}
          startFrom={audioStartFrame}
          endAt={audioEndFrame}
        />
      )}

      <VideoSceneContent
        metadata={manifest.metadata}
        style={manifest.style}
        audioAnalysis={manifest.audioAnalysis}
        assetUrls={assetUrls}
        currentTime={currentTime}
        duration={manifest.timeline.sourceDurationSeconds}
        isPlaying
      />
    </>
  );
}
