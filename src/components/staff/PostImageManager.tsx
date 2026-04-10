import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, ArrowUp, ArrowDown, X } from 'lucide-react';

interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  order_index: number;
}

interface PostImageManagerProps {
  postId?: string;
  images: PostImage[];
  onImagesChange: (images: PostImage[]) => void;
  tempImages: { url: string; order_index: number }[];
  onTempImagesChange: (images: { url: string; order_index: number }[]) => void;
}

export function PostImageManager({ 
  postId, 
  images, 
  onImagesChange, 
  tempImages, 
  onTempImagesChange 
}: PostImageManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);
      
      if (postId) {
        // If editing existing post, save to database
        const newOrderIndex = images.length + tempImages.length;
        const { data, error } = await supabase
          .from('post_images')
          .insert({ post_id: postId, image_url: publicUrl, order_index: newOrderIndex })
          .select()
          .single();
        
        if (error) throw error;
        onImagesChange([...images, data as PostImage]);
        queryClient.invalidateQueries({ queryKey: ['post-images', postId] });
      } else {
        // If creating new post, add to temp images
        onTempImagesChange([...tempImages, { url: publicUrl, order_index: tempImages.length }]);
      }
      
      toast({ title: 'Image uploadée' });
    } catch {
      toast({ title: 'Erreur upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (image: PostImage) => {
    try {
      const { error } = await supabase
        .from('post_images')
        .delete()
        .eq('id', image.id);
      
      if (error) throw error;
      
      onImagesChange(images.filter(img => img.id !== image.id));
      queryClient.invalidateQueries({ queryKey: ['post-images', postId] });
      toast({ title: 'Image supprimée' });
    } catch {
      toast({ title: 'Erreur suppression', variant: 'destructive' });
    }
  };

  const deleteTempImage = (index: number) => {
    onTempImagesChange(tempImages.filter((_, i) => i !== index));
  };

  const moveImage = async (image: PostImage, direction: 'up' | 'down') => {
    const currentIndex = images.findIndex(img => img.id === image.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= images.length) return;

    const newImages = [...images];
    const swapImage = newImages[newIndex];
    
    // Swap order_index values
    try {
      await supabase
        .from('post_images')
        .update({ order_index: swapImage.order_index })
        .eq('id', image.id);
      
      await supabase
        .from('post_images')
        .update({ order_index: image.order_index })
        .eq('id', swapImage.id);
      
      // Swap in local array
      [newImages[currentIndex], newImages[newIndex]] = [newImages[newIndex], newImages[currentIndex]];
      onImagesChange(newImages);
      queryClient.invalidateQueries({ queryKey: ['post-images', postId] });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const moveTempImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tempImages.length) return;
    
    const newTempImages = [...tempImages];
    [newTempImages[index], newTempImages[newIndex]] = [newTempImages[newIndex], newTempImages[index]];
    onTempImagesChange(newTempImages.map((img, i) => ({ ...img, order_index: i })));
  };

  const allImages = [
    ...images.map(img => ({ type: 'saved' as const, data: img })),
    ...tempImages.map((img, index) => ({ type: 'temp' as const, data: img, tempIndex: index })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Images du post</span>
        <label className="cursor-pointer">
          <Button type="button" size="sm" variant="outline" disabled={uploading} asChild>
            <span>
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? 'Upload...' : 'Ajouter'}
            </span>
          </Button>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileUpload} 
            disabled={uploading} 
          />
        </label>
      </div>

      {allImages.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          Aucune image. Cliquez sur "Ajouter" pour en uploader.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {allImages.map((item, index) => (
            <div key={item.type === 'saved' ? item.data.id : `temp-${item.tempIndex}`} className="relative group">
              <img
                src={item.type === 'saved' ? item.data.image_url : item.data.url}
                alt={`Image ${index + 1}`}
                className="w-full aspect-square object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                {index > 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={() => item.type === 'saved' ? moveImage(item.data, 'up') : moveTempImage(item.tempIndex!, 'up')}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                )}
                {index < allImages.length - 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={() => item.type === 'saved' ? moveImage(item.data, 'down') : moveTempImage(item.tempIndex!, 'down')}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white hover:bg-destructive/80"
                  onClick={() => item.type === 'saved' ? deleteImage(item.data) : deleteTempImage(item.tempIndex!)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
