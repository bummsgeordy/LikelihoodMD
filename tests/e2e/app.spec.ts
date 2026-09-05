import { expect, test } from "@playwright/test";

test("Nomogramme starten ohne Eingabe und bleiben bei Test- und Erkrankungswechsel benutzbar", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.locator("#testSelect")).toHaveValue("dst-1mg");
  await expect(page.locator("#pretestNumber")).toHaveValue("5");
  await expect(page.locator("#pretestRange")).toHaveValue("5");
  await expect(page.locator("#pretestValue")).toHaveText("5,0 %");
  await expect(page.locator("#postPositiveValue")).toHaveText("20,0 %");
  await expect(page.locator("#pretestEstimatePanel")).toContainText(
    "nicht validiert",
  );
  await expect(page.locator("#pretestSuggestionMarker")).toContainText(
    "Schätzung",
  );
  await page.locator("#pretestNumber").focus();
  await page.locator("#nomogramTitle").click();
  await expect(page.locator("#nomogramExampleNote")).toBeHidden();
  for (const id of ["nomogramPositive", "nomogramNegative"]) {
    const canvas = page.locator("#" + id);
    await expect(canvas).toBeVisible();
    await expect
      .poll(() =>
        canvas.evaluate((node: HTMLCanvasElement) => {
          const pixels = node
            .getContext("2d")!
            .getImageData(0, 0, node.width, node.height).data;
          let colored = 0;
          for (let i = 0; i < pixels.length; i += 4)
            if (
              pixels[i + 3] > 0 &&
              Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) -
                Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) >
                40
            )
              colored++;
          return colored;
        }),
      )
      .toBeGreaterThan(100);
  }
  await page.locator("#nomogramCard").screenshot({
    path: "/tmp/likelihoodmd-restored-nomograms-" + info.project.name + ".png",
  });
  await page.locator("#pretestNumber").fill("12,3");
  await expect(page.locator("#pretestRange")).toHaveValue("12.3");
  await expect(page.locator("#nomogramExampleNote")).toBeHidden();
  await page.locator("#profileSelect").selectOption("dst-1mg-statpearls");
  await expect(page.locator("#pretestNumber")).toHaveValue("12,3");
  await page.reload();
  await expect(page.locator("#pretestNumber")).toHaveValue("12,3");
  for (const condition of [
    "morbus-basedow",
    "herzinsuffizienz",
    "tiefe-venenthrombose",
    "lungenembolie",
    "cushing-syndrom-hyperkortisolismus",
  ]) {
    await page.locator("#conditionSelect").selectOption(condition);
    await expect(page.locator("#nomogramPositive")).toBeVisible();
    await expect(page.locator("#nomogramNegative")).toBeVisible();
    await expect(page.locator("#postPositiveValue")).not.toHaveText("–");
    await expect(page.locator("#postNegativeValue")).not.toHaveText("–");
  }
  await page.locator("#pretestNumber").fill("");
  await expect(page.locator("#nomogramUnavailable")).toBeVisible();
  await expect(page.locator("#nomogramPositive")).toBeHidden();
  await expect(page.locator("#pretestRange")).toHaveAttribute(
    "data-unset",
    "true",
  );
  await expect(page.locator("#lrPositive")).toHaveText("4,75");
  await page.reload();
  await expect(page.locator("#pretestNumber")).toHaveValue("");
  await page.locator("#useExamplePretestButton").click();
  await expect(page.locator("#nomogramPositive")).toBeVisible();
  await expect(page.locator("#postPositiveValue")).toHaveText("20,0 %");
});

test("Gespeicherter leerer Altzustand erhält eine gekennzeichnete Startannahme", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "likelihood-ratio-rechner-state-v7",
      JSON.stringify({
        selectedTestId: "dst-1mg",
        selectedEvidenceProfileId: "dst-1mg-statpearls",
        selectedConditionId: "cushing-syndrom-hyperkortisolismus",
        selectedSettingId: "ambulant-endokrinologie",
        clinicalContext: "follow-up",
        manualPretestPercent: 50,
        pretestInputSource: "unset",
      }),
    );
  });
  await page.goto("/");
  await expect(page.locator("#pretestNumber")).toHaveValue("5");
  await expect(page.locator("#nomogramPositive")).toBeVisible();
  await expect(page.locator("#postPositiveValue")).toHaveText("20,0 %");
  await expect(page.locator("#pretestEstimatePanel")).toContainText(
    "nicht validiert",
  );
  await expect(page.locator("#pretestSuggestionHint")).toContainText(
    "keine individuelle Verlaufs-",
  );
});

test("Rechner, Workflow-Zustand und Untersuchungsmodus funktionieren ohne Konsolenfehler", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "LikelihoodMD" }),
  ).toBeVisible();
  await page.locator("#pretestNumber").fill("12,3");
  await expect(page.locator("#postPositiveValue")).not.toHaveText("–");

  await page
    .locator("#conditionSelect")
    .selectOption("chronische-nierenkrankheit");
  await expect(page.locator("#testSelect")).toHaveValue("egfr-creatinine-ckd");
  await expect(page.locator("#calculationUnavailable")).toBeVisible();
  await expect(page.locator("#postPositiveValue")).toHaveText("–");

  await page.getByRole("tab", { name: "Körperliche Untersuchung" }).click();
  await expect(page.locator("#physicalFindingSelect")).toBeVisible();
  await expect(page.locator("#physicalLrPositive")).not.toHaveText("–");
  await page.locator("#physicalPretestNumber").fill("0,006");
  await expect(page.locator("#physicalPretestValue")).toContainText("0,006");
  await page.locator("#physicalPretestNumber").fill("12x");
  await expect(page.locator("#physicalPostPositiveValue")).toHaveText("–");
  await expect(page.locator("#physicalPretestNumber")).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  expect(consoleErrors).toEqual([]);
});

test("Datenkatalog und statische Unterseiten sind erreichbar", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Administration/ }).click();
  await page.getByRole("button", { name: "Datenkatalog" }).click();
  await expect(page.locator("#catalogTableBody tr").first()).toBeVisible();
  await page.locator("#catalogSearchInput").fill("Troponin");
  await expect(page.locator("#catalogTableBody")).toContainText("Troponin");

  await page.goto("/info/vierfeldertafel/index.html");
  await expect(
    page.getByRole("heading", { name: "Diagnostische Kennzahlen verstehen" }),
  ).toBeVisible();
  await page.goto("/simulation/index.html");
  await expect(
    page.getByRole("heading", { name: "Interaktive Testsimulation" }),
  ).toBeVisible();
  await page.goto("/info/ckd-risiko/index.html");
  await expect(page.getByRole("heading", { name: /CKD-Risiko/ })).toBeVisible();
});

test("Nomogramme und Rechner bleiben im Viewport", async ({ page }) => {
  await page.goto("/");
  await page.locator("#pretestNumber").fill("0,006");
  await expect(page.locator("#pretestValue")).toContainText("0,006");
  const layout = await page.locator("#calculatorGrid").evaluate((element) => {
    const positive = element
      .querySelector<HTMLCanvasElement>("#nomogramPositive")
      ?.getBoundingClientRect();
    const negative = element
      .querySelector<HTMLCanvasElement>("#nomogramNegative")
      ?.getBoundingClientRect();
    const settings = element
      .querySelector<HTMLElement>(".settings-card")
      ?.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      positive: positive && {
        left: positive.left,
        right: positive.right,
        top: positive.top,
        bottom: positive.bottom,
      },
      negative: negative && {
        left: negative.left,
        right: negative.right,
        top: negative.top,
        bottom: negative.bottom,
      },
      settings: settings && { left: settings.left, right: settings.right },
    };
  });

  expect(layout.positive?.left).toBeGreaterThanOrEqual(0);
  expect(layout.positive?.right).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.negative?.left).toBeGreaterThanOrEqual(0);
  expect(layout.negative?.right).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.settings?.left).toBeGreaterThanOrEqual(0);
  expect(layout.settings?.right).toBeLessThanOrEqual(layout.viewportWidth);
  if (layout.viewportWidth <= 980) {
    expect(layout.negative!.top).toBeGreaterThan(layout.positive!.bottom);
  }
});
