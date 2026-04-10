import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageCarousel } from '@/components/feed/ImageCarousel';
import type { Tables } from '@/integrations/supabase/types';

type PostWithRelations = Tables<'posts'> & {
  associations: { short_name: string } | null;
  post_images: { id: string; image_url: string; order_index: number }[];
};

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          associations (short_name),
          post_images (id, image_url, order_index)
        `)
        .eq('id', id)
        .eq('is_published', true)
        .maybeSingle();

      if (!error && data) {
        setPost(data as PostWithRelations);
      }
      setIsLoading(false);
    };

    fetchPost();
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-4 space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="text-center py-12">
          <h3 className="font-display font-semibold text-lg">Post non trouvé</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ce post n'existe pas ou a été supprimé
          </p>
        </div>
      </div>
    );
  }

  const images = post.post_images?.length > 0 
    ? post.post_images.sort((a, b) => a.order_index - b.order_index).map(img => img.image_url)
    : post.image_url ? [post.image_url] : [];

  return (
    <div className="py-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <Card className="overflow-hidden">
        {images.length > 0 && (
          <div className="relative">
            {images.length > 1 ? (
              <ImageCarousel images={images} />
            ) : (
              <img 
                src={images[0]} 
                alt={post.title}
                className="w-full h-64 object-cover"
              />
            )}
          </div>
        )}

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {post.associations?.short_name && (
              <Badge variant="accent">
                {post.associations.short_name}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>

          <h1 
            className="font-display font-bold text-xl"
            style={{ color: 'var(--brand-secondary)' }}
          >
            {post.title}
          </h1>

          <p className="text-foreground whitespace-pre-wrap">
            {post.content}
          </p>
        </div>
      </Card>
    </div>
  );
}
