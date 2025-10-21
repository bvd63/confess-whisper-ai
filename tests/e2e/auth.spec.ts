// ... existing code ...
test.describe("Auth Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto("/");
    await page.evaluate(async () => {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    });
    await page.goto("/auth");
  });

  test("should allow user to sign in with email", async ({ page }) => {
// ... existing code ...
    await page.waitForURL("/");

    // Verify session
    const session = await page.evaluate(async () => {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      return data.session;
    });
    expect(session).not.toBeNull();
    expect(session?.user.email).toBe("test@example.com");
  });

  test("should allow user to sign up and then sign in", async ({ page }) => {
// ... existing code ...
    await page.waitForURL("/");

    // Verify session
    const session = await page.evaluate(async () => {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      return data.session;
    });
    expect(session).not.toBeNull();
    expect(session?.user.email).toBe("newuser@example.com");
  });
});
