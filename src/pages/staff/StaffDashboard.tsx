import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export default function StaffDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Total posts
      const { count: totalPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      // Posts last 7 days
      const { count: recentPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Upcoming events
      const { count: upcomingEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('start_datetime', now.toISOString());

      // Get upcoming event IDs for registration count
      const { data: upcomingEventIds } = await supabase
        .from('events')
        .select('id')
        .gte('start_datetime', now.toISOString());

      let totalRegistrations = 0;
      if (upcomingEventIds && upcomingEventIds.length > 0) {
        const { count } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .in('event_id', upcomingEventIds.map(e => e.id))
          .eq('status', 'confirmed');
        totalRegistrations = count || 0;
      }

      return {
        totalPosts: totalPosts || 0,
        recentPosts: recentPosts || 0,
        upcomingEvents: upcomingEvents || 0,
        totalRegistrations,
      };
    },
  });

  const statCards = [
    {
      title: 'Posts publiés',
      value: stats?.totalPosts || 0,
      subtitle: `+${stats?.recentPosts || 0} ces 7 derniers jours`,
      icon: FileText,
      gradient: 'gradient-forest',
    },
    {
      title: 'Événements à venir',
      value: stats?.upcomingEvents || 0,
      subtitle: 'Événements programmés',
      icon: Calendar,
      gradient: 'bg-accent',
    },
    {
      title: 'Inscriptions',
      value: stats?.totalRegistrations || 0,
      subtitle: 'Aux événements à venir',
      icon: Users,
      gradient: 'bg-primary',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">Vue d'ensemble</h2>
      </div>

      <div className="grid gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="overflow-hidden card-hover">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className={`${stat.gradient} p-4 flex items-center justify-center`}>
                  <stat.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <div className="flex-1 p-4">
                  <p className="text-2xl font-display font-bold">{stat.value}</p>
                  <p className="text-sm font-medium">{stat.title}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
