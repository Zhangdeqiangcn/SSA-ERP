import { test } from '@playwright/test';

test('verify settings page works on fresh dev server', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`); });

  await page.goto('/settings', { waitUntil: 'domcontentloaded' });
  try { await page.getByRole('button', { name: '跳过引导' }).click({ timeout: 3000 }); } catch {}
  await page.waitForTimeout(1500);

  console.log('--- ERRORS ---');
  for (const e of errors) console.log(e);
  console.log('--- END ---');
  await page.screenshot({ path: 'test-results/user-3001-fixed.png', fullPage: true });
});

