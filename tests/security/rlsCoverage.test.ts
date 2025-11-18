import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { buildRlsInventory } from '../../scripts/security/rlsInventory';

const CRITICAL_TABLES: Record<string, { policies: string[]; triggers?: string[] }> = {
  auth_sessions: {
    policies: [
      'Users can view their own sessions',
      'Users can insert their own sessions',
      'Users can update their own sessions',
      'Users can delete their own sessions',
      'Service role full access to sessions',
    ],
  },
  failed_login_attempts: {
    policies: ['Service role full access to failed_attempts'],
    triggers: ['trg_failed_login_normalize_email'],
  },
  captcha_requirements: {
    policies: ['Service role full access to captcha'],
    triggers: ['trg_captcha_requirements_normalize_email'],
  },
  security_events: {
    policies: [
      'Users can view their own security events',
      'Admins can view all security events',
      'Service role full access to security_events',
    ],
  },
  subscriptions: {
    policies: [
      'Users can view their own subscription',
      'Service role can manage subscriptions',
    ],
  },
  stripe_events: {
    policies: ['Service role can manage stripe_events'],
  },
};

const REQUIRED_FUNCTIONS = [
  'cleanup_expired_sessions',
  'cleanup_old_failed_attempts',
  'log_security_event',
  'revoke_all_user_sessions',
  'is_captcha_required',
  'get_failed_login_count',
  'mark_captcha_requirement',
  'clear_captcha_requirement',
  'get_security_health_snapshot',
];

describe('Supabase RLS + security inventory', () => {
  const inventory = buildRlsInventory(path.join(process.cwd(), 'supabase/migrations'));

  it('enforces RLS + policies on critical tables', () => {
    for (const [table, requirements] of Object.entries(CRITICAL_TABLES)) {
      const meta = inventory.tables[table];
      expect(meta, `Table ${table} should exist in migrations`).toBeTruthy();
      expect(meta?.rlsEnabled, `Table ${table} must have RLS enabled`).toBe(true);

      for (const policy of requirements.policies) {
        expect(meta?.policies.has(policy), `Missing policy "${policy}" on ${table}`).toBe(true);
      }

      for (const trigger of requirements.triggers ?? []) {
        expect(meta?.triggers.has(trigger), `Missing trigger "${trigger}" on ${table}`).toBe(true);
      }
    }
  });

  it('keeps helper security functions available', () => {
    for (const fn of REQUIRED_FUNCTIONS) {
      expect(
        inventory.functions.has(fn),
        `Helper function ${fn} should be defined in Supabase migrations`
      ).toBe(true);
    }
  });
});
