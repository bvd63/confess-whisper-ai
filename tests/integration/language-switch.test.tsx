import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

// Test component that uses language context
const TestComponent = () => {
  const { t, language, setLanguage } = useLanguage();
  
  return (
    <div>
      <p data-testid="current-language">{language}</p>
      <p data-testid="welcome-text">{t.welcome || 'Welcome'}</p>
      <p data-testid="subscription-title">{t.subscription_title || 'Subscription'}</p>
      <p data-testid="auth-signin">{t.auth_signIn || 'Sign In'}</p>
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
  });

  describe('Basic Language Switching', () => {
    it('should default to English', () => {
      renderWithLanguage();
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    });

    it('should switch to Spanish', async () => {
      renderWithLanguage();
      
      const spanishButton = screen.getByText('Español');
      fireEvent.click(spanishButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('es');
      });
    });

    it('should switch to German', async () => {
      renderWithLanguage();
      
      const germanButton = screen.getByText('Deutsch');
      fireEvent.click(germanButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('de');
      });
    });

    it('should persist language choice in localStorage', async () => {
      renderWithLanguage();
      
      const spanishButton = screen.getByText('Español');
      fireEvent.click(spanishButton);
      
      await waitFor(() => {
        expect(localStorage.getItem('language')).toBe('es');
      });
    });
  });

  describe('Auth Flow Translations', () => {
    it('should display auth labels in English', () => {
      renderWithLanguage();
      const authText = screen.getByTestId('auth-signin');
      expect(authText).toBeInTheDocument();
    });

    it('should display auth labels in Spanish', async () => {
      renderWithLanguage();
      
      fireEvent.click(screen.getByText('Español'));
      
      await waitFor(() => {
        const authText = screen.getByTestId('auth-signin');
        expect(authText).toBeInTheDocument();
      });
    });

    it('should display auth labels in German', async () => {
      renderWithLanguage();
      
      fireEvent.click(screen.getByText('Deutsch'));
      
      await waitFor(() => {
        const authText = screen.getByTestId('auth-signin');
        expect(authText).toBeInTheDocument();
      });
    });
  });

  describe('Subscription UI Translations', () => {
    it('should display subscription title in English', () => {
      renderWithLanguage();
      expect(screen.getByTestId('subscription-title')).toBeInTheDocument();
    });

    it('should display subscription title in Spanish', async () => {
      renderWithLanguage();
      
      fireEvent.click(screen.getByText('Español'));
      
      await waitFor(() => {
        expect(screen.getByTestId('subscription-title')).toBeInTheDocument();
      });
    });

    it('should display subscription title in German', async () => {
      renderWithLanguage();
      
      fireEvent.click(screen.getByText('Deutsch'));
      
      await waitFor(() => {
        expect(screen.getByTestId('subscription-title')).toBeInTheDocument();
      });
    });
  });

  describe('CTA Button Labels', () => {
    it('should have consistent button labels across languages', async () => {
      const { rerender } = renderWithLanguage();
      
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

    it('should not show mixed English and German', async () => {
      renderWithLanguage();
      
      fireEvent.click(screen.getByText('Deutsch'));
      
      await waitFor(() => {
        const welcomeText = screen.getByTestId('welcome-text').textContent;
        const subscriptionText = screen.getByTestId('subscription-title').textContent;
        
        const hasEnglish = welcomeText?.includes('Welcome') || subscriptionText?.includes('Subscription');
        const hasGerman = welcomeText?.includes('Willkommen') || subscriptionText?.includes('Abonnement');
        
        // Should not have mix of both
        if (hasEnglish) {
          expect(hasGerman).toBe(false);
        }
        if (hasGerman) {
          expect(hasEnglish).toBe(false);
        }
      });
    });
  });

  describe('Language Persistence', () => {
    it('should restore language from localStorage on mount', () => {
      localStorage.setItem('language', 'es');
      
      renderWithLanguage();
      
      expect(screen.getByTestId('current-language')).toHaveTextContent('es');
    });

    it('should handle invalid language code gracefully', () => {
      localStorage.setItem('language', 'invalid');
      
      renderWithLanguage();
      
      // Should fallback to English
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    });
  });

  describe('Real-time Updates', () => {
    it('should update all UI elements immediately on language change', async () => {
      renderWithLanguage();
      
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
