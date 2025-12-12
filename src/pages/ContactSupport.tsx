import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabaseClient';

interface ContactFormState {
  name: string;
  email: string;
  issue: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ContactSupport = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();
  const { t, language } = useLanguage();
  const supabase = getSupabase();
  const { toast } = useToast();
  const [formState, setFormState] = useState<ContactFormState>({
    name: '',
    email: '',
    issue: '',
  });
  const [touched, setTouched] = useState({ name: false, email: false, issue: false });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    setFormState((prev) => ({
      ...prev,
      name: prev.name || user.user_metadata?.full_name || user.user_metadata?.nickname || user.user_metadata?.name || '',
      email: prev.email || user.email || '',
    }));
  }, [user]);

  const trimmedName = formState.name.trim();
  const trimmedEmail = formState.email.trim();
  const trimmedIssue = formState.issue.trim();

  const errors = useMemo(() => ({
    name: trimmedName ? '' : t.validation_required_field,
    email: trimmedEmail
      ? emailPattern.test(trimmedEmail)
        ? ''
        : t.validation_email_invalid
      : t.validation_required_field,
    issue: trimmedIssue ? '' : t.validation_required_field,
  }), [trimmedName, trimmedEmail, trimmedIssue, t.validation_email_invalid, t.validation_required_field]);

  const isFormValid = !errors.name && !errors.email && !errors.issue;

  if (isLoading || !user) {
    return null;
  }

  const markTouched = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (field: keyof ContactFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setTouched({ name: true, email: true, issue: true });
    setServerError('');

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const { error } = await supabase.functions.invoke('contact-support', {
        body: {
          name: trimmedName,
          email: trimmedEmail,
          issue: trimmedIssue,
          language,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send support request');
      }

      setSubmitStatus('success');
      setFormState((prev) => ({ ...prev, issue: '' }));
      setTouched({ name: false, email: false, issue: false });
      setSubmitted(false);
      toast({
        title: t.contact_support_success_toast_title,
        description: t.contact_support_success_toast_body,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send support request';
      setSubmitStatus('error');
      setServerError(message);
      toast({
        title: t.contact_support_error_toast_title,
        description: t.contact_support_error_toast_body,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const shouldShowError = (field: keyof ContactFormState) => {
    if (field === 'name') return (touched.name || submitted) && Boolean(errors.name);
    if (field === 'email') return (touched.email || submitted) && Boolean(errors.email);
    return (touched.issue || submitted) && Boolean(errors.issue);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-16 pt-4">

        <Card className="mx-4 mt-4 p-6 rounded-2xl">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {submitStatus === 'success' && (
              <Alert className="border-green-200 bg-green-50 text-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertTitle>{t.contact_support_success_title}</AlertTitle>
                <AlertDescription>{t.contact_support_success_body}</AlertDescription>
              </Alert>
            )}

            {submitStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>{t.contact_support_error_title}</AlertTitle>
                <AlertDescription>
                  {t.contact_support_error_body}
                  {serverError && (
                    <span className="block text-xs text-muted-foreground mt-1 break-words">{serverError}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="contact-name">{t.contact_support_name_label}</Label>
              <Input
                id="contact-name"
                value={formState.name}
                onChange={handleChange('name')}
                onBlur={() => markTouched('name')}
                placeholder={t.contact_support_name_label}
                autoComplete="name"
              />
              {shouldShowError('name') && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">{t.contact_support_email_label}</Label>
              <Input
                id="contact-email"
                type="email"
                value={formState.email}
                onChange={handleChange('email')}
                onBlur={() => markTouched('email')}
                placeholder={t.contact_support_email_label}
                autoComplete="email"
              />
              {shouldShowError('email') && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-issue">{t.contact_support_issue_label}</Label>
              <Textarea
                id="contact-issue"
                value={formState.issue}
                onChange={handleChange('issue')}
                onBlur={() => markTouched('issue')}
                placeholder={t.contact_support_issue_label}
                rows={6}
              />
              {shouldShowError('issue') && (
                <p className="text-sm text-destructive">{errors.issue}</p>
              )}
            </div>

            <Button type="submit" className="w-full sm:w-auto" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.contact_support_button_sending}
                </>
              ) : (
                t.contact_support_button
              )}
            </Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ContactSupport;
