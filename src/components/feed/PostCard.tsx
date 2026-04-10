import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageCarousel } from './ImageCarousel';
import type { Tables } from '@/integrations/supabase/types';

interface PostCardProps {
  post: Tables<'posts'> & {
    profiles?: { name: string } | null;
    associations?: { short_name: string } | null;
    post_images?: { id: string; image_url: string; order_index: number }[];
  };
}

export function PostCard({ post }: PostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: fr,
  });

  // Build images array: use post_images if available, fallback to image_url
  const images: string[] = [];
  if (post.post_images && post.post_images.length > 0) {
    images.push(...post.post_images
      .sort((a, b) => a.order_index - b.order_index)
      .map(img => img.image_url));
  } else if (post.image_url) {
    images.push(post.image_url);
  }

  return (
    <Card 
      className="card-hover overflow-hidden animate-slide-up border-l-4"
      style={{ borderLeftColor: 'var(--brand-accent)' }}
    >
      {images.length > 0 && (
        <ImageCarousel images={images} alt={post.title} />
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="brand-accent" className="text-xs">
            {post.associations?.short_name || 'BDS'}
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <h3 
          className="font-display font-semibold text-lg leading-tight mt-2"
          style={{ color: 'var(--brand-secondary)' }}
        >
          {post.title}
        </h3>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {post.content}
        </p>
        {post.profiles?.name && (
          <p className="text-xs text-muted-foreground mt-3">
            Par {post.profiles.name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
