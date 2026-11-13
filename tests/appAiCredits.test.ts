import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCreditWindow, readAppAiCredits, reserveAppAiCredit, markAppProviderExhausted } from "../app/lib/appAiCredits";
import { resolveServerAiProvider } from "../app/lib/serverAiProvider";
import { buildAiProviderHeaders } from "../app/lib/aiProvider";

const request = (provider = "server") => new Request("http://localhost/api/backgrounds/generate", {
  headers: { "x-creator-ai-provider": provider },
});
const cloudflareReply = (results: unknown[]) => Response.json({ success: true, result: [{ success: true, results }] });

beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "test-account");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-ai-token");
  vi.stubEnv("CLOUDFLARE_D1_DATABASE_ID", "test-database");
  vi.stubEnv("CLOUDFLARE_D1_API_TOKEN", "test-database-token");
  vi.stubEnv("APP_AI_DAILY_CREDITS", "100");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("shared App default credits", () => {
  it("uses Cloudflare even when a server OpenAI key exists", () => {
    vi.stubEnv("OPENAI_API_KEY", "unused-key");
    vi.stubEnv("AI_PROVIDER", "openai");
    expect(resolveServerAiProvider(request())?.provider).toBe("cloudflare");
  });

  it("does not silently use shared credentials for an incomplete personal connection", () => {
    const headers = buildAiProviderHeaders({ provider: "openai", openAiApiKey: "", cloudflareAccountId: "", cloudflareApiToken: "" });
    expect(resolveServerAiProvider(new Request("http://localhost", { headers }))).toBeNull();
    expect(resolveServerAiProvider(request("unknown"))).toBeNull();
  });

  it("does not contact the ledger for a personal provider", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect(await reserveAppAiCredit(request("openai"))).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports real aggregate remaining credits and no private configuration", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(cloudflareReply([{ used: 12, provider_exhausted: 0 }])));
    const result = await readAppAiCredits();
    expect(result).toMatchObject({ status: "ready", remaining: 88, used: 12, limit: 100 });
    expect(JSON.stringify(result)).not.toContain("test-ai-token");
  });

  it("blocks model calls when the atomic reservation returns no available row", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(cloudflareReply([])));
    const response = await reserveAppAiCredit(request());
    expect(response?.status).toBe(429);
    expect(await response?.json()).toMatchObject({ code: "quota_exhausted" });
  });

  it("fails closed when storage cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await readAppAiCredits()).remaining).toBeNull();
    expect((await reserveAppAiCredit(request()))?.status).toBe(503);
  });

  it("does not advertise a ready default when setup is incomplete", async () => {
    vi.stubEnv("CLOUDFLARE_D1_API_TOKEN", "");
    expect(await readAppAiCredits()).toMatchObject({ status: "not_configured", remaining: null });
    expect((await reserveAppAiCredit(request()))?.status).toBe(503);
  });

  it("locks shared requests on provider exhaustion and preserves personal requests", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => cloudflareReply([{ used: 7, provider_exhausted: 1 }]));
    vi.stubGlobal("fetch", fetchMock);
    await markAppProviderExhausted(request("cloudflare"));
    expect(fetchMock).not.toHaveBeenCalled();
    await markAppProviderExhausted(request());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(await readAppAiCredits()).toMatchObject({ status: "exhausted", remaining: 0, used: 7 });
  });

  it("resets at UTC midnight across month and year boundaries", () => {
    expect(getCreditWindow(new Date("2026-12-31T23:59:59Z"))).toEqual({
      day: "2026-12-31", resetsAt: "2027-01-01T00:00:00.000Z",
    });
  });
});
