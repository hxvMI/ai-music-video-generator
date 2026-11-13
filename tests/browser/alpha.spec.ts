import { expect, test } from "@playwright/test";

function audioFixture(seconds = 12) {
  const sampleRate = 8000;
  const samples = sampleRate * seconds;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF"); buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++) {
    buffer.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * 220 / sampleRate) * 8000), 44 + index * 2);
  }
  return buffer;
}

test("local director, timed captions, and audio replacement", async ({ page }) => {
  await page.route("**/api/ai/credits", (route) => route.fulfill({ json: {
    status: "ready", remaining: 100, used: 0, limit: 100,
    resetsAt: "2027-01-01T00:00:00Z", provider: "cloudflare",
  } }));
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /NaN|invalid.*style/i.test(message.text())) {
      failures.push(message.text());
    }
  });
  await page.route("**/api/audio/transcribe", (route) => route.fulfill({ json: {
    text: "First line\nSecond line", segments: [
      { id: "one", text: "First line", startSeconds: 1, endSeconds: 3 },
      { id: "two", text: "Second line", startSeconds: 5, endSeconds: 7 },
    ], provider: "openai", model: "test", transcriptId: "test",
  } }));
  await page.goto("/");
  await expect(page.getByText("Loading saved project", { exact: true })).toHaveCount(0);
  const audioStep = page.locator("#editor-audio");
  await audioStep.locator('input[type="file"]').setInputFiles({ name: "Artist - Test.wav", mimeType: "audio/wav", buffer: audioFixture() });
  await expect(page.getByRole("button", { name: "Run Auto Director", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Run Auto Director", exact: true }).click();
  await expect(page.getByText("Auto setup applied", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Visuals", exact: true }).click();
  const visualStep = page.locator("#editor-design");
  const timeline = visualStep.locator("details").filter({ has: page.locator("summary p", { hasText: /^Reactive Timeline$/ }) });
  await timeline.locator("summary").click();
  await timeline.getByTitle("Split zone", { exact: true }).click();
  await expect(timeline.getByRole("button", { name: "Reset to automatic" })).toBeVisible();
  await timeline.getByTitle("Remove zone", { exact: true }).click();
  await timeline.getByRole("button", { name: "Reset to automatic" }).click();
  await expect(timeline.getByRole("button", { name: "Reset to automatic" })).toHaveCount(0);
  await timeline.locator("summary").click();
  const captions = visualStep.locator("details").filter({ has: page.locator("summary p", { hasText: /^Captions$/ }) });
  await page.getByRole("tab", { name: "Captions", exact: true }).click();
  await captions.getByRole("button", { name: "Transcribe lyrics", exact: true }).click();
  await expect(captions.getByLabel("Text", { exact: true }).first()).toHaveValue("First line");
  await captions.getByLabel("Text", { exact: true }).first().fill("Edited line");
  await captions.getByLabel("Timing shift (seconds)", { exact: true }).fill("0.5");
  await captions.getByRole("button", { name: "Shift timing", exact: true }).click();
  await expect(captions.getByLabel("Start (seconds)", { exact: true }).first()).toHaveValue("1.50");
  await captions.getByRole("button", { name: "Preview cue 1", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Pause", exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).last().click();
  await page.screenshot({ path: "test-results/alpha-workspace.png" });
  await page.getByRole("tab", { name: "Audio", exact: true }).click();
  await audioStep.locator('input[type="file"]').setInputFiles({ name: "Replacement.wav", mimeType: "audio/wav", buffer: audioFixture(3) });
  await page.getByRole("tab", { name: "Captions", exact: true }).click();
  await expect(captions.getByLabel("Show captions", { exact: true })).not.toBeChecked();
  expect(failures).toEqual([]);
});

test("autosave writes only after edits, with manual save available", async ({ page }) => {
  await page.addInitScript(() => {
    const originalPut = IDBObjectStore.prototype.put;
    (window as unknown as { projectWrites: number }).projectWrites = 0;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof originalPut>) {
      if (this.name === "creator-projects") (window as unknown as { projectWrites: number }).projectWrites++;
      return originalPut.apply(this, args);
    };
  });
  await page.route("**/api/ai/credits", (route) => route.fulfill({ json: {
    status: "not_configured", remaining: null, used: null, limit: 100,
    resetsAt: "2027-01-01T00:00:00Z", provider: "cloudflare",
  } }));
  await page.goto("/");
  await expect(page.getByText("Loading saved project", { exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Background & Branding", exact: true }).click();
  await page.getByPlaceholder("Midnight Drive").fill("Changed title");
  await expect(page.getByText("Project saved", { exact: true })).toBeVisible();
  const writes = () => page.evaluate(() => (window as unknown as { projectWrites: number }).projectWrites);
  const savedCount = await writes();
  // Observe longer than the debounce interval to catch an idle save loop.
  await page.waitForTimeout(2400);
  expect(await writes()).toBe(savedCount);
  await page.getByLabel("Workspace settings", { exact: true }).click();
  await page.getByLabel("Autosave", { exact: true }).uncheck();
  await page.getByLabel("Workspace settings", { exact: true }).click();
  await page.getByPlaceholder("Midnight Drive").fill("Manual title");
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();
  await page.waitForTimeout(1300);
  expect(await writes()).toBe(savedCount);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Project saved", { exact: true })).toBeVisible();
  expect(await writes()).toBe(savedCount + 1);
  await page.reload();
  await expect(page.getByText("Project saved", { exact: true })).toBeVisible();
  const restored = page.getByPlaceholder("Midnight Drive");
  await page.getByRole("tab", { name: "Background & Branding", exact: true }).click();
  await expect(restored).toHaveValue("Manual title");
});

test("shared allowance displays exhaustion and supports switching providers", async ({ page }) => {
  let remaining = 8;
  await page.route("**/api/ai/credits", (route) => route.fulfill({ json: {
    status: remaining ? "ready" : "exhausted", remaining, used: 100 - remaining, limit: 100,
    resetsAt: "2027-01-01T00:00:00Z", provider: "cloudflare",
  } }));
  await page.goto("/");
  await page.locator(".ai-connection > summary").click();
  await expect(page.getByText("8 of 100 daily credits left, shared by all visitors.", { exact: true })).toBeVisible();
  remaining = 0;
  await page.getByRole("button", { name: "Refresh shared credits", exact: true }).click();
  await expect(page.getByText("Shared allowance exhausted. Switch to OpenAI or Cloudflare with your own credentials.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "OpenAI", exact: true }).click();
  await expect(page.getByLabel("OpenAI API key", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/shared-credits.png" });
});
