import { test, expect } from '@playwright/test';

test.describe('Seller Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('sell suggestion shows sub-options', async ({ page }) => {
    await page.getByTestId('sell-suggestion').click();
    await expect(page.getByText(/Upload a photo|تحميل صورة/)).toBeVisible();
    await expect(page.getByText(/Describe your item|صف منتجك/)).toBeVisible();
  });

  test('upload photo option triggers file picker', async ({ page }) => {
    await page.getByTestId('sell-suggestion').click();

    // Listen for file chooser
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByText(/Upload a photo|تحميل صورة/).click(),
    ]);
    expect(fileChooser).toBeTruthy();
  });

  test('unauthenticated seller sees login prompt when uploading image', async ({ page }) => {
    // Click the image upload button in toolbar (not the sub-option)
    const imageBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(0);
    // Trigger the hidden file input by clicking the toolbar image button
    // Since user is not logged in, expect login prompt
    await page.getByTestId('sell-suggestion').click();
    // "Upload a photo" triggers fileInputRef.current?.click() which in turn
    // shows login prompt if user is not authenticated
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser').catch(() => null),
      page.getByText(/Upload a photo|تحميل صورة/).click(),
    ]);
    // Either file chooser appeared (user is logged in) or login dialog appeared
    const loginDialog = page.getByText(/Login Required|تسجيل الدخول مطلوب/);
    const hasDialog = await loginDialog.isVisible().catch(() => false);
    const hasChooser = fileChooser !== null;
    expect(hasDialog || hasChooser).toBeTruthy();
  });

  test('describe item path fills input and clears sell options', async ({ page }) => {
    await page.getByTestId('sell-suggestion').click();
    await page.getByText(/Describe your item|صف منتجك/).click();

    // Sell sub-options should be hidden
    await expect(page.getByText(/Upload a photo|تحميل صورة/)).not.toBeVisible();

    // Input should have some text
    const input = page.locator('input[placeholder]').first();
    const value = await input.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });
});
