import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileJson, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { logError } from "@/lib/logger";

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const ExportDataDialog = ({ open, onOpenChange, userId }: ExportDataDialogProps) => {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [includeConfessions, setIncludeConfessions] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeLikes, setIncludeLikes] = useState(false);
  const [includeBookmarks, setIncludeBookmarks] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const exportData = async () => {
    setExporting(true);

    try {
      const exportData: any = {
        exported_at: new Date().toISOString(),
        user_id: userId,
      };

      // Fetch confessions
      if (includeConfessions) {
        const { data: confessions } = await supabase
          .from('confessions')
          .select('*')
          .eq('user_id', userId);
        exportData.confessions = confessions;
      }

      // Fetch comments
      if (includeComments) {
        const { data: comments } = await supabase
          .from('comments')
          .select('*')
          .eq('user_id', userId);
        exportData.comments = comments;
      }

      // Fetch likes
      if (includeLikes) {
        const { data: likes } = await supabase
          .from('user_likes')
          .select('*, confessions(*)')
          .eq('user_id', userId);
        exportData.likes = likes;
      }

      // Fetch bookmarks
      if (includeBookmarks) {
        const { data: bookmarks } = await supabase
          .from('bookmarks')
          .select('*, confessions(*)')
          .eq('user_id', userId);
        exportData.bookmarks = bookmarks;
      }

      // Fetch profile stats
      const { data: streaks } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();
      exportData.streaks = streaks;

      const { data: badges } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', userId);
      exportData.badges = badges;

      const { data: moods } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId);
      exportData.moods = moods;

      // Create download
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        downloadFile(blob, `confessions_data_${Date.now()}.json`);
      } else {
        // Convert to CSV (simplified)
        let csv = 'Type,Content,Category,Created At\n';
        
        if (exportData.confessions) {
          exportData.confessions.forEach((c: any) => {
            csv += `Confession,"${c.content.replace(/"/g, '""')}",${c.category},${c.created_at}\n`;
          });
        }
        
        if (exportData.comments) {
          exportData.comments.forEach((c: any) => {
            csv += `Comment,"${c.content.replace(/"/g, '""')}",N/A,${c.created_at}\n`;
          });
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        downloadFile(blob, `confessions_data_${Date.now()}.csv`);
      }

      toast({
        title: t.export_success,
        description: t.export_success_desc,
      });

      onOpenChange(false);
    } catch (error) {
      logError('Error exporting data', error instanceof Error ? error : undefined);
      toast({
        title: t.common_error,
        description: t.export_error,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.export_title}</DialogTitle>
          <DialogDescription>
            {t.export_description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t.export_format}</Label>
            <div className="flex gap-2">
              <Button
                variant={format === 'json' ? 'default' : 'outline'}
                onClick={() => setFormat('json')}
                className="flex-1"
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button
                variant={format === 'csv' ? 'default' : 'outline'}
                onClick={() => setFormat('csv')}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t.export_what}</Label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confessions"
                  checked={includeConfessions}
                  onCheckedChange={(checked) => setIncludeConfessions(checked as boolean)}
                />
                <Label htmlFor="confessions" className="text-sm font-normal cursor-pointer">
                  {t.export_my_confessions}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="comments"
                  checked={includeComments}
                  onCheckedChange={(checked) => setIncludeComments(checked as boolean)}
                />
                <Label htmlFor="comments" className="text-sm font-normal cursor-pointer">
                  {t.export_my_comments}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="likes"
                  checked={includeLikes}
                  onCheckedChange={(checked) => setIncludeLikes(checked as boolean)}
                />
                <Label htmlFor="likes" className="text-sm font-normal cursor-pointer">
                  {t.export_my_likes}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bookmarks"
                  checked={includeBookmarks}
                  onCheckedChange={(checked) => setIncludeBookmarks(checked as boolean)}
                />
                <Label htmlFor="bookmarks" className="text-sm font-normal cursor-pointer">
                  {t.export_my_bookmarks}
                </Label>
              </div>
            </div>
          </div>

          <Button
            onClick={exportData}
            disabled={exporting || (!includeConfessions && !includeComments && !includeLikes && !includeBookmarks)}
            className="w-full"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.export_downloading}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t.export_download}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDataDialog;
