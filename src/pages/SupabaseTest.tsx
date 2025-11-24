import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabaseClient';
import { supabase as integrationSupabase } from '@/integrations/supabase/client';

const SupabaseTest = () => {
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    const results: any = {
      timestamp: new Date().toISOString(),
    };

    // Test 1: Check environment variables
    results.envVars = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '✅ Present' : '❌ Missing',
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing',
    };

    // Test 2: Check supabaseClient
    try {
      const supabase = getSupabase();
      results.supabaseClient = {
        status: '✅ Client created',
        url: (supabase as any).supabaseUrl,
      };
    } catch (error: any) {
      results.supabaseClient = {
        status: '❌ Error creating client',
        error: error.message,
      };
    }

    // Test 3: Check integration client
    try {
      results.integrationClient = {
        status: '✅ Integration client exists',
        url: (integrationSupabase as any).supabaseUrl,
      };
    } catch (error: any) {
      results.integrationClient = {
        status: '❌ Error with integration client',
        error: error.message,
      };
    }

    // Test 4: Test auth connection
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.getSession();
      results.authConnection = {
        status: error ? '❌ Auth connection failed' : '✅ Auth connection OK',
        hasSession: !!data.session,
        error: error?.message,
      };
    } catch (error: any) {
      results.authConnection = {
        status: '❌ Auth test failed',
        error: error.message,
      };
    }

    // Test 5: Test simple signup (will fail but shows connection)
    try {
      const supabase = getSupabase();
      const testEmail = `test${Date.now()}@example.com`;
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
      });
      
      results.signupTest = {
        status: error ? '⚠️ Signup attempted' : '✅ Signup works',
        error: error?.message,
        data: data ? 'User created' : 'No user',
      };
    } catch (error: any) {
      results.signupTest = {
        status: '❌ Signup test failed',
        error: error.message,
      };
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Supabase Connection Test</h1>
        
        {loading ? (
          <div className="text-xl">Running tests...</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
              <pre className="bg-gray-900 p-4 rounded overflow-auto">
                {JSON.stringify(testResults.envVars, null, 2)}
              </pre>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Supabase Client (supabaseClient.ts)</h2>
              <pre className="bg-gray-900 p-4 rounded overflow-auto">
                {JSON.stringify(testResults.supabaseClient, null, 2)}
              </pre>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Integration Client</h2>
              <pre className="bg-gray-900 p-4 rounded overflow-auto">
                {JSON.stringify(testResults.integrationClient, null, 2)}
              </pre>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Auth Connection Test</h2>
              <pre className="bg-gray-900 p-4 rounded overflow-auto">
                {JSON.stringify(testResults.authConnection, null, 2)}
              </pre>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Signup Test</h2>
              <pre className="bg-gray-900 p-4 rounded overflow-auto">
                {JSON.stringify(testResults.signupTest, null, 2)}
              </pre>
            </div>

            <div className="bg-blue-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">📋 Full Results</h2>
              <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => {
                setLoading(true);
                runTests();
              }}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold"
            >
              🔄 Run Tests Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupabaseTest;
