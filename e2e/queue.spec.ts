/*
 * queue.spec.ts | Layer: none (end-to-end test)
 * One happy path through the real stack: browser -> web -> API -> PostgreSQL, on freshly seeded data.
 * Must NOT assert scores or order: those rules are proven by the Jest tests of the Module.
 */
import { expect, test } from '@playwright/test';

test('the expeditor starts preparation and the status changes on screen', async ({ page }) => {
  await page.goto('/');

  // Any seeded order that can be started; the row is found again by its order id after the refetch.
  const startable = page
    .locator('tr[data-order-id]')
    .filter({ has: page.getByRole('button', { name: 'Start' }) })
    .first();
  await expect(startable).toContainText('Received');
  const orderId = await startable.getAttribute('data-order-id');

  await startable.getByRole('button', { name: 'Start' }).click();

  const sameRow = page.locator(`tr[data-order-id="${orderId}"]`);
  await expect(sameRow).toContainText('Preparing');
  await expect(sameRow.getByRole('button', { name: 'Start' })).toHaveCount(0);
});
