import { expect, test } from '@playwright/test';

test('Rechner, Workflow-Zustand und Untersuchungsmodus funktionieren ohne Konsolenfehler', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'LikelihoodMD' })).toBeVisible();
  await expect(page.locator('#postPositiveValue')).not.toHaveText('–');

  await page.locator('#conditionSelect').selectOption('chronische-nierenkrankheit');
  await expect(page.locator('#testSelect')).toHaveValue('egfr-creatinine-ckd');
  await expect(page.locator('#calculationUnavailable')).toBeVisible();
  await expect(page.locator('#postPositiveValue')).toHaveText('–');

  await page.getByRole('tab', { name: 'Körperliche Untersuchung' }).click();
  await expect(page.locator('#physicalFindingSelect')).toBeVisible();
  await expect(page.locator('#physicalLrPositive')).not.toHaveText('–');

  expect(consoleErrors).toEqual([]);
});

test('Datenkatalog und statische Unterseiten sind erreichbar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Administration/ }).click();
  await page.getByRole('button', { name: 'Datenkatalog' }).click();
  await expect(page.locator('#catalogTableBody tr').first()).toBeVisible();
  await page.locator('#catalogSearchInput').fill('Troponin');
  await expect(page.locator('#catalogTableBody')).toContainText('Troponin');

  await page.goto('/info/vierfeldertafel/index.html');
  await expect(page.getByRole('heading', { name: 'Diagnostische Kennzahlen verstehen' })).toBeVisible();
  await page.goto('/simulation/index.html');
  await expect(page.getByRole('heading', { name: 'Interaktive Testsimulation' })).toBeVisible();
  await page.goto('/info/ckd-risiko/index.html');
  await expect(page.getByRole('heading', { name: /CKD-Risiko/ })).toBeVisible();
});

test('Nomogramme und Rechner bleiben im Viewport', async ({ page }) => {
  await page.goto('/');
  const layout = await page.locator('#calculatorGrid').evaluate(element => {
    const positive = element.querySelector<HTMLCanvasElement>('#nomogramPositive')?.getBoundingClientRect();
    const negative = element.querySelector<HTMLCanvasElement>('#nomogramNegative')?.getBoundingClientRect();
    const settings = element.querySelector<HTMLElement>('.settings-card')?.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      positive: positive && { left: positive.left, right: positive.right, top: positive.top, bottom: positive.bottom },
      negative: negative && { left: negative.left, right: negative.right, top: negative.top, bottom: negative.bottom },
      settings: settings && { left: settings.left, right: settings.right }
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
