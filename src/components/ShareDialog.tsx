import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/translated-dialog";
import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Linkedin, Link2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confessionId: string;
}

const ShareDialog = ({ open, onOpenChange, confessionId }: ShareDialogProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const shareUrl = `${window.location.origin}/?confession=${confessionId}`;
  const shareText = t.share_text;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: t.share_link_copied,
      description: t.share_link_copied,
    });
  };

  const handleShare = (platform: string) => {
    let url = '';
    
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl text-foreground">🔗 {t.share_title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => handleShare('facebook')}
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm rounded-lg border-border hover:bg-accent h-10"
              size="sm"
            >
              <Facebook className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              <span className="hidden sm:inline">Facebook</span>
              <span className="sm:hidden">FB</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare('twitter')}
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm rounded-lg border-border hover:bg-accent h-10"
              size="sm"
            >
              <Twitter className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Twitter</span>
              <span className="sm:hidden">𝕏</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare('linkedin')}
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm rounded-lg border-border hover:bg-accent h-10"
              size="sm"
            >
              <Linkedin className="w-3 h-3 sm:w-4 sm:h-4 text-blue-700" />
              LinkedIn
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare('email')}
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm rounded-lg border-border hover:bg-accent h-10"
              size="sm"
            >
              <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
              📧 Email
            </Button>
          </div>

          <div className="pt-3 sm:pt-4 border-t border-border">
            <Button
              onClick={handleCopyLink}
              variant="secondary"
              className="w-full gap-2 text-xs sm:text-sm rounded-lg h-10 bg-secondary hover:bg-secondary/80"
              size="sm"
            >
              <Link2 className="w-3 h-3 sm:w-4 sm:h-4" />
              📋 {t.share_copy_link}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;