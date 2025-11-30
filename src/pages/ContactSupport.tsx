import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildContactSupportMailto } from '@/lib/support';

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
  const [formState, setFormState] = useState<ContactFormState>({
    name: '',
    email: '',
    issue: '',
  });
  const [touched, setTouched] = useState({ name: false, email: false, issue: false });
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setTouched({ name: true, email: true, issue: true });

    if (!isFormValid) {
      return;
    }

    const mailto = buildContactSupportMailto({
      language,
      name: trimmedName,
      email: trimmedEmail,
      issue: trimmedIssue,
    });

    if (typeof window !== 'undefined') {
      window.location.href = mailto;
    }
  };

  const shouldShowError = (field: keyof ContactFormState) => {
    if (field === 'name') return (touched.name || submitted) && Boolean(errors.name);
    if (field === 'email') return (touched.email || submitted) && Boolean(errors.email);
    return (touched.issue || submitted) && Boolean(errors.issue);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-16">
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
                <Mail className="h-5 w-5 text-muted-foreground" />
                {t.contact_support_title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t.contact_support_description}
              </p>
            </div>
          </div>
        </div>

        <Card className="mx-4 mt-4 p-6 rounded-2xl">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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

            <Button type="submit" className="w-full sm:w-auto" disabled={!isFormValid}>
              {t.contact_support_button}
            </Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ContactSupport;
