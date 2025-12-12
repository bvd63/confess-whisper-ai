import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildSupportMailto } from '@/lib/support';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';


const AiSupport = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, isLoading } = useCurrentUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [issue, setIssue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const supportMailto = useMemo(() => buildSupportMailto(language), [language]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
    // Pre-fill email if user is logged in
    if (user?.email) {
      setEmail(user.email);
    }
  }, [isLoading, user, navigate]);

  if (isLoading || !user) {
    return null;
  }

  const handleSendEmail = () => {
    if (!name.trim() || !email.trim() || !issue.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSending(true);

    // Construct mailto link with form data
    const subject = encodeURIComponent(`Support Request from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nIssue:\n${issue}`);
    const mailtoLink = `mailto:confess.supp@gmail.com?subject=${subject}&body=${body}`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    setTimeout(() => {
      setIsSending(false);
      toast.success('Email client opened. Please send the email to complete your request.');
    }, 500);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-24 pt-4">

        {/* AI Support Title - Large Gradient Text */}
        <div className="px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-primary via-primary/80 to-neon-blue bg-clip-text text-transparent">
            AI Support
          </h1>
        </div>

        {/* Form Card - Glass Design */}
        <div className="px-4">
          <div className="glass-card-glow p-6 space-y-5">
            {/* Name Input */}
            <div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="h-14 rounded-2xl bg-muted/40 border-border/40 text-base px-5 placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-muted/60"
              />
            </div>

            {/* Email Input */}
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-14 rounded-2xl bg-muted/40 border-border/40 text-base px-5 placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-muted/60"
              />
            </div>

            {/* Issue Textarea */}
            <div>
              <Textarea
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Describe your issue"
                rows={6}
                className="rounded-2xl bg-muted/40 border-border/40 text-base px-5 py-4 resize-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-muted/60"
              />
            </div>

            {/* Send Email Button - Gradient */}
            <Button
              onClick={handleSendEmail}
              disabled={isSending}
              className="w-full h-14 rounded-2xl btn-gradient text-lg font-semibold flex items-center justify-center gap-3"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AiSupport;