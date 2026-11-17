"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { buildAiProviderHeaders } from "@/lib/aiProvider";
import { readApiResponse } from "@/lib/apiResponse";
import { mergeTranscriptionChunks, prepareTranscriptionUploads } from "@/lib/transcriptionUpload";

import type {
  AiProviderConnection,
  AudioTranscriptionResponse,
} from "@/types/videoProject";

type TranscriptionStatus =
  | "idle"
  | "transcribing"
  | "succeeded"
  | "failed"
  | "unavailable";

type UseAudioTranscriptionOptions = {
  enabled?: boolean;
  connection: AiProviderConnection;
};

export function useAudioTranscription(
  audioFile: File | null,
  { enabled = true, connection }: UseAudioTranscriptionOptions
) {
  const [text, setText] = useState("");
  const [segments, setSegments] = useState<AudioTranscriptionResponse["segments"]>([]);
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const transcribe = useCallback(async (): Promise<AudioTranscriptionResponse | null> => {
    abortControllerRef.current?.abort();

    if (!audioFile) {
      setText("");
      setSegments([]);
      setStatus("idle");
      setError(null);
      return null;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatus("transcribing");
    setError(null);

    try {
      const uploads = await prepareTranscriptionUploads(audioFile, controller.signal);
      const results: Array<{ result: AudioTranscriptionResponse; offset: number }> = [];
      // Send chunks one at a time. Stop on failure so we don't apply an incomplete transcript.
      for (const upload of uploads) {
        controller.signal.throwIfAborted();
        const formData = new FormData();
        formData.append("audio", upload.file);
        const response = await fetch("/api/audio/transcribe", {
          method: "POST",
          headers: buildAiProviderHeaders(connection),
          body: formData,
          signal: controller.signal,
        });
        const result = await readApiResponse<AudioTranscriptionResponse>(response, "Unable to transcribe audio.");
        if (typeof result.text !== "string" || !Array.isArray(result.segments)) throw new Error("The transcription provider returned an invalid transcript.");
        results.push({ result, offset: upload.offset });
      }
      const responseBody = mergeTranscriptionChunks(results);

      if (controller.signal.aborted || abortControllerRef.current !== controller) return null;

      setText(responseBody.text);
      setSegments(responseBody.segments ?? []);
      setStatus("succeeded");
      setError(null);
      return responseBody;
    } catch (reason) {
      if (controller.signal.aborted || abortControllerRef.current !== controller) {
        return null;
      }

      setText("");
      setSegments([]);
      const message =
        reason instanceof Error
          ? reason.message
          : "Unable to transcribe audio.";
      setStatus(
        message.toLowerCase().includes("not configured") || message.toLowerCase().includes("connect openai")
          ? "unavailable"
          : "failed"
      );
      setError(message);
      return null;
    } finally {
      if (connection.provider === "server") window.dispatchEvent(new Event("app-ai-usage-change"));
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [audioFile, connection]);

  useEffect(() => {
    if (!audioFile) {
      const resetTimer = window.setTimeout(() => {
        setText("");
        setSegments([]);
        setStatus("idle");
        setError(null);
      }, 0);

      return () => window.clearTimeout(resetTimer);
    }

    const transcribeTimer = window.setTimeout(() => {
      if (!enabled) {
        setText("");
        setSegments([]);
        setStatus("idle");
        setError(null);
      } else {
        void transcribe();
      }
    }, 0);

    return () => {
      window.clearTimeout(transcribeTimer);
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [audioFile, enabled, transcribe]);

  return {
    text,
    segments,
    status,
    error,
    retry: transcribe,
    isTranscribing: status === "transcribing",
  };
}
