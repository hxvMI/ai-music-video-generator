import type {
  PreparedVideoAssets,
  RemotionCompositionConfig,
  VideoExportManifest,
} from "@/types/videoProject";

export const MUSIC_VIDEO_COMPOSITION_ID = "MusicVideo";

export function buildRemotionCompositionConfig({
  manifest,
  preparedAssets,
}: {
  manifest: VideoExportManifest;
  preparedAssets: PreparedVideoAssets;
}): RemotionCompositionConfig {
  // LESSON CHECKPOINT - Composition config:
  // Remotion needs a stable set of render inputs:
  // - which composition to render
  // - width/height/fps
  // - duration in frames
  // - serializable props for the scene
  //
  // Keeping this in a lib function means the app preview and future MP4 export
  // can share the exact same configuration.
  return {
    compositionId: MUSIC_VIDEO_COMPOSITION_ID,
    inputProps: {
      manifest,
      assetUrls: {
        audioUrl: preparedAssets.audio.url,
        backgroundUrl: preparedAssets.background.url,
        logoUrl: preparedAssets.logo.url,
      },
    },
    durationInFrames: Math.max(manifest.renderSettings.durationFrames, 1),
    compositionWidth: manifest.renderSettings.width,
    compositionHeight: manifest.renderSettings.height,
    fps: manifest.renderSettings.fps,
  };
}
