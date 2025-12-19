import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { OptimizedImage } from "./OptimizedImage";
import { logError } from "@/lib/logger";

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
  currentImage?: string | null;
  disabled?: boolean;
}

const ImageUpload = ({ onImageUploaded, onImageRemoved, currentImage, disabled }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t.image_invalid_file,
        description: t.image_invalid_file_desc,
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t.image_too_large,
        description: t.image_invalid_file_desc,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('confession-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('confession-images')
        .getPublicUrl(data.path);

      setPreview(publicUrl);
      onImageUploaded(publicUrl);

      toast({
        title: t.image_added,
        description: t.image_upload_error,
      });
    } catch (error) {
      logError('Error uploading image', error instanceof Error ? error : undefined);
      toast({
        title: t.common_error,
        description: t.image_upload_error,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageRemoved();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5 sm:space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {!preview ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="gap-2 border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 h-11 px-4 text-sm whitespace-nowrap rounded-xl"
        >
          {uploading ? (
            <>
              <Upload className="w-4 h-4 animate-pulse" />
              {t.image_uploading || "Uploading..."}
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              {t.image_add || "Add image"}
            </>
          )}
        </Button>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-primary/20">
          <OptimizedImage
            src={preview}
            alt={t.ui_image_preview}
            className="w-full h-40 sm:h-48 object-cover"
            width={600}
            height={192}
            priority
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-7 w-7 sm:h-8 sm:w-8"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
