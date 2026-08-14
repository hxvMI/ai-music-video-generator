"use client";

import { useEffect, useMemo, useState } from "react";

import { analyzeAudioFile } from "../lib/audioAnalysis";
import type { VideoAudioAnalysis } from "../types/videoProject";

type AnalysisState = {
  fileKey: string | null;
  analysis: VideoAudioAnalysis | null;
  error: string | null;
};

function getFileKey(file: File | null) {
  if (!file) return null;

  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function useAudioAnalysis(audioFile: File | null) {
  const fileKey = useMemo(() => getFileKey(audioFile), [audioFile]);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    fileKey: null,
    analysis: null,
    error: null,
  });

  useEffect(() => {
    if (!audioFile || !fileKey) return;

    let isCancelled = false;

    void analyzeAudioFile(audioFile)
      .then((analysis) => {
        if (isCancelled) return;

        setAnalysisState({
          fileKey,
          analysis,
          error: null,
        });
      })
      .catch((reason) => {
        if (isCancelled) return;

        setAnalysisState({
          fileKey,
          analysis: null,
          error:
            reason instanceof Error
              ? reason.message
              : "Unable to analyze this audio file.",
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [audioFile, fileKey]);

  if (!audioFile || !fileKey) {
    return {
      analysis: null,
      isAnalyzing: false,
      error: null,
    };
  }

  const hasCurrentResult = analysisState.fileKey === fileKey;

  return {
    analysis: hasCurrentResult ? analysisState.analysis : null,
    isAnalyzing: !hasCurrentResult,
    error: hasCurrentResult ? analysisState.error : null,
  };
}
