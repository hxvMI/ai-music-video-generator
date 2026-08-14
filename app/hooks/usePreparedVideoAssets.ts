"use client";

import { useMemo } from "react";

import type {
  PreparedAsset,
  PreparedVideoAssets,
  VideoProject,
} from "@/types/videoProject";
import { useObjectUrl } from "@/hooks/useObjectUrl";

function createPreparedAsset(
  file: File | null,
  url: string | null,
  fallback?: {
    fileName: string;
    mimeType: string;
  }
): PreparedAsset {
  return {
    url,
    fileName: file?.name ?? fallback?.fileName ?? null,
    mimeType: file?.type ?? fallback?.mimeType ?? null,
    isReady: url !== null,
  };
}

export function usePreparedVideoAssets(
  project: VideoProject
): PreparedVideoAssets {
  const audioUrl = useObjectUrl(project.assets.audioFile);
  const backgroundUrl = useObjectUrl(project.assets.backgroundImage);
  const logoUrl = useObjectUrl(project.assets.logoImage);
  const effectiveBackgroundUrl =
    project.background.source === "upload"
      ? backgroundUrl
      : project.background.generatedDataUrl;

  const audio = useMemo(() => {
    return createPreparedAsset(project.assets.audioFile, audioUrl);
  }, [audioUrl, project.assets.audioFile]);

  const background = useMemo(() => {
    return createPreparedAsset(
      project.background.source === "upload"
        ? project.assets.backgroundImage
        : null,
      effectiveBackgroundUrl,
      {
        fileName:
          project.background.generation.provider === "openai"
            ? "AI generated background.jpg"
            : "Generated background.svg",
        mimeType:
          project.background.generation.provider === "openai"
            ? "image/jpeg"
            : "image/svg+xml",
      }
    );
  }, [
    effectiveBackgroundUrl,
    project.assets.backgroundImage,
    project.background.generation.provider,
    project.background.source,
  ]);

  const logo = useMemo(() => {
    return createPreparedAsset(project.assets.logoImage, logoUrl);
  }, [logoUrl, project.assets.logoImage]);

  return useMemo(
    () => ({ audio, background, logo }),
    [audio, background, logo]
  );
}
