import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? "/usr/bin/chromium-browser";
const outputDir = ".next/render-checks";

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function canvasImageStats(page, name, suffix) {
  const rect = await page.locator("canvas").boundingBox();
  assert(rect, `${name}: canvas not found`);
  assert(rect.width >= 320, `${name}: canvas too narrow (${rect.width}px)`);
  assert(rect.height >= 300, `${name}: canvas too short (${rect.height}px)`);

  const screenshot = await page.screenshot({
    path: `${outputDir}/${name}-${suffix}.png`,
  });
  const metadata = await sharp(screenshot).metadata();
  const imageWidth = metadata.width ?? 0;
  const imageHeight = metadata.height ?? 0;
  const left = Math.max(0, Math.floor(rect.x));
  const top = Math.max(0, Math.floor(rect.y));
  const width = Math.min(Math.floor(rect.width), imageWidth - left);
  const height = Math.min(Math.floor(rect.height), imageHeight - top);

  const raw = await sharp(screenshot)
    .extract({ left, top, width, height })
    .removeAlpha()
    .raw()
    .toBuffer();

  let sum = 0;
  let sumSquares = 0;
  for (const value of raw) {
    sum += value;
    sumSquares += value * value;
  }

  const mean = sum / raw.length;
  const variance = sumSquares / raw.length - mean * mean;
  return { raw, mean, variance, rect };
}

function meanAbsoluteDifference(a, b) {
  const length = Math.min(a.length, b.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Math.abs(a[index] - b[index]);
  }
  return sum / length;
}

async function verifyViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedResponses = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`${baseUrl}/escenario/overtake-01`, {
    waitUntil: "networkidle",
  });
  await page.locator("canvas").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(900);

  const first = await canvasImageStats(page, viewport.name, "first");
  await page.waitForTimeout(450);
  const second = await canvasImageStats(page, viewport.name, "second");

  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  assert(
    bodyWidth <= viewport.width + 2,
    `${viewport.name}: horizontal overflow (${bodyWidth}px > ${viewport.width}px)`,
  );
  assert(first.mean > 5, `${viewport.name}: canvas is effectively black`);
  assert(first.variance > 50, `${viewport.name}: canvas lacks visible detail`);

  const diff = meanAbsoluteDifference(first.raw, second.raw);
  assert(diff > 0.2, `${viewport.name}: canvas is not visibly moving`);
  assert(
    failedResponses.length === 0,
    `${viewport.name}: failed responses:\n${failedResponses.join("\n")}`,
  );
  assert(
    consoleErrors.length === 0,
    `${viewport.name}: browser errors:\n${consoleErrors.join("\n")}`,
  );

  await context.close();
  return {
    viewport: viewport.name,
    canvas: `${Math.round(first.rect.width)}x${Math.round(first.rect.height)}`,
    mean: Number(first.mean.toFixed(2)),
    variance: Number(first.variance.toFixed(2)),
    motionDelta: Number(diff.toFixed(3)),
  };
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const results = [];
  for (const viewport of viewports) {
    results.push(await verifyViewport(browser, viewport));
  }
  console.table(results);
} finally {
  await browser.close();
}
