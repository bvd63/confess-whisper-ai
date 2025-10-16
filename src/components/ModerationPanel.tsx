import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface Confession {
  id: string;
  content: string;
  category: string;
  user_id: string;
  created_at: string;
  moderation_status: string;
  is_reported: boolean;
  likes_count: number;
  comments_count: number;
}

interface ModerationPanelProps {
  userId: string;
}

const ModerationPanel = ({ userId }: ModerationPanelProps) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfession, setSelectedConfession] = useState<Confession | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    checkUserRole();
    loadConfessions();
  }, [userId]);

  const checkUserRole = async () => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['admin', 'moderator'])
        .maybeSingle();

      setUserRole(data?.role || null);
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadConfessions = async () => {
    try {
      // Get confessions that need moderation (pending status OR reported)
      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .or('moderation_status.eq.pending,is_reported.eq.true')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get report counts for reported confessions
      const reportedIds = data?.filter(c => c.is_reported).map(c => c.id) || [];
      
      if (reportedIds.length > 0) {
        const { data: reports } = await supabase
          .from('confession_reports')
          .select('confession_id, reason, details, reporter_id')
          .in('confession_id', reportedIds)
          .eq('status', 'pending');

        // Add report info to confessions
        const confessionsWithReports = data?.map(c => {
          const confessionReports = reports?.filter(r => r.confession_id === c.id) || [];
          return { ...c, reports: confessionReports };
        });

        setConfessions(confessionsWithReports || []);
      } else {
        setConfessions(data || []);
      }
    } catch (error) {
      console.error('Error loading confessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const moderateConfession = async (
    confessionId: string,
    action: 'approve' | 'reject' | 'flag',
    reason?: string
  ) => {
    try {
      // Update confession status
      const { error: updateError } = await supabase
        .from('confessions')
        .update({
          moderation_status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged',
          moderated_by: userId,
          moderated_at: new Date().toISOString(),
          is_reported: false, // Clear reported flag
        })
        .eq('id', confessionId);

      if (updateError) throw updateError;

      // Update all related reports
      const { error: reportsError } = await supabase
        .from('confession_reports')
        .update({
          status: action === 'approve' ? 'dismissed' : 'resolved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('confession_id', confessionId)
        .eq('status', 'pending');

      if (reportsError) throw reportsError;

      // Log moderation action
      const { error: logError } = await supabase
        .from('moderation_logs')
        .insert({
          confession_id: confessionId,
          moderator_id: userId,
          action,
          reason: reason || null,
        });

      if (logError) throw logError;

      toast({
        title: "Acțiune efectuată",
        description: `Confesiunea a fost ${action === 'approve' ? 'aprobată' : action === 'reject' ? 'respinsă' : 'marcată'}`,
      });

      setSelectedConfession(null);
      setModerationReason("");
      loadConfessions();
    } catch (error) {
      console.error('Error moderating confession:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut efectua acțiunea",
        variant: "destructive",
      });
    }
  };

  if (!userRole) {
    return (
      <Card className="p-6 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Nu ai permisiuni de moderare
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">Se încarcă...</p>
      </Card>
    );
  }

  const pendingConfessions = confessions.filter(c => c.moderation_status === 'pending');
  const reportedConfessions = confessions.filter(c => c.is_reported);

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Panoul de moderare</h2>
          <Badge variant="secondary" className="ml-auto">
            {userRole === 'admin' ? 'Administrator' : 'Moderator'}
          </Badge>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              În așteptare ({pendingConfessions.length})
            </TabsTrigger>
            <TabsTrigger value="reported" className="gap-2">
              <Shield className="w-4 h-4" />
              Raportate ({reportedConfessions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingConfessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nu există confesiuni în așteptare
              </p>
            ) : (
              pendingConfessions.map((confession) => (
                <Card key={confession.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm mb-2">{confession.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Categorie: {confession.category}</span>
                          <span>
                            {new Date(confession.created_at).toLocaleDateString('ro-RO')}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline">{confession.moderation_status}</Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => moderateConfession(confession.id, 'approve')}
                        className="gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Aprobă
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setSelectedConfession(confession)}
                        className="gap-1"
                      >
                        <X className="w-4 h-4" />
                        Respinge
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="reported" className="space-y-4 mt-4">
            {reportedConfessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nu există confesiuni raportate
              </p>
            ) : (
              reportedConfessions.map((confession: any) => (
                <Card key={confession.id} className="p-4 border-destructive/50">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="text-sm font-semibold text-destructive">
                            Raportată {confession.reports?.length ? `(${confession.reports.length} rapoarte)` : ''}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{confession.content}</p>
                        
                        {/* Show reports */}
                        {confession.reports && confession.reports.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Motive:</p>
                            {confession.reports.slice(0, 3).map((report: any, idx: number) => (
                              <div key={idx} className="text-xs bg-destructive/10 p-2 rounded">
                                <p className="font-medium">{report.reason}</p>
                                {report.details && (
                                  <p className="text-muted-foreground mt-1">{report.details}</p>
                                )}
                              </div>
                            ))}
                            {confession.reports.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{confession.reports.length - 3} mai multe rapoarte
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span>👍 {confession.likes_count}</span>
                          <span>💬 {confession.comments_count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => moderateConfession(confession.id, 'approve')}
                        className="gap-1"
                      >
                        <Check className="w-4 h-4" />
                        {t.moderation_keep}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setSelectedConfession(confession)}
                        className="gap-1"
                      >
                        <X className="w-4 h-4" />
                        {t.moderation_delete}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={!!selectedConfession} onOpenChange={() => setSelectedConfession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respinge confesiunea</DialogTitle>
            <DialogDescription>
              Oferă un motiv pentru respingerea acestei confesiuni
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Motiv (opțional)..."
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              className="min-h-[100px]"
            />

            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedConfession(null)}
                variant="outline"
                className="flex-1"
              >
                {t.moderation_cancel}
              </Button>
              <Button
                onClick={() => {
                  if (selectedConfession) {
                    moderateConfession(selectedConfession.id, 'reject', moderationReason);
                  }
                }}
                variant="destructive"
                className="flex-1"
              >
                Respinge
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ModerationPanel;
