import { test, expect } from '@playwright/test';

const ownHint = 'Deine eigene Praxiseinweisung muss eine andere berechtigte Person bestätigen.';
const reviewForm = page => page.getByRole('dialog', { name: 'Praktische Einweisung bestätigen', exact: true });
async function openDetails(page, query = '') {
  await page.goto('/tests/controlling-practice.html?' + query);
  await page.getByRole('button', { name: 'Details zu Lernende Test', exact: true }).click();
}
async function openReview(page, query = '') {
  await openDetails(page, query);
  await page.getByRole('button', { name: 'Praxis bestätigen', exact: true }).click();
  await expect(reviewForm(page)).toBeVisible();
}

for (const role of ['employee', 'studio_manager']) {
  test(`${role} cannot start their own practice confirmation`, async ({ page }) => {
    await openDetails(page, `role=${role}&own=1`);
    await expect(page.getByRole('button', { name: 'Praxis bestätigen', exact: true })).toHaveCount(0);
    await expect(page.getByText(ownHint, { exact: true })).toBeVisible();
    await expect(page.getByText('In Arbeit', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.practiceCalls)).toEqual([]);
  });
  test(`${role} can confirm another employee and retain successful server refresh`, async ({ page }) => {
    await openReview(page, `role=${role}&hold=1`);
    await page.getByLabel('Notiz zur Praxiseinweisung').fill('Empfang gemeinsam praktisch geübt.');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Praxisbestätigung speichern', exact: true }).click();
    await page.waitForFunction(() => typeof window.releasePracticeResult === 'function');
    await expect(reviewForm(page)).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.evaluate(() => window.releasePracticeResult());
    await expect(reviewForm(page)).toHaveCount(0);
    await expect(page.getByText('Lernziel abgeschlossen', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await page.evaluate(() => window.practiceCalls)).toEqual([{ assignmentId: 'assignment', notes: 'Empfang gemeinsam praktisch geübt.' }]);
  });
}

test('administrator retains the existing own practice exception', async ({ page }) => {
  await openReview(page, 'role=admin&own=1');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Praxisbestätigung speichern', exact: true }).click();
  await expect(reviewForm(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.practiceCalls.length)).toBe(1);
});

test('view permission alone offers no practice action', async ({ page }) => {
  await openDetails(page, 'denied=1');
  await expect(page.getByRole('button', { name: 'Praxis bestätigen', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.practiceCalls)).toEqual([]);
});

for (const state of ['unread', 'unpassed']) {
  test(`practice confirmation remains disabled when ${state}`, async ({ page }) => {
    await openDetails(page, `${state}=1`);
    await expect(page.getByRole('button', { name: 'Praxis bestätigen', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => window.practiceCalls)).toEqual([]);
  });
}

const invalidations = [
  ['practice permission withdrawn', { allowed: false }],
  ['reviewer becomes the learner', { own: true }],
  ['another reviewer identity replaces the opener', { reviewerId: 'replacement-reviewer' }],
  ['controlling access withdrawn', { view: false }],
  ['assignment removed', { exists: false }],
  ['practice already confirmed', { confirmed: true }],
  ['reading withdrawn', { read: false }],
  ['quiz pass withdrawn', { quiz: false }],
  ['practice no longer required', { required: false }],
];
for (const [label, patch] of invalidations) {
  test(`open review is cleared when ${label} and never reappears on restoration`, async ({ page }) => {
    await openReview(page);
    await page.getByLabel('Notiz zur Praxiseinweisung').fill('Noch nicht gespeichert.');
    await page.evaluate(patch => window.updatePracticeFixture(patch), patch);
    await expect(reviewForm(page)).toHaveCount(0);
    await page.evaluate(() => window.updatePracticeFixture({ allowed: true, own: false, reviewerId: 'reviewer', view: true, exists: true, confirmed: false, read: true, quiz: true, required: true }));
    await expect(page.getByRole('heading', { name: 'Dein Team im Überblick.', exact: true })).toBeVisible();
    await expect(reviewForm(page)).toHaveCount(0);
    expect(await page.evaluate(() => window.practiceCalls)).toEqual([]);
    await page.getByRole('button', { name: 'Details zu Lernende Test', exact: true }).click();
    await page.getByRole('button', { name: 'Praxis bestätigen', exact: true }).click();
    await expect(page.getByLabel('Notiz zur Praxiseinweisung')).toHaveValue('');
  });
}

test('admin downgrade closes their own open confirmation and restores no stale form', async ({ page }) => {
  await openReview(page, 'role=admin&own=1');
  await page.evaluate(() => window.updatePracticeFixture({ role: 'employee' }));
  await expect(reviewForm(page)).toHaveCount(0);
  await page.evaluate(() => window.updatePracticeFixture({ role: 'admin' }));
  await expect(reviewForm(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.practiceCalls)).toEqual([]);
});

test('own practice explanation fits the mobile detail dialog', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDetails(page, 'own=1');
  await expect(page.getByText(ownHint, { exact: true })).toBeVisible();
  const dialog = page.getByRole('dialog');
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('own-practice-mobile.png') });
});

test('permission withdrawal during an outstanding confirmation never revives or repeats it', async ({ page }) => {
  await openReview(page, 'hold=1&defer=1');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Praxisbestätigung speichern', exact: true }).click();
  await page.waitForFunction(() => typeof window.releasePracticeResult === 'function');
  await expect(reviewForm(page)).toBeVisible();
  await page.evaluate(() => window.updatePracticeFixture({ allowed: false }));
  await expect(reviewForm(page)).toHaveCount(0);
  await page.evaluate(() => window.updatePracticeFixture({ allowed: true }));
  await expect(reviewForm(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Details zu Lernende Test', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Praxis bestätigen', exact: true })).toBeDisabled();
  await page.evaluate(() => window.releasePracticeResult());
  await expect(reviewForm(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.practiceCalls.length)).toBe(1);
});

test('a failed permitted confirmation retains its note and never reports completion', async ({ page }) => {
  await openReview(page, 'reject=1');
  await page.getByLabel('Notiz zur Praxiseinweisung').fill('Bitte beim nächsten Termin prüfen.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Praxisbestätigung speichern', exact: true }).click();
  await expect(reviewForm(page)).toBeVisible();
  await expect(reviewForm(page).getByRole('alert')).toContainText('Die Bestätigung wurde nicht gespeichert.');
  await expect(page.getByLabel('Notiz zur Praxiseinweisung')).toHaveValue('Bitte beim nächsten Termin prüfen.');
  await expect(page.getByText('Lernziel abgeschlossen', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.practiceCalls.length)).toBe(1);
});
