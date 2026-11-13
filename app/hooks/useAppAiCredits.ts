"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppAiCredits } from "@/types/aiCredits";

export function useAppAiCredits() {
  const [credits, setCredits] = useState<AppAiCredits | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/ai/credits", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unable to read shared credits");
        const result: AppAiCredits = await response.json();
        if (controller.signal.aborted) return;
        setCredits(result);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    };
    void load();
    // Other visitors share this balance, so refresh periodically as well as after our own requests.
    const interval = window.setInterval(() => void load(), 60000);
    const onRefresh = () => void load();
    window.addEventListener("app-ai-usage-change", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);
    return () => {
      controller.abort(); window.clearInterval(interval);
      window.removeEventListener("app-ai-usage-change", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
    };
  }, [revision]);

  return { credits, failed, refresh };
}
