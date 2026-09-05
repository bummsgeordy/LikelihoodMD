import { expect, test } from "@playwright/test";

test("Startannahmen, Populationen und Quellen wechseln passend zum Szenario", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#pretestEstimatePanel")).toContainText(
    "nicht validiert",
  );
  await expect(page.locator("#pretestStatus")).toContainText("5,0 %");
  await expect(page.locator("#nomogramPositive")).toBeVisible();
  await expect(page.locator("#pretestEstimatePanel > p a")).toHaveAttribute(
    "href",
    "https://doi.org/10.1210/clinem/dgac379",
  );
  await page
    .locator("#conditionSelect")
    .selectOption("primarer-hyperaldosteronismus");
  await page.locator("#settingSelect").selectOption("hausarztpraxis");
  await expect(page.locator("#pretestNumber")).toHaveValue("5,9");
  await expect(page.locator("#pretestEstimatePanel")).toContainText(
    "Unselektierte erwachsene Hypertoniepopulation",
  );
  await page
    .locator("#settingSelect")
    .selectOption("pa-hypertension-hypokalemia");
  await expect(page.locator("#pretestNumber")).toHaveValue("28,1");
  await page.locator("#conditionSelect").selectOption("zoliakie");
  await expect(
    page.locator("#settingSelect option[value='pa-hypertension-hypokalemia']"),
  ).toHaveCount(0);
  await page.locator("#settingSelect").selectOption("ambulant-diabetologie");
  await expect(page.locator("#pretestNumber")).toHaveValue("2,7");
  await page.locator("#pretestNumber").fill("12,3");
  await page.locator("#pretestSuggestionMarker").click();
  await expect(page.locator("#pretestNumber")).toHaveValue("2,7");
  await expect(page.locator("#pretestRange")).toHaveValue("2.7");
  await page.locator("#pretestNumber").fill("0,006");
  await page.reload();
  await expect(page.locator("#pretestNumber")).toHaveValue("0,006");
  await expect(page.locator("#pretestSuggestionMarker")).toContainText("2,7");
  await page
    .locator("#practicePanel select")
    .first()
    .selectOption("macs-context");
  await expect(page.locator("#testSelect")).toHaveValue("dst-macs-context");
  await expect(page.locator("#pretestNumber")).toHaveValue("30");
  await expect(page.locator("#pretestEstimatePanel")).toContainText(
    "nicht manifestes Cushing",
  );
  await page
    .locator("#practicePanel select")
    .first()
    .selectOption("primary-ai");
  await expect(page.locator("#pretestNumber")).toHaveValue("10");
  await page
    .locator("#practicePanel select")
    .first()
    .selectOption("steroid-recovery");
  await expect(page.locator("#pretestNumber")).toHaveValue("48,7");
  await expect(page.locator("#pretestEstimatePanel")).toContainText(
    "biochemische",
  );
  await page
    .locator("#conditionSelect")
    .selectOption("cushing-syndrom-hyperkortisolismus");
  await page.getByLabel("Anlass", { exact: true }).selectOption("suspicion");
  await page.locator("#settingSelect").selectOption("ambulant-endokrinologie");
  await expect(page.locator("#nomogramPositive")).toBeVisible();
  await page
    .locator("#pretestEstimatePanel")
    .screenshot({ path: `/tmp/likelihoodmd-pretest-${info.project.name}.png` });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
