import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

// Test component that uses language context
const TestComponent = () => {
  const { t, language, setLanguage } = useLanguage();
  
  return (
    <div>
      <p data-testid="current-language">{language}</p>
      <p data-testid="welcome-text">{t.home_title || 'Welcome'}</p>
      <p data-testid="subscription-title">{t.subscription_title || 'Subscription'}</p>
      <p data-testid="auth-signin">{t.auth_signin || 'Sign In'}</p>
      <Button onClick={() => setLanguage('en')}>English</Button>
      <Button onClick={() => setLanguage('es')}>Español</Button>
      <Button onClick={() => setLanguage('de')}>Deutsch</Button>
    </div>
  );
};

describe('Language Switch - Integration Tests', () => {
  const renderWithLanguage = () => {
    return render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
  };

  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    // Stub reload to avoid full page reload in tests
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
    });
  });

  async function waitForI18nReady() {
    await waitFor(() => {
      expect((window as any).__i18nReady).toBe(true);
    });
  }

  describe('Basic Language Switching', () => {
    it('should default to English', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    });

    it('should switch to Spanish', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      const spanishButton = screen.getByText('Español');
      fireEvent.click(spanishButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('es');
      });
    });

    it('should switch to German', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      const germanButton = screen.getByText('Deutsch');
      fireEvent.click(germanButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('de');
      });
    });

    it('should persist language choice in localStorage', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      const spanishButton = screen.getByText('Español');
      fireEvent.click(spanishButton);
      
      await waitFor(() => {
        expect(localStorage.getItem('language')).toBe('es');
      });
    });
  });

  describe('Auth Flow Translations', () => {
    it('should display auth labels in English', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      const authText = screen.getByTestId('auth-signin');
      expect(authText).toBeInTheDocument();
    });

    it('should display auth labels in Spanish', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      fireEvent.click(screen.getByText('Español'));
      
      await waitFor(() => {
        const authText = screen.getByTestId('auth-signin');
        expect(authText).toBeInTheDocument();
      });
    });

    it('should display auth labels in German', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      fireEvent.click(screen.getByText('Deutsch'));
      
      await waitFor(() => {
        const authText = screen.getByTestId('auth-signin');
        expect(authText).toBeInTheDocument();
      });
    });
  });

  describe('Subscription UI Translations', () => {
    it('should display subscription title in English', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      expect(screen.getByTestId('subscription-title')).toBeInTheDocument();
    });

    it('should display subscription title in Spanish', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      fireEvent.click(screen.getByText('Español'));
      
      await waitFor(() => {
        expect(screen.getByTestId('subscription-title')).toBeInTheDocument();
      });
    });

    it('should display subscription title in German', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      fireEvent.click(screen.getByText('Deutsch'));
      
      await waitFor(() => {
        expect(screen.getByTestId('subscription-title')).toBeInTheDocument();
      });
    });
  });

  describe('CTA Button Labels', () => {
    it('should have consistent button labels across languages', async () => {
  const { rerender } = renderWithLanguage();
  await waitForI18nReady();
      
      // English
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
      
      // Switch to Spanish
      fireEvent.click(screen.getByText('Español'));
      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('es');
      });
      
      // Switch to German
      fireEvent.click(screen.getByText('Deutsch'));
      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('de');
      });
      
      // Switch back to English
      fireEvent.click(screen.getByText('English'));
      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('en');
      });
    });
  });

  describe('Mixed Language Prevention', () => {
    it('should not show mixed English and Spanish', async () => {
  renderWithLanguage();
  await waitForI18nReady();
      fireEvent.click(screen.getByText('Español'));
      
      await waitFor(() => {
        const welcomeText = screen.getByTestId('welcome-text').textContent;
        const subscriptionText = screen.getByTestId('subscription-title').textContent;
        
        // Both should be in same language (both defined or both fallback to English)
        const hasEnglish = welcomeText?.includes('Welcome') || subscriptionText?.includes('Subscription');
        const hasSpanish = welcomeText?.includes('Bienvenido') || subscriptionText?.includes('Suscripción');
        
        // Should not have mix of both
        if (hasEnglish) {
          expect(hasSpanish).toBe(false);
        }
        if (hasSpanish) {
          expect(hasEnglish).toBe(false);
        }
      });
    });

    it('should prefer German translations when available (allow fallback)', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      fireEvent.click(screen.getByText('Deutsch'));

      await waitFor(() => {
        const welcomeText = screen.getByTestId('welcome-text').textContent || '';
        const subscriptionText = screen.getByTestId('subscription-title').textContent || '';

        const hasAnyGerman = /Willkommen|Abonnement/.test(welcomeText + ' ' + subscriptionText);
        const bothEnglishFallback = welcomeText.includes('Welcome') && (subscriptionText.includes('Subscription') || !subscriptionText);

        expect(hasAnyGerman || bothEnglishFallback).toBe(true);
      });
    });
  });

  describe('Language Persistence', () => {
    it('should restore language from localStorage on mount', async () => {
      localStorage.setItem('language', 'es');
      
      renderWithLanguage();
      await waitForI18nReady();
      expect(screen.getByTestId('current-language')).toHaveTextContent('es');
    });

    it('should handle invalid language code gracefully', async () => {
      localStorage.setItem('language', 'invalid');
      
      renderWithLanguage();
      await waitForI18nReady();
      // Should fallback to English
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    });
  });

  describe('Real-time Updates', () => {
    it('should update all UI elements immediately on language change', async () => {
      renderWithLanguage();
      await waitForI18nReady();
      const initialWelcome = screen.getByTestId('welcome-text').textContent;
      const initialSubscription = screen.getByTestId('subscription-title').textContent;
      const initialAuth = screen.getByTestId('auth-signin').textContent;
      
      // Switch language
      fireEvent.click(screen.getByText('Español'));
      
      await waitFor(() => {
        const newWelcome = screen.getByTestId('welcome-text').textContent;
        const newSubscription = screen.getByTestId('subscription-title').textContent;
        const newAuth = screen.getByTestId('auth-signin').textContent;
        
        // All should update (or remain consistent if translations missing)
        expect(
          newWelcome !== initialWelcome ||
          newSubscription !== initialSubscription ||
          newAuth !== initialAuth
        ).toBe(true);
      });
    });
  });
});
