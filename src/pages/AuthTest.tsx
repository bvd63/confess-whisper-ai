import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { EnhancedButton } from "@/components/EnhancedButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, Lock, Eye, RefreshCw, LogOut, Trash2, 
  CheckCircle2, XCircle, Loader2, AlertCircle, User,
  Clock, Smartphone
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEnhancedAuth } from "@/hooks/useEnhancedAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function AuthTest() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, isLoading: userLoading } = useCurrentUser();
  const { listSessions, revokeSession, revokeAllSessions, checkCaptchaRequired } = useEnhancedAuth();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [captchaRequired, setCaptchaRequired] = useState<boolean | null>(null);
  const [isCheckingCaptcha, setIsCheckingCaptcha] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string>("");
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const { data, error } = await listSessions();
      if (error) throw error;
      setSessions(data || []);
      toast({
        title: "Sessions Loaded",
        description: `Found ${data?.length || 0} active sessions`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const { error } = await revokeSession(sessionId);
      if (error) throw error;
      toast({
        title: "Session Revoked",
        description: "The session has been revoked successfully",
      });
      loadSessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRevokeAll = async () => {
    try {
      const { error } = await revokeAllSessions();
      if (error) throw error;
      toast({
        title: "All Sessions Revoked",
        description: "All sessions have been revoked successfully",
      });
      setSessions([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckCaptcha = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingCaptcha(true);
    try {
      const required = await checkCaptchaRequired(testEmail);
      setCaptchaRequired(required);
      toast({
        title: "CAPTCHA Check Complete",
        description: required 
          ? "CAPTCHA is required for this email" 
          : "CAPTCHA is not required for this email",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCheckingCaptcha(false);
    }
  };

  const handleManualCleanup = async () => {
    setIsCleaningUp(true);
    setCleanupResult("");
    try {
      const { data, error } = await supabase.rpc('trigger_auth_cleanup');
      if (error) throw error;
      setCleanupResult("✅ Cleanup completed successfully!");
      toast({
        title: "Cleanup Complete",
        description: "Authentication data has been cleaned up",
      });
    } catch (error: any) {
      setCleanupResult(`❌ Error: ${error.message}`);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
        <AnimatedCard hover="glow" glass className="max-w-md p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-warning" />
          <h2 className="text-2xl font-bold mb-4">
            <GradientText variant="hero">Authentication Required</GradientText>
          </h2>
          <p className="text-muted-foreground mb-6">
            You need to be logged in to access the authentication testing dashboard.
          </p>
          <EnhancedButton onClick={() => navigate('/auth')} glow lift>
            Go to Login
          </EnhancedButton>
        </AnimatedCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-mesh p-4 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <AnimatedCard hover="glow" glass className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <GradientText variant="hero">
                  <Shield className="inline w-8 h-8 mr-2" />
                  Auth Testing Dashboard
                </GradientText>
              </h1>
              <p className="text-muted-foreground">
                Test and monitor authentication security features
              </p>
            </div>
            <EnhancedButton variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </EnhancedButton>
          </div>
        </AnimatedCard>

        {/* User Info */}
        <AnimatedCard hover="lift" glass className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Logged in as</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Authenticated
            </Badge>
          </div>
        </AnimatedCard>

        {/* Testing Tabs */}
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sessions">Session Management</TabsTrigger>
            <TabsTrigger value="captcha">CAPTCHA Testing</TabsTrigger>
            <TabsTrigger value="cleanup">Data Cleanup</TabsTrigger>
          </TabsList>

          {/* Session Management Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <AnimatedCard hover="glow" glass className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold mb-1">Active Sessions</h2>
                  <p className="text-sm text-muted-foreground">
                    View and manage your active authentication sessions
                  </p>
                </div>
                <div className="flex gap-2">
                  <EnhancedButton
                    onClick={loadSessions}
                    disabled={isLoadingSessions}
                    variant="outline"
                    size="sm"
                  >
                    {isLoadingSessions ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="ml-2">Refresh</span>
                  </EnhancedButton>
                  <EnhancedButton
                    onClick={handleRevokeAll}
                    disabled={sessions.length === 0}
                    variant="destructive"
                    size="sm"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Revoke All
                  </EnhancedButton>
                </div>
              </div>

              <Separator className="mb-4" />

              {sessions.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No sessions loaded. Click "Refresh" to load your active sessions.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session: any, idx: number) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Session #{idx + 1}</span>
                            {session.stay_connected && (
                              <Badge variant="outline" className="text-xs">
                                Stay Connected
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {session.device_id && (
                              <p>Device: {session.device_id.substring(0, 12)}...</p>
                            )}
                            {session.ip_address && (
                              <p>IP: {session.ip_address}</p>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <p>Created: {new Date(session.created_at).toLocaleString()}</p>
                            </div>
                            <p>Expires: {new Date(session.expires_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <EnhancedButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Revoke
                        </EnhancedButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AnimatedCard>
          </TabsContent>

          {/* CAPTCHA Testing Tab */}
          <TabsContent value="captcha" className="space-y-4">
            <AnimatedCard hover="glow" glass className="p-6">
              <h2 className="text-xl font-bold mb-4">CAPTCHA Requirement Check</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Test if CAPTCHA is required for a specific email address
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-email">Email Address</Label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>

                <EnhancedButton
                  onClick={handleCheckCaptcha}
                  disabled={isCheckingCaptcha || !testEmail}
                  glow
                  lift
                  className="w-full"
                >
                  {isCheckingCaptcha ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Check CAPTCHA Requirement
                </EnhancedButton>

                {captchaRequired !== null && (
                  <Alert className={captchaRequired ? "border-warning" : "border-green-500/20 bg-green-500/10"}>
                    {captchaRequired ? (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    <AlertDescription>
                      {captchaRequired
                        ? "🔒 CAPTCHA is REQUIRED for this email address"
                        : "✅ CAPTCHA is NOT required for this email address"}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </AnimatedCard>
          </TabsContent>

          {/* Data Cleanup Tab */}
          <TabsContent value="cleanup" className="space-y-4">
            <AnimatedCard hover="glow" glass className="p-6">
              <h2 className="text-xl font-bold mb-4">Manual Data Cleanup</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Manually trigger cleanup of expired authentication data. This runs automatically daily at 3 AM UTC.
              </p>

              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>What gets cleaned up:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Expired sessions</li>
                    <li>• Failed login attempts older than 30 days</li>
                    <li>• Expired CAPTCHA requirements</li>
                    <li>• Security events older than 90 days</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <EnhancedButton
                onClick={handleManualCleanup}
                disabled={isCleaningUp}
                glow
                lift
                className="w-full"
              >
                {isCleaningUp ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Run Cleanup Now
              </EnhancedButton>

              {cleanupResult && (
                <Alert className="mt-4">
                  <AlertDescription>{cleanupResult}</AlertDescription>
                </Alert>
              )}
            </AnimatedCard>

            <AnimatedCard hover="lift" glass className="p-6">
              <h3 className="text-lg font-bold mb-3">Cron Job Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Schedule:</span>
                  <Badge variant="outline">Daily at 3:00 AM UTC</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Function:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">cleanup-auth-data</code>
                </div>
              </div>
            </AnimatedCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}