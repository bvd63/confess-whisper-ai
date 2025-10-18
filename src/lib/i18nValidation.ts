import { useLanguage } from '@/contexts/LanguageContext';
import { z } from 'zod';

// Custom error map for Zod that uses translations
export function createI18nErrorMap(t: any) {
  return (issue: z.ZodIssueOptionalMessage, ctx: z.ErrorMapCtx): { message: string } => {
    switch (issue.code) {
      case z.ZodIssueCode.too_small:
        if (issue.type === 'string') {
          return {
            message: t.validation_content_min.replace('{min}', String(issue.minimum))
          };
        }
        break;
      
      case z.ZodIssueCode.too_big:
        if (issue.type === 'string') {
          return {
            message: t.validation_content_max.replace('{max}', String(issue.maximum))
          };
        }
        break;
      
      case z.ZodIssueCode.invalid_string:
        if (issue.validation === 'email') {
          return { message: t.validation_email_invalid };
        }
        if (issue.validation === 'url') {
          return { message: t.validation_invalid_url };
        }
        break;
      
      case z.ZodIssueCode.invalid_type:
        if (issue.received === 'undefined') {
          return { message: t.validation_required_field };
        }
        break;
    }
    
    return { message: ctx.defaultError };
  };
}

// Hook to get translated validation schemas
export function useI18nValidation() {
  const { t } = useLanguage();
  
  // Set error map globally for Zod
  z.setErrorMap(createI18nErrorMap(t));
  
  return {
    getErrorMessage: (error: z.ZodError) => {
      const firstError = error.errors[0];
      return firstError?.message || t.system_validation_error;
    },
    
    formatMessage: (template: string, params: Record<string, string | number>) => {
      let result = template;
      Object.entries(params).forEach(([key, value]) => {
        result = result.replace(`{${key}}`, String(value));
      });
      return result;
    }
  };
}
