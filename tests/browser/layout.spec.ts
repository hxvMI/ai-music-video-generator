import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat/i.test(message.text())) hydrationErrors.push(message.text());
  });
  await page.route("**/api/ai/credits", (route) => route.fulfill({ json: {
    status: "ready", remaining: 72, used: 28, limit: 100,
    resetsAt: "2027-01-01T00:00:00Z", provider: "cloudflare",
  } }));
  await page.goto("/");
  await expect(page.getByText("Loading saved project", { exact: true })).toHaveCount(0);
  expect(hydrationErrors).toEqual([]);
});

test("tabs preserve precise layout edits and support keyboard navigation", async ({ page }) => {
  await page.getByRole("tab", { name: "Visuals", exact: true }).click();
  const canvas = page.locator("details").filter({ has: page.locator("summary p", { hasText: /^Canvas & Overlays$/ }) });
  await canvas.locator("summary").click();
  const timer = page.locator(".layout-group").filter({ has: page.getByRole("heading", { name: "Timer", exact: true }) });
  await timer.getByRole("spinbutton", { name: "Scale value", exact: true }).fill("175");
  await timer.getByRole("spinbutton", { name: "Scale value", exact: true }).press("Enter");
  await expect(timer.getByRole("slider", { name: "Scale", exact: true })).toHaveValue("175");
  await page.getByRole("tab", { name: "Captions", exact: true }).click();
  await expect(canvas).toBeHidden();
  await page.getByRole("tab", { name: "Captions", exact: true }).press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Visuals", exact: true })).toBeFocused();
  await expect(timer.getByRole("spinbutton", { name: "Scale value", exact: true })).toHaveValue("175");
  await timer.getByRole("button", { name: "Reset scale", exact: true }).click();
  await expect(timer.getByRole("spinbutton", { name: "Scale value", exact: true })).toHaveValue("100");
  await expect(page.getByRole("heading", { name: "Project Summary", exact: true })).toHaveCount(0);
});

test("branding scroll ends at the final visible controls", async ({ page }) => {
  await page.getByRole("tab", { name: "Background & Branding", exact: true }).click();
  const logo = page.locator("#editor-branding details").filter({
    has: page.locator("summary p", { hasText: /^Logo Overlay$/ }),
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const expanded of [true, false]) {
      if (await logo.evaluate((element) => (element as HTMLDetailsElement).open) !== expanded) {
        await logo.locator("summary").click();
      }
      const bounds = await page.evaluate(() => {
        const editor = document.querySelector(".editor-scroll") as HTMLElement;
        const panel = document.querySelector("#editor-branding") as HTMLElement;
        editor.scrollTop = editor.scrollHeight;
        return {
          documentHeight: document.documentElement.scrollHeight,
          mainHeight: document.querySelector("main")!.getBoundingClientRect().height,
          trailingSpace: editor.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom,
        };
      });
      expect(bounds.documentHeight).toBeLessThanOrEqual(Math.ceil(bounds.mainHeight) + 1);
      expect(bounds.trailingSpace).toBeLessThanOrEqual(26);
      expect(bounds.trailingSpace).toBeGreaterThanOrEqual(0);
    }
    await page.screenshot({ path: `test-results/branding-fixed-${width}.png`, fullPage: true });
  }
});

test("desktop and mobile layouts fit across all interface themes", async ({ page }) => {
  for (const width of [1440, 800, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    if (width === 390) {
      await expect(page.locator(".interface-theme-picker button span").first()).toBeHidden();
    }
    for (const theme of ["Studio", "Graphite", "Contrast"]) {
      await page.getByRole("button", { name: theme, exact: true }).click();
      for (const tab of ["Audio", "Background & Branding", "Visuals", "Captions"]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        await expect(page.getByRole("tab", { name: tab, exact: true })).toHaveAttribute("aria-selected", "true");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
      if (theme === "Graphite") {
        await page.getByRole("tab", { name: "Visuals", exact: true }).click();
        await page.screenshot({ path: `test-results/redesign-graphite-${width}.png`, fullPage: width < 1024 });
      }
    }
    await page.getByRole("tab", { name: "Visuals", exact: true }).click();
    const preview = await page.locator(".preview-surface").boundingBox();
    expect(preview?.width).toBeGreaterThan(250);
    expect(preview?.height).toBeGreaterThan(220);
    await expect(page.locator(".preset-thumbnail").first()).toBeVisible();
    await expect.poll(() => page.locator(".preset-thumbnail > div").first().evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(100);
    await page.screenshot({ path: `test-results/redesign-editor-${width}.png`, fullPage: width < 1024 });
  }
});
