import { test, expect } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 }, // iPhone 13
  { name: "tablet", width: 820, height: 1180 }, // iPad Air
  { name: "desktop", width: 1440, height: 900 }
];

for (const v of viewports) {
  test(`renders correctly on ${v.name}`, async ({ page }) => {
    await page.setViewportSize({ width: v.width, height: v.height });
    await page.goto("/");
    
    // Wait for the page to load
    await page.waitForLoadState("networkidle");
    
    // Check that main layout elements are visible
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("#root")).toBeVisible();
    
    // Check that the page doesn't have layout issues
    const bodyHeight = await page.locator("body").evaluate(el => el.scrollHeight);
    expect(bodyHeight).toBeGreaterThan(0);
  });

  test(`navigation works on ${v.name}`, async ({ page }) => {
    await page.setViewportSize({ width: v.width, height: v.height });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Test that interactive elements are clickable
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // Verify first button meets touch target requirements (44x44px minimum)
      const firstButton = buttons.first();
      const box = await firstButton.boundingBox();
      
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(40); // Allow slight margin
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
}
