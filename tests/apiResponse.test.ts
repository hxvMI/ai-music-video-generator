import { describe, expect, it } from "vitest";
import { readApiResponse } from "../app/lib/apiResponse";

describe("AI response handling", () => {
  it("explains plain-text hosting upload errors without attempting to display raw HTML", async () => {
    await expect(readApiResponse(new Response("Request Entity Too Large", { status: 413 }), "Failed."))
      .rejects.toThrow("too large");
    await expect(readApiResponse(new Response("<html>Bad gateway</html>", { status: 502 }), "Unable to generate a background."))
      .rejects.toThrow("HTTP 502");
  });
  it("preserves actionable JSON errors and rejects malformed success responses", async () => {
    await expect(readApiResponse(Response.json({ error: "Shared allowance exhausted" }, { status: 429 }), "Failed."))
      .rejects.toThrow("Shared allowance exhausted");
    await expect(readApiResponse(new Response("not json"), "Failed." )).rejects.toThrow("unreadable response");
    await expect(readApiResponse(Response.json({ text: "Lyrics" }), "Failed.")).resolves.toEqual({ text: "Lyrics" });
  });
});
