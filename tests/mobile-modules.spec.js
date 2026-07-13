import { test, expect } from '@playwright/test';
import { createProject } from './helpers.js';

test.use({ viewport: { width: 390, height: 844 } });

async function openModule(page, label) {
  await page.locator('button[aria-label="Open navigation menu"]').click();
  await page.waitForTimeout(150);
  await page.locator('#sidebar-nav .nav-item', { hasText: label }).click();
  await page.waitForTimeout(350);
}

function activePane(page) {
  return page.locator('#workspace > div[style*="flex"]');
}

async function checkNoOverflow(page, label) {
  const overflowing = await page.evaluate(() => {
    const vw = window.innerWidth;
    const bad = [];
    document.querySelectorAll('#workspace button, #workspace input, #workspace a, #workspace h1, #workspace h2, #workspace select').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 2 || r.left < -2)) {
        bad.push({ tag: el.tagName, text: (el.textContent || el.value || '').slice(0, 30), left: Math.round(r.left), right: Math.round(r.right) });
      }
    });
    return bad;
  });
  if (overflowing.length) console.log(`OVERFLOW in ${label}:`, JSON.stringify(overflowing, null, 2));
  return overflowing;
}

const COLLECTION_MODULES = [
  'World Builder', 'Character Studio', 'Item Studio', 'Combat Designer',
  'Level Designer', 'Quest Designer', 'Art Director', 'UI Designer', 'Audio Designer', 'Achievements',
];

test('collectionView modules: list view fits on mobile', async ({ page }) => {
  await createProject(page, 'Scan List Test', 'Fantasy Action RPG');
  await page.waitForTimeout(400);
  let allBad = [];
  for (const label of COLLECTION_MODULES) {
    await openModule(page, label);
    const bad = await checkNoOverflow(page, `${label} (list)`);
    allBad = allBad.concat(bad.map(b => ({ module: label, ...b })));
  }
  expect(allBad).toEqual([]);
});

test('collectionView modules: detail view fits on mobile (tap + New)', async ({ page }) => {
  await createProject(page, 'Scan Detail Test');
  await page.waitForTimeout(400);
  let allBad = [];
  for (const label of COLLECTION_MODULES) {
    await openModule(page, label);
    const newBtn = activePane(page).getByRole('button', { name: /\+ New/ });
    await newBtn.click();
    await page.waitForTimeout(150);
    // Some modules open a subtype-picker modal first.
    const modalOption = page.locator('#modal-root .ctx-menu-item').first();
    if (await modalOption.count()) await modalOption.click();
    await page.waitForTimeout(300);
    const bad = await checkNoOverflow(page, `${label} (detail)`);
    allBad = allBad.concat(bad.map(b => ({ module: label, ...b })));
  }
  expect(allBad).toEqual([]);
});

test('Documentation module fits on mobile (list + generated doc)', async ({ page }) => {
  await createProject(page, 'Scan Docs Test');
  await page.waitForTimeout(400);
  await openModule(page, 'Documentation');
  let bad = await checkNoOverflow(page, 'Documentation (list)');
  expect(bad).toEqual([]);

  await activePane(page).locator('div', { hasText: 'Game Design Document' }).first().click();
  await page.waitForTimeout(200);
  const genBtn = activePane(page).getByRole('button', { name: '✨ Generate Now' });
  if (await genBtn.count()) await genBtn.click();
  await page.waitForTimeout(300);
  bad = await checkNoOverflow(page, 'Documentation (generated doc)');
  expect(bad).toEqual([]);
});

test('Task Manager and Game Designer fit on mobile', async ({ page }) => {
  await createProject(page, 'Scan Misc Test', 'Fantasy Action RPG');
  await page.waitForTimeout(400);
  await openModule(page, 'Task Manager');
  let bad = await checkNoOverflow(page, 'Task Manager');
  expect(bad).toEqual([]);

  await openModule(page, 'Game Designer');
  bad = await checkNoOverflow(page, 'Game Designer');
  expect(bad).toEqual([]);

  await openModule(page, 'Relationship Graph');
  bad = await checkNoOverflow(page, 'Relationship Graph');
  expect(bad).toEqual([]);
});
