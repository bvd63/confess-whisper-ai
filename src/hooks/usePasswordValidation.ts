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

const SPECIAL_CHARACTERS = "!@#$%^&*()_+-=[]{}.,?:;|<>";
const SPECIAL_CHAR_CLASS = SPECIAL_CHARACTERS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SPECIAL_CHAR_REGEX = new RegExp(`[${SPECIAL_CHAR_CLASS}]`);
const PASSWORD_REGEX = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[${SPECIAL_CHAR_CLASS}]).{10,}$`
);

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
      test: (pwd: string) => SPECIAL_CHAR_REGEX.test(pwd),
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
