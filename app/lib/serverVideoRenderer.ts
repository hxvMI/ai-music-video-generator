import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { stat } from "node:fs/promises";
import path from "node:path";

import { MUSIC_VIDEO_COMPOSITION_ID } from "@/lib/remotionCompositionConfig";
import type {
  RenderJobAsset,
  RemotionAssetUrls,
  VideoExportManifest,
  VideoRenderPlan,
} from "@/types/videoProject";

type RenderSavedJobParams = {
  manifest: VideoExportManifest;
  renderPlan: VideoRenderPlan;
  jobFolder: string;
  uploadedAssets: RenderJobAsset[];
  assetUrls: RemotionAssetUrls;
  onProgress?: (progress: {
    stage: "bundling" | "resolving-composition" | "rendering" | "finalizing";
    percent: number;
    renderedFrames?: number;
    encodedFrames?: number;
  }) => void | Promise<void>;
};

type RenderedVideoOutput = {
  fileName: string;
  relativePath: string;
  sizeBytes: number;
  contentType: "video/mp4";
};

export async function renderSavedVideoJob({
  manifest,
  renderPlan,
  jobFolder,
  assetUrls,
  onProgress,
}: RenderSavedJobParams): Promise<RenderedVideoOutput> {
  const entryPoint = path.join(process.cwd(), "remotion", "index.ts");
  const outputFileName = renderPlan.output.fileName;
  const outputLocation = path.join(jobFolder, outputFileName);
  const inputProps = {
    manifest,
    assetUrls,
  };

  const serveUrl = await bundle({
    entryPoint,
    enableCaching: true,
    onProgress: (progress) => {
      const normalizedProgress = progress > 1 ? progress / 100 : progress;

      void onProgress?.({
        stage: "bundling",
        percent: Math.min(Math.max(normalizedProgress, 0), 1) * 0.16,
      });
    },
  });
  await onProgress?.({
    stage: "resolving-composition",
    percent: 0.18,
  });
  const compositions = await getCompositions(serveUrl, {
    inputProps,
  });
  const composition = compositions.find(
    (item) => item.id === MUSIC_VIDEO_COMPOSITION_ID
  );

  if (!composition) {
    throw new Error(`Could not find ${MUSIC_VIDEO_COMPOSITION_ID} composition.`);
  }

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps,
    overwrite: true,
    concurrency: 1,
    logLevel: "warn",
    onProgress: (progress) => {
      void onProgress?.({
        stage: "rendering",
        percent: 0.2 + progress.progress * 0.75,
        renderedFrames: progress.renderedFrames,
        encodedFrames: progress.encodedFrames,
      });
    },
  });

  await onProgress?.({
    stage: "finalizing",
    percent: 0.98,
  });

  const outputStats = await stat(outputLocation);

  return {
    fileName: outputFileName,
    relativePath: path.join(renderPlan.id, outputFileName),
    sizeBytes: outputStats.size,
    contentType: "video/mp4",
  };
}
