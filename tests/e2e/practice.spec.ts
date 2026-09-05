import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const example = JSON.parse(
  readFileSync(
    new URL("../../examples/user-data-example.json", import.meta.url),
    "utf8",
  ),
);

test("Eigene Profile importieren, Konflikte bestätigen und v7 exportieren", async ({
  page,
}) => {
  const profile = { ...example.customEvidenceProfiles[0], isDefault: true };
  const payload = {
    ...example,
    customTests: [{ ...example.customTests[0], evidenceProfiles: [profile] }],
    customEvidenceProfiles: [],
  };
  const upload = async (data: unknown) =>
    page
      .locator("#importFile")
      .setInputFiles({
        name: "vorschlag.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(data)),
      });
  await page.goto("/");
  await page.getByRole("button", { name: /Administration/ }).click();
  await upload(payload);
  await expect(page.locator("#actionMessage")).toContainText("zusammengeführt");
  await page.locator("#drawerCloseButton").click();
  await expect(page.locator("#testSelect")).toHaveValue("custom-test-example");
  await expect(page.locator("#profileSelect")).toContainText("Beispielprofil");
  await page.locator("#pretestNumber").fill("10");
  await expect(page.locator("#postPositiveValue")).toHaveText("33,3 %");
  await page.getByRole("button", { name: /Administration/ }).click();
  const correction = {
    ...payload,
    customTests: [],
    customAssumptions: [],
    customModifiers: [],
    customEvidenceProfiles: [
      { ...profile, label: "Korrigiertes eigenes Profil" },
    ],
  };
  page.once("dialog", (dialog) => dialog.dismiss());
  await upload(correction);
  await expect(page.locator("#actionMessage")).toContainText("abgebrochen");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#importFile").setInputFiles([]);
  await upload(correction);
  await expect(page.locator("#actionMessage")).toContainText("zusammengeführt");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportButton").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("v7.json");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("likelihood-ratio-rechner-state-v7")!),
  );
  expect(stored.customEvidenceProfiles[0].label).toBe(
    "Korrigiertes eigenes Profil",
  );
  expect(stored.customAssumptions[0].id).toBe(example.customAssumptions[0].id);
  await page.reload();
  await expect(page.locator("#profileSelect")).toContainText(
    "Korrigiertes eigenes Profil",
  );
});

test("Praxisfragen, Kategorien, Kontext und Eingabe sind konsistent", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#practicePanel select").first()).toContainText(
    "Prolaktin",
  );
  await page.locator("#practicePanel select").first().selectOption("prolactin");
  await expect(page.locator("#conditionSelect")).toHaveValue(
    "hyperprolaktinamie",
  );
  await expect(page.locator("#testSelect")).toHaveValue("prolactin-context");
  await expect(page.locator("#postPositiveValue")).toHaveText("–");
  await page
    .getByLabel("Befundkonstellation", { exact: true })
    .selectOption("discordant");
  await expect(page.locator("#practicePanel")).toContainText(
    /Hook|Macro|Makro|Assay/,
  );
  await page
    .locator("#practicePanel select")
    .first()
    .selectOption("steroid-recovery");
  await expect(page.locator("#testSelect")).toHaveValue(
    "morning-cortisol-recovery",
  );
  await page.getByLabel("Anlass", { exact: true }).selectOption("suspicion");
  await expect(page.locator("#testSelect")).toHaveValue("primary-ai-context");
  await page
    .locator("#conditionSelect")
    .selectOption("schilddrusenknoten-malignitatsrisiko");
  await page.locator("#settingSelect").selectOption("thyroid-eu-tirads-1");
  await expect(page.locator("#testSelect")).not.toContainText("Feinnadel");
  await page.locator("#settingSelect").selectOption("thyroid-eu-tirads-4");
  await page.locator("#testSelect").selectOption("thyroid-fna-bethesda");
  await expect(page.locator("#profileCategories select option")).toHaveCount(7);
  await page.locator("#profileCategories select").selectOption("III");
  await expect(page.locator("#profileCategories")).toContainText(
    "Wiederholung",
  );
  await page
    .locator("#conditionSelect")
    .selectOption("cushing-syndrom-hyperkortisolismus");
  await page.locator("#pretestNumber").fill("0,006");
  await expect(page.locator("#pretestValue")).toHaveText("0,006 %");
  await page.screenshot({
    path: "/tmp/likelihoodmd-main-" + info.project.name + ".png",
    fullPage: true,
  });
  await page.locator("#nomogramCard").screenshot({
    path: "/tmp/likelihoodmd-nomogram-" + info.project.name + ".png",
  });
  await page.locator("#cohortExplanation summary").click();
  await expect(page.locator("#cohortExplanation details")).toHaveAttribute(
    "open",
  );
  await page.locator("#pretestNumber").fill("12,3");
  await expect(page.locator("#cohortExplanation details")).toHaveAttribute(
    "open",
  );
  await page.locator("#pretestNumber").fill("12x");
  await expect(page.locator("#postPositiveValue")).toHaveText("–");
  await expect(page.locator("#pretestNumber")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(errors).toEqual([]);
});

test("Gemeinsame Simulation, Häufigkeiten und Vortrag reagieren ohne Überlauf", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/simulation/");
  await page.locator("#pretestNumber").fill("0,006");
  await expect(page.locator("#resultLine")).toContainText("0,006");
  await expect(page.locator("#treeA")).toContainText("0,06 erkrankt");
  await page.locator("#comparisonMode").selectOption("profile");
  await page.locator("#comparisonProfile").selectOption("ntprobnp-125");
  await expect(page.locator("#scenarioBResult")).toContainText("125");
  await page.locator("#lectureToggle").click();
  await expect(page.locator("#lectureToggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#revealCase").click();
  await page.locator("#revealCase").click();
  await expect(page.locator("#caseContent")).toContainText("8,3");
  await page.screenshot({
    path: "/tmp/likelihoodmd-simulation-" + info.project.name + ".png",
    fullPage: true,
  });
  await page.locator(".workbench").screenshot({
    path: "/tmp/likelihoodmd-workbench-" + info.project.name + ".png",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const ink = await page
    .locator("#nomogramPositive")
    .evaluate((el: HTMLCanvasElement) => {
      const c = el.getContext("2d")!;
      return Array.from(c.getImageData(0, 0, el.width, el.height).data)
        .filter((_, i) => i % 4 === 3)
        .some((a) => a > 0);
    });
  expect(ink).toBe(true);
  await page.locator("#lrPositiveNumber").fill("8");
  await expect(page.locator("#parameterMode")).toContainText("Hypothetisch");
  await expect(page.locator("#treeA")).toContainText("Kein Häufigkeitsbaum");
  await page.emulateMedia({ media: "print" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("Produktions-PWA lädt auch zuvor ungeöffnete Unterseiten und Befunde offline", async ({
  page,
  context,
}, info) => {
  test.skip(
    !["desktop-1440", "webkit-1440"].includes(info.project.name),
    "Ein vollständiger Cache-Test je Browser-Engine",
  );
  // WebKit's emulated offline mode can fail before service-worker navigation.
  // A separate origin with a stopped HTTP server exercises actual network loss.
  const root = resolve("dist");
  const mime: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  };
  const server = createServer(async (request, response) => {
    try {
      let path = new URL(request.url!, "http://localhost").pathname;
      if (path.endsWith("/")) path += "index.html";
      const file = resolve(root, "." + decodeURIComponent(path));
      if (!file.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      const body = await readFile(file);
      response
        .writeHead(200, {
          "Content-Type": mime[extname(file)] ?? "application/octet-stream",
        })
        .end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Testserver fehlt");
  const origin = `http://127.0.0.1:${address.port}`;
  const stop = async () => {
    server.closeAllConnections();
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
  };
  try {
    await page.goto(origin + "/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );
    await stop();
    if (info.project.name === "desktop-1440") await context.setOffline(true);
    await page.goto(origin + "/simulation/");
    await expect(page.locator("#exampleSelect")).toContainText("NT-proBNP");
    await page.goto(origin + "/info/ckd-risiko/");
    await expect(page.locator("#verifiedHazards")).toContainText("12,7");
    await page.goto(origin + "/");
    await page.getByRole("tab", { name: "Körperliche Untersuchung" }).click();
    await expect(page.locator("#physicalFindingSelect option")).not.toHaveCount(
      0,
    );
    const unavailable = await page.goto(origin + "/nicht-vorhanden/");
    expect(unavailable?.status()).toBe(503);
    await expect(page.locator("body")).toContainText("Offline-Nutzung");
  } finally {
    await context.setOffline(false);
    if (server.listening) await stop();
  }
});
