/**
 * Load Testing Script for ConfessAI
 * Run with: k6 run scripts/load-test.js
 * 
 * Install k6: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 1000 },  // Ramp up to 1000 users
    { duration: '10m', target: 5000 }, // Ramp up to 5000 users
    { duration: '5m', target: 10000 }, // Peak: 10k concurrent
    { duration: '5m', target: 5000 },  // Ramp down
    { duration: '2m', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% < 200ms, 99% < 500ms
    http_req_failed: ['rate<0.01'],                // Error rate < 1%
    errors: ['rate<0.001'],                        // Custom error rate < 0.1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://80017639-50ef-40b6-8cd6-ddf69928bd44.lovableproject.com';
const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://fxwvlbopvnjjjrzshqvw.supabase.co';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4d3ZsYm9wdm5qampyenNocXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Mjg3ODQsImV4cCI6MjA3NjEwNDc4NH0.BXOtdXXS8PvqZSVcksyCuqNW0ebJ7nE58-CKSnSPk4Q';

// Test scenarios
export default function() {
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - View confessions feed
    testViewFeed();
  } else if (scenario < 0.7) {
    // 30% - View single confession
    testViewConfession();
  } else if (scenario < 0.85) {
    // 15% - Health check
    testHealthCheck();
  } else {
    // 15% - View communities
    testCommunities();
  }
  
  sleep(1); // Think time between requests
}

function testViewFeed() {
  const res = http.get(`${SUPABASE_URL}/rest/v1/confessions?select=*&order=created_at.desc&limit=20`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  });
  
  const success = check(res, {
    'feed status is 200': (r) => r.status === 200,
    'feed response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
}

function testViewConfession() {
  // First get a confession ID
  const listRes = http.get(`${SUPABASE_URL}/rest/v1/confessions?select=id&limit=1`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  });
  
  if (listRes.status === 200 && listRes.json().length > 0) {
    const confessionId = listRes.json()[0].id;
    
    const res = http.get(`${SUPABASE_URL}/rest/v1/confessions?id=eq.${confessionId}&select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      },
    });
    
    const success = check(res, {
      'confession status is 200': (r) => r.status === 200,
      'confession response time < 150ms': (r) => r.timings.duration < 150,
    });
    
    errorRate.add(!success);
  }
}

function testHealthCheck() {
  const res = http.get(`${SUPABASE_URL}/functions/v1/health`, {
    headers: {
      'apikey': ANON_KEY,
    },
  });
  
  const success = check(res, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
}

function testCommunities() {
  const res = http.get(`${SUPABASE_URL}/rest/v1/communities?select=*&limit=20`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  });
  
  const success = check(res, {
    'communities status is 200': (r) => r.status === 200,
    'communities response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
}

// Teardown function - run after test completes
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const { metrics } = data;
  
  return `
═══════════════════════════════════════════════════
  ConfessAI Load Test Results
═══════════════════════════════════════════════════

  Duration: ${data.state?.testRunDurationMs / 1000}s
  
  HTTP Requests:
  ✓ Total: ${metrics.http_reqs?.values?.count || 0}
  ✓ Failed: ${metrics.http_req_failed?.values?.rate * 100 || 0}%
  
  Response Times:
  ✓ p50: ${metrics.http_req_duration?.values['p(50)']?.toFixed(2) || 0}ms
  ✓ p95: ${metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0}ms
  ✓ p99: ${metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0}ms
  ✓ avg: ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms
  
  Virtual Users:
  ✓ Peak: ${metrics.vus_max?.values?.value || 0}
  
  Thresholds:
  ${Object.entries(data.thresholds || {}).map(([k, v]) => 
    `${v.ok ? '✓' : '✗'} ${k}`
  ).join('\n  ')}
  
═══════════════════════════════════════════════════
`;
}
