import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/audio/transcribe/route";

vi.mock("../app/lib/appAiCredits", () => ({
  reserveAppAiCredit: vi.fn(async () => null),
  markAppProviderExhausted: vi.fn(async () => undefined),
}));

function request() {
  const body = new FormData();
  body.append("audio", new Blob(["test audio"], { type: "audio/mpeg" }), "track.mp3");
  return new Request("http://localhost/api/audio/transcribe", { method: "POST", body,
    headers: { "x-creator-ai-provider": "cloudflare", "x-creator-cloudflare-account": "test-account",
      "x-creator-cloudflare-token": "test-token" } });
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("timed transcription route", () => {
  it("requests the timed model with JSON audio and returns provider timing", async () => {
    const fetch = vi.fn(async () => Response.json({ success: true,
      result: { text: "First line", segments: [{ start: 2, end: 4, text: "First line" }] } }));
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.model).toBe("@cf/openai/whisper-large-v3-turbo");
    expect(body.segments[0]).toMatchObject({ startSeconds: 2, endSeconds: 4 });
    const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("@cf/openai/whisper-large-v3-turbo");
    expect(JSON.parse(options.body as string)).toMatchObject({
      audio: Buffer.from("test audio").toString("base64"), condition_on_previous_text: false,
    });
    expect(JSON.stringify(body)).not.toContain("test-token");
  });

  it("handles Cloudflare failure envelopes even with HTTP 200", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: false,
      errors: [{ code: 1000, message: "Provider unavailable" }] })));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe("provider_error");
  });
});
