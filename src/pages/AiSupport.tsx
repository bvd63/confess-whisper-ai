import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, SendHorizontal, Bot, Mail } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { buildSupportMailto } from '@/lib/support';
import { getAiSupportAnswer } from '@/lib/aiSupport';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { logError } from '@/lib/logger';
import { persistenceManager } from '@/lib/persistenceManager';
import { analytics } from '@/lib/analytics';

interface SupportMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  initial?: boolean;
}

interface PersistedSupportChat {
  messages: SupportMessage[];
  lastLanguage: Language;
  lastUserId: string | null;
  updatedAt: string;
}

const MAX_MESSAGES = 25;

const createMessage = (role: SupportMessage['role'], content: string, initial = false): SupportMessage => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  role,
  content,
  timestamp: new Date().toISOString(),
  initial,
});

const limitMessages = (items: SupportMessage[]) =>
  items.length > MAX_MESSAGES ? items.slice(items.length - MAX_MESSAGES) : items;

const AiSupport = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, isLoading } = useCurrentUser();
  const initialMessage = useMemo(() => createMessage('ai', t.support_ai_initial_message, true), [t.support_ai_initial_message]);
  const [messages, setMessages] = useState<SupportMessage[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const supportMailto = useMemo(() => buildSupportMailto(language), [language]);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    let isMounted = true;
    const restoreHistory = async () => {
      try {
        const saved = await persistenceManager.get<PersistedSupportChat>('state', 'ai_support_chat');
        if (!isMounted || !saved) {
          return;
        }

        const isSameUser = !user?.id || !saved.lastUserId || saved.lastUserId === user.id;
        const isSameLanguage = saved.lastLanguage === language;

        if (isSameUser && isSameLanguage && Array.isArray(saved.messages) && saved.messages.length) {
          setMessages(limitMessages(saved.messages));
        }
      } catch (err) {
        logError('[AI Support] Failed to restore chat history', err as Error);
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    };

    restoreHistory();
    return () => {
      isMounted = false;
    };
  }, [language, user?.id]);

  useEffect(() => {
    if (isRestoring) return;

    const persistHistory = async () => {
      try {
        const payload: PersistedSupportChat = {
          messages: limitMessages(messages),
          lastLanguage: language,
          lastUserId: user?.id || null,
          updatedAt: new Date().toISOString(),
        };
        await persistenceManager.set('state', 'ai_support_chat', payload);
      } catch (err) {
        logError('[AI Support] Failed to persist chat history', err as Error);
      }
    };

    persistHistory();
  }, [messages, language, user?.id, isRestoring]);

  useEffect(() => {
    setMessages((prev) => {
      if (!prev.length || !prev[0].initial) {
        const updated = [createMessage('ai', t.support_ai_initial_message, true), ...prev];
        return limitMessages(updated);
      }
      if (prev[0].content === t.support_ai_initial_message) {
        return prev;
      }
      const updated = [...prev];
      updated[0] = { ...updated[0], content: t.support_ai_initial_message };
      return updated;
    });
  }, [t.support_ai_initial_message]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  if (isLoading || !user) {
    return null;
  }

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const content = input.trim();
    setInput('');
    setError(null);

    setMessages((prev) => limitMessages([...prev, createMessage('user', content)]));
    analytics.track('ai_support_user_message', {
      length: content.length,
      language,
      userId: user?.id || 'anonymous',
    });
    setIsSending(true);

    try {
      const answer = await getAiSupportAnswer(content, language, {
        userId: user?.id || null,
        totalMessages: messages.length + 1,
        clientTimestamp: new Date().toISOString(),
      });
      setMessages((prev) => limitMessages([...prev, createMessage('ai', answer)]));
      analytics.track('ai_support_ai_response', {
        length: answer.length,
        language,
        userId: user?.id || 'anonymous',
      });
    } catch (err) {
      logError('[AI Support] Unable to get response', err as Error);
      setError(t.support_ai_error);
      analytics.track('ai_support_error', {
        language,
        userId: user?.id || 'anonymous',
        messageLength: content.length,
        error: err instanceof Error ? err.message : 'unknown_error',
      });
    } finally {
      setIsSending(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto pb-20">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-accent rounded-xl h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bot className="h-5 w-5 text-muted-foreground" />
                {t.support_ai_title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t.support_ai_description}
              </p>
            </div>
          </div>
        </div>

        <Card className="mx-4 mt-4 overflow-hidden rounded-2xl">
          <ScrollArea className="h-[460px]">
            <div className="p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm border border-border/40',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t.support_ai_loading}</span>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border/70 p-4 space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-end gap-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                rows={3}
                placeholder={t.support_ai_input_placeholder}
                className="min-h-[96px] resize-none"
                disabled={isSending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                className="h-[96px] w-14"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
              </Button>
            </div>

            <Button variant="ghost" className="px-0 text-sm font-medium" asChild>
              <a href={supportMailto}>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t.support_ai_email_cta}
                </div>
              </a>
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AiSupport;
