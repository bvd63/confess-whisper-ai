import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.share_title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleShare('facebook')}
              className="gap-2"
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare('twitter')}
              className="gap-2"
            >
              <Twitter className="w-4 h-4" />
              Twitter
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare('linkedin')}
              className="gap-2"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare('email')}
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleCopyLink}
              variant="secondary"
              className="w-full gap-2"
            >
              <Link2 className="w-4 h-4" />
              {t.share_copy_link}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;