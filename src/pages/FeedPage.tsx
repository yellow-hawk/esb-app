import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/feed/PostCard';
import { EventCard } from '@/components/feed/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';

type PostWithRelations = Tables<'posts'> & {
  profiles: { name: string } | null;
  associations: { short_name: string } | null;
  post_images: { id: string; image_url: string; order_index: number }[];
};

type EventWithAssociation = Tables<'events'> & {
  associations: { short_name: string } | null;
};

type FeedItem = 
  | { type: 'post'; data: PostWithRelations; date: string }
  | { type: 'event'; data: EventWithAssociation; date: string };

export default function FeedPage() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      // Fetch posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          associations (short_name),
          post_images (id, image_url, order_index)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // Fetch upcoming published events (with open registration or recent)
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          associations (short_name)
        `)
        .gte('start_datetime', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Events from last 7 days
        .order('created_at', { ascending: false });

      const items: FeedItem[] = [];

      if (!postsError && posts) {
        posts.forEach(post => {
          items.push({
            type: 'post',
            data: { ...post, profiles: null } as PostWithRelations,
            date: post.created_at,
          });
        });
      }

      if (!eventsError && events) {
        events.forEach(event => {
          items.push({
            type: 'event',
            data: event as EventWithAssociation,
            date: event.created_at,
          });
        });
      }

      // Sort by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setFeedItems(items);
      setIsLoading(false);
    };

    fetchFeed();
  }, []);

  return (
    <div className="space-y-4 py-4">
      <div className="mb-6">
        <h1 
          className="font-display font-bold text-2xl"
          style={{ color: 'var(--brand-secondary)' }}
        >
          Fil d'actualité
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Les dernières news et événements du BDS
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : feedItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl">📰</span>
          </div>
          <h3 className="font-display font-semibold text-lg">Aucune actualité</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Les premières news arrivent bientôt !
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedItems.map((item, index) => (
            <div 
              key={`${item.type}-${item.type === 'post' ? item.data.id : item.data.id}`} 
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {item.type === 'post' ? (
                <PostCard post={item.data} />
              ) : (
                <EventCard event={item.data} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
