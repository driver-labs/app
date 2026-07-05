import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3100";
const scenarioId =
  process.argv[2] ?? "scenario_licencia_documentos_control_001";
const outputDir = process.env.OUT_DIR ?? "/tmp/claude-1000/-home-fdgbatarse-hackaton-app/fd13a603-0f32-4bcf-a111-9e7d015610fa/scratchpad/shots";
const linuxChromiumPath = "/usr/bin/chromium-browser";

await mkdir(outputDir, { recursive: true });

const launchOptions = {
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
};
if (existsSync(linuxChromiumPath)) launchOptions.executablePath = linuxChromiumPath;

const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const consoleErrors = [];
const failedResponses = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) failedResponses.push(`${r.status()} ${r.url()}`);
});

const log = (...args) => console.log(`[${scenarioId}]`, ...args);

try {
  await page.goto(`${baseUrl}/practicar/${scenarioId}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  await page.locator("canvas").waitFor({ state: "visible", timeout: 20_000 });
  log("canvas visible");
  await page.screenshot({ path: `${outputDir}/${scenarioId}-intro.png` });

  await page
    .locator(".simulator-shell[data-phase='approach']")
    .waitFor({ state: "attached", timeout: 15_000 });
  log("phase=approach");

  await page
    .locator(".simulator-shell[data-phase='decision']")
    .waitFor({ state: "attached", timeout: 25_000 });
  log("phase=decision");
  await page.screenshot({ path: `${outputDir}/${scenarioId}-decision.png` });

  const choices = page.locator(".choices .choice");
  const count = await choices.count();
  log("choices:", count);
  if (count === 0) throw new Error("no choices rendered");
  await choices.first().click();
  const confirm = page.locator(".primary-action", { hasText: "Confirmar" });
  await confirm.click();

  await page
    .locator(".simulator-shell[data-phase='consequence']")
    .waitFor({ state: "attached", timeout: 10_000 });
  log("phase=consequence");
  const result = await page.locator(".result").innerText();
  log("result:", result.slice(0, 120).replace(/\n/g, " "));
  await page.screenshot({ path: `${outputDir}/${scenarioId}-consequence.png` });
  await page.waitForTimeout(4500);
  await page.screenshot({
    path: `${outputDir}/${scenarioId}-consequence-late.png`,
  });

  log("PROGRESSION OK");
} catch (error) {
  await page.screenshot({ path: `${outputDir}/${scenarioId}-FAIL.png` }).catch(() => {});
  const phase = await page
    .locator(".simulator-shell")
    .getAttribute("data-phase")
    .catch(() => "unknown");
  log("FAILED at phase:", phase, "—", error.message.split("\n")[0]);
  process.exitCode = 1;
} finally {
  const filteredErrors = consoleErrors.filter(
    (e) => !e.includes("/api/practice/attempts"),
  );
  if (filteredErrors.length) log("console errors:", filteredErrors.join(" | "));
  if (failedResponses.length) log("failed responses:", failedResponses.join(" | "));
  await browser.close();
}
