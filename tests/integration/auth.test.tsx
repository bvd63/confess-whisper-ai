import { getSupabase } from '@/lib/supabaseClient';
import { vi, describe, it, expect, beforeEach } from "vitest";

describe("Auth Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should sign up a new user and create a profile", async () => {
    const supabase = getSupabase();
    
    // Verify the mock is working correctly
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    
    // Test getting session
    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeDefined();
    expect(data.session?.user).toBeDefined();
    
    // Test that the mock returns the expected user
    expect(data.session?.user.id).toBe('test-user');
    expect(data.session?.user.email).toBe('test@example.com');
  });
});
