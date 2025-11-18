import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { CaptchaChallengeDialog } from '@/components/CaptchaChallengeDialog';

interface ChallengeOptions {
  title?: string;
  message?: string;
  reason?: string | null;
}

interface CaptchaChallengeContextValue {
  requestChallenge: (options?: ChallengeOptions) => Promise<string>;
}

interface ChallengeState extends ChallengeOptions {
  open: boolean;
  promise: Promise<string>;
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

const CaptchaChallengeContext = createContext<CaptchaChallengeContextValue | undefined>(undefined);

export const CaptchaChallengeProvider = ({ children }: { children: ReactNode }) => {
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);

  const closeChallenge = useCallback(() => {
    setChallengeState(null);
  }, []);

  const requestChallenge = useCallback((options?: ChallengeOptions) => {
    if (challengeState?.promise) {
      return challengeState.promise;
    }

    let resolveFn: (token: string) => void;
    let rejectFn: (error: Error) => void;

    const promise = new Promise<string>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    setChallengeState({
      open: true,
      promise,
      resolve: (token: string) => {
        resolveFn(token);
        closeChallenge();
      },
      reject: (error: Error) => {
        rejectFn(error);
        closeChallenge();
      },
      title: options?.title,
      message: options?.message,
      reason: options?.reason ?? null,
    });

    return promise;
  }, [challengeState, closeChallenge]);

  const handleResolve = useCallback((token: string) => {
    challengeState?.resolve(token);
  }, [challengeState]);

  const handleCancel = useCallback(() => {
    if (challengeState) {
      challengeState.reject(new Error('captcha_cancelled'));
    }
  }, [challengeState]);

  const value = useMemo(() => ({ requestChallenge }), [requestChallenge]);

  return (
    <CaptchaChallengeContext.Provider value={value}>
      {children}
      <CaptchaChallengeDialog
        open={Boolean(challengeState?.open)}
        title={challengeState?.title}
        message={challengeState?.message}
        reason={challengeState?.reason}
        onResolve={handleResolve}
        onCancel={handleCancel}
      />
    </CaptchaChallengeContext.Provider>
  );
};

export const useCaptchaChallenge = () => {
  const context = useContext(CaptchaChallengeContext);
  if (!context) {
    throw new Error('useCaptchaChallenge must be used within a CaptchaChallengeProvider');
  }
  return context.requestChallenge;
};
