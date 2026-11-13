export type AppAiCredits = {
  status: "ready" | "exhausted" | "not_configured" | "unavailable";
  limit: number;
  used: number | null;
  remaining: number | null;
  resetsAt: string;
  provider: "cloudflare";
};
