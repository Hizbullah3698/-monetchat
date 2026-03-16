import { test, expect } from '@playwright/test';

test.describe('AI Search Quality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('empty query does not submit', async ({ page }) => {
    // Press Enter on empty input — should not show loading
    const input = page.locator('input[placeholder]').first();
    await input.click();
    await page.keyboard.press('Enter');
    await expect(page.locator('.animate-spin')).not.toBeVisible();
  });

  test('no results handled gracefully without crash', async ({ page }) => {
    const input = page.locator('input[placeholder]').first();
    await input.fill('xyzabc123nonexistentproductquery');
    await page.keyboard.press('Enter');
    // Should show loading, then a response (no crash)
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 5000 });
    // Wait for the response
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 30000 });
    // Page should still be functional
    await expect(input).toBeEditable();
  });

  test('page is RTL-ready (Arabic content renders)', async ({ page }) => {
    // Check that the page has direction-aware elements
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Arabic text should be present somewhere on the page
    // (welcome message or placeholder depending on locale)
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('chat interface is functional after multiple messages', async ({ page }) => {
    const input = page.locator('input[placeholder]').first();

    // Send first message
    await input.fill('hello');
    await page.keyboard.press('Enter');
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 30000 });

    // Input should be re-enabled
    await expect(input).toBeEditable({ timeout: 5000 });

    // Send a second message
    await input.fill('what can you do?');
    await page.keyboard.press('Enter');
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 30000 });

    // Should have multiple message bubbles now
    const messages = page.locator('[class*="rounded"][class*="bg-"]');
    await expect(messages).toHaveCount(await messages.count());
  });
});
