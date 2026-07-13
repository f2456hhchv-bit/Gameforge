// Shared helpers for the GameForge Studio Playwright suite.

export async function createProject(page, name, templateLabel = 'Blank Project') {
  await page.goto('/index.html');
  // Either the first-run welcome screen or an existing-project state can greet us
  // depending on browser storage; each test gets a fresh isolated context, so the
  // welcome screen is the expected path, but we guard for safety.
  const nameInput = page.locator('input[placeholder*="Ashfall"]');
  if (await nameInput.count()) {
    await nameInput.fill(name);
    await nameInput.press('Enter');
  }
  await page.waitForTimeout(200);
  const templateBtn = page.locator(`button:has-text("${templateLabel}")`);
  if (await templateBtn.count()) await templateBtn.click();
  await page.waitForTimeout(400);
}

// The active (visible) tab's workspace container — all tab containers stay
// mounted in the DOM (display:none when inactive), so plain page-wide
// selectors can match hidden content from other tabs.
export function activePane(page) {
  return page.locator('#workspace > div[style*="flex"]');
}

export function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));
  return errors;
}

export async function openModule(page, label) {
  await page.locator('#sidebar-nav .nav-item', { hasText: label }).click();
  await page.waitForTimeout(200);
}

export async function generateOne(page, opts = {}) {
  const pane = activePane(page);
  await pane.getByRole('button', { name: '✨ Generate' }).click();
  await page.waitForTimeout(150);
  if (opts.subtypeIndex != null) {
    await page.locator('#modal-root select').nth(1).selectOption({ index: opts.subtypeIndex });
  }
  if (opts.count) {
    await page.locator('#modal-root input[type=number]').fill(String(opts.count));
  }
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.waitForTimeout(250);
}

export function projectState(page) {
  return page.evaluate(() => {
    const p = window.__gfStore.project;
    return {
      id: p.id,
      name: p.name,
      meta: p.meta,
      counts: Object.fromEntries(Object.entries(p.collections).map(([k, v]) => [k, v.length])),
    };
  });
}
