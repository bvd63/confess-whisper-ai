import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { UnifiedShopDialog } from '@/components/UnifiedShopDialog';

export default function Admin() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('queue');
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  
  const translations: any = {
    en: {
      'Loading...': 'Loading...',
      'Admin Dashboard': 'Admin Dashboard',
      'Manage content moderation and reports': 'Manage content moderation and reports',
      'Moderation Queue': 'Moderation Queue',
      'Reports': 'Reports',
      'AI Reason': 'AI Reason',
      'Approve': 'Approve',
      'Reject': 'Reject',
      'No items in moderation queue': 'No items in moderation queue',
      'Reported by': 'Reported by',
      'Anonymous': 'Anonymous',
      'Reported Content': 'Reported Content',
      'View': 'View',
      'Dismiss': 'Dismiss',
      'Take Action': 'Take Action',
      'No pending reports': 'No pending reports',
      'Action completed': 'Action completed',
      'Moderation action has been logged': 'Moderation action has been logged',
      'Report processed': 'Report processed',
      'Report has been updated': 'Report has been updated'
    },
    es: {
      'Loading...': 'Cargando...',
      'Admin Dashboard': 'Panel de Administración',
      'Manage content moderation and reports': 'Administrar moderación de contenido y reportes',
      'Moderation Queue': 'Cola de Moderación',
      'Reports': 'Reportes',
      'AI Reason': 'Razón de IA',
      'Approve': 'Aprobar',
      'Reject': 'Rechazar',
      'No items in moderation queue': 'No hay elementos en la cola de moderación',
      'Reported by': 'Reportado por',
      'Anonymous': 'Anónimo',
      'Reported Content': 'Contenido Reportado',
      'View': 'Ver',
      'Dismiss': 'Descartar',
      'Take Action': 'Tomar Acción',
      'No pending reports': 'No hay reportes pendientes',
      'Action completed': 'Acción completada',
      'Moderation action has been logged': 'La acción de moderación ha sido registrada',
      'Report processed': 'Reporte procesado',
      'Report has been updated': 'El reporte ha sido actualizado'
    },
    de: {
      'Loading...': 'Laden...',
      'Admin Dashboard': 'Admin-Dashboard',
      'Manage content moderation and reports': 'Inhaltsmoderation und Berichte verwalten',
      'Moderation Queue': 'Moderationswarteschlange',
      'Reports': 'Berichte',
      'AI Reason': 'KI-Grund',
      'Approve': 'Genehmigen',
      'Reject': 'Ablehnen',
      'No items in moderation queue': 'Keine Elemente in der Moderationswarteschlange',
      'Reported by': 'Gemeldet von',
      'Anonymous': 'Anonym',
      'Reported Content': 'Gemeldeter Inhalt',
      'View': 'Ansehen',
      'Dismiss': 'Ablehnen',
      'Take Action': 'Maßnahme ergreifen',
      'No pending reports': 'Keine ausstehenden Berichte',
      'Action completed': 'Aktion abgeschlossen',
      'Moderation action has been logged': 'Moderationsaktion wurde protokolliert',
      'Report processed': 'Bericht verarbeitet',
      'Report has been updated': 'Bericht wurde aktualisiert'
    }
  };
  
  const t = (key: string) => translations[language][key] || key;

  // Check if user is admin/moderator
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'moderator']);

      if (error) throw error;
      return data && data.length > 0 ? data[0].role : null;
    },
    enabled: !!user?.id,
  });

  // Fetch moderation queue - moved before early return to satisfy hooks rules
  const { data: queueItems, isLoading: queueLoading } = useQuery({
    queryKey: ['moderation-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moderation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userRole, // Only run if user has role
  });

  // Fetch reports - moved before early return
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['confession-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confession_reports')
        .select(`
          *,
          confession:confessions(id, content, user_id),
          reporter:profiles!confession_reports_reporter_id_fkey(nickname)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userRole, // Only run if user has role
  });

  // Approve/reject moderation queue item - moved before early return
  const moderateMutation = useMutation({
    mutationFn: async ({ itemId, action }: { itemId: string; action: 'approve' | 'reject' }) => {
      const { error } = await supabase
        .from('moderation_queue')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;

      // Log moderation action
      await supabase.from('moderation_logs').insert({
        moderator_id: user?.id,
        action: action === 'approve' ? 'approved' : 'rejected',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
      toast({
        title: t('Action completed'),
        description: t('Moderation action has been logged'),
      });
    },
  });

  // Handle report action - moved before early return
  const handleReportMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: string; action: 'approve' | 'dismiss' }) => {
      const { error } = await supabase
        .from('confession_reports')
        .update({
          status: action === 'approve' ? 'resolved' : 'dismissed',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confession-reports'] });
      toast({
        title: t('Report processed'),
        description: t('Report has been updated'),
      });
    },
  });

  // Redirect if not admin/moderator - moved AFTER all hooks
  if (!roleLoading && !userRole) {
    navigate('/');
    return null;
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'safe':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" /> Safe
        </Badge>;
      case 'borderline':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <AlertTriangle className="h-3 w-3 mr-1" /> Borderline
        </Badge>;
      case 'unsafe':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" /> Unsafe
        </Badge>;
      default:
        return null;
    }
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-screen">{t('Loading...')}</div>;
  }

  return (
    <>
    <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">{t('Admin Dashboard')}</h1>
            <p className="text-sm text-muted-foreground">{t('Manage content moderation and reports')}</p>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="queue">
              {t('Moderation Queue')} {queueItems && queueItems.length > 0 && `(${queueItems.length})`}
            </TabsTrigger>
            <TabsTrigger value="reports">
              {t('Reports')} {reports && reports.length > 0 && `(${reports.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-3 sm:space-y-4">
            {queueLoading ? (
              <Card className="p-4 sm:p-5 text-center text-muted-foreground">{t('Loading...')}</Card>
            ) : queueItems && queueItems.length > 0 ? (
              queueItems.map((item) => (
                <Card key={item.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getLevelBadge(item.moderation_level)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{item.content}</p>
                      {item.ai_reason && (
                        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <strong>{t('AI Reason')}:</strong> {item.ai_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moderateMutation.mutate({ itemId: item.id, action: 'approve' })}
                        disabled={moderateMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('Approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => moderateMutation.mutate({ itemId: item.id, action: 'reject' })}
                        disabled={moderateMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t('Reject')}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('No items in moderation queue')}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-3 sm:space-y-4">
            {reportsLoading ? (
              <Card className="p-4 sm:p-5 text-center text-muted-foreground">{t('Loading...')}</Card>
            ) : reports && reports.length > 0 ? (
              reports.map((report: any) => (
                <Card key={report.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{report.reason}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {t('Reported by')} {report.reporter?.nickname || t('Anonymous')}
                        </span>
                      </div>
                      {report.details && (
                        <p className="text-sm mb-2 text-muted-foreground">{report.details}</p>
                      )}
                      {report.confession && (
                        <div className="bg-muted p-3 rounded text-sm">
                          <p className="font-medium mb-1">{t('Reported Content')}:</p>
                          <p>{report.confession.content}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (report.confession_id) {
                            navigate(`/?confession=${report.confession_id}`);
                          }
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('View')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReportMutation.mutate({ reportId: report.id, action: 'dismiss' })}
                        disabled={handleReportMutation.isPending}
                      >
                        {t('Dismiss')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReportMutation.mutate({ reportId: report.id, action: 'approve' })}
                        disabled={handleReportMutation.isPending}
                      >
                        {t('Take Action')}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('No pending reports')}</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
    <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    </>
  );
}