import { useMemo } from 'react';

export interface PasswordRule {
  id: string;
  test: (password: string) => boolean;
  translationKey: string;
  passed?: boolean;
}

export interface PasswordValidation {
  rules: Array<PasswordRule & { passed: boolean }>;
  allRulesPassed: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  strengthScore: number;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}.,?:;|<>]).{10,}$/;

export const usePasswordValidation = (password: string): PasswordValidation => {
  const rules: PasswordRule[] = useMemo(() => [
    {
      id: 'length',
      test: (pwd: string) => pwd.length >= 10,
      translationKey: 'auth_password_rules_len',
    },
    {
      id: 'uppercase',
      test: (pwd: string) => /[A-Z]/.test(pwd),
      translationKey: 'auth_password_rules_upper',
    },
    {
      id: 'lowercase',
      test: (pwd: string) => /[a-z]/.test(pwd),
      translationKey: 'auth_password_rules_lower',
    },
    {
      id: 'digit',
      test: (pwd: string) => /\d/.test(pwd),
      translationKey: 'auth_password_rules_digit',
    },
    {
      id: 'special',
      test: (pwd: string) => /[!@#$%^&*()_+\-=\[\]{}.,?:;|<>]/.test(pwd),
      translationKey: 'auth_password_rules_special',
    },
  ], []);

  const validation = useMemo(() => {
    const passedRules = rules.filter(rule => rule.test(password));
    const allRulesPassed = passedRules.length === rules.length;
    const strengthScore = passedRules.length;

    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (strengthScore <= 2) {
      strength = 'weak';
    } else if (strengthScore === 3) {
      strength = 'fair';
    } else if (strengthScore === 4) {
      strength = 'good';
    } else {
      strength = 'strong';
    }

    return {
      rules: rules.map(rule => ({
        ...rule,
        passed: rule.test(password),
      })),
      allRulesPassed,
      strength,
      strengthScore,
    };
  }, [password, rules]);

  return validation;
};

export const validatePasswordStrength = (password: string): boolean => {
  return PASSWORD_REGEX.test(password);
};
