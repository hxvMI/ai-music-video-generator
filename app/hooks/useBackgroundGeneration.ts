"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getBackgroundRequestFingerprint } from "@/lib/backgroundStudio";
import { buildAiProviderHeaders } from "@/lib/aiProvider";
import type {
  BackgroundGenerationErrorResponse,
  BackgroundGenerationRequest,
  BackgroundGenerationResponse,
  BackgroundPresetId,
  BackgroundPromptFields,
  VideoBackgroundConfig,
  AiProviderConnection,
} from "@/types/videoProject";

type BackgroundGenerationOptions = {
  presetId: BackgroundPresetId;
  prompt: BackgroundPromptFields;
  localDataUrl: string;
  connection: AiProviderConnection;
};

type AiBackgroundResult = BackgroundGenerationResponse & {
  requestFingerprint: string;
};

export function useBackgroundGeneration({
  presetId,
  prompt,
  localDataUrl,
  connection,
}: BackgroundGenerationOptions) {
  const [result, setResult] = useState<AiBackgroundResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const request = useMemo<BackgroundGenerationRequest>(
    () => ({ presetId, prompt }),
    [presetId, prompt]
  );
  const requestFingerprint = useMemo(
    () => getBackgroundRequestFingerprint(request),
    [request]
  );

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, []);

  const generate = useCallback(async () => {
    requestControllerRef.current?.abort();

    const controller = new AbortController();
    const submittedRequest = request;
    const submittedFingerprint = requestFingerprint;
    requestControllerRef.current = controller;
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/backgrounds/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAiProviderHeaders(connection),
        },
        body: JSON.stringify(submittedRequest),
        signal: controller.signal,
      });
      const responseBody = (await response.json()) as
        | BackgroundGenerationResponse
        | BackgroundGenerationErrorResponse;

      if (!response.ok || "error" in responseBody) {
        throw new Error(
          "error" in responseBody
            ? responseBody.error
            : "Unable to generate a background."
        );
      }

      setResult({
        ...responseBody,
        requestFingerprint: submittedFingerprint,
      });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;

      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to generate a background."
      );
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setIsGenerating(false);
      }
    }
  }, [connection, request, requestFingerprint]);

  const useLocalTemplate = useCallback(() => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    setResult(null);
    setIsGenerating(false);
    setError(null);
  }, []);

  const restoreGeneratedBackground = useCallback(
    ({
      dataUrl,
      generation,
      restoredPresetId,
      restoredPrompt,
    }: {
      dataUrl: string;
      generation: VideoBackgroundConfig["generation"];
      restoredPresetId?: BackgroundPresetId;
      restoredPrompt?: BackgroundPromptFields;
    }) => {
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
      setIsGenerating(false);
      setError(null);

      if (generation.provider === "local" || !dataUrl.startsWith("data:")) {
        setResult(null);
        return;
      }

      setResult({
        dataUrl,
        mimeType: "image/jpeg",
        provider: generation.provider,
        model: generation.model ?? "restored-background",
        generationId: generation.generationId ?? "restored-background",
        requestFingerprint:
          restoredPresetId && restoredPrompt
            ? getBackgroundRequestFingerprint({
                presetId: restoredPresetId,
                prompt: restoredPrompt,
              })
            : requestFingerprint,
      });
    },
    [requestFingerprint]
  );

  return {
    generate,
    reset: useLocalTemplate,
    useLocalTemplate,
    restoreGeneratedBackground,
    generatedDataUrl: result?.dataUrl ?? localDataUrl,
    generation: {
      provider: result?.provider ?? "local",
      model: result?.model ?? null,
      generationId: result?.generationId ?? null,
    } satisfies VideoBackgroundConfig["generation"],
    hasAiBackground: result !== null,
    isStale:
      result !== null && result.requestFingerprint !== requestFingerprint,
    isGenerating,
    error,
  };
}
