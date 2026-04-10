import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventRegistrationCard } from '@/components/registrations/EventRegistrationCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type EventWithRegistrations = Tables<'events'> & {
  registrationCount: number;
  isRegistered: boolean;
};

export default function InscriptionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventWithRegistrations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);

  const fetchEvents = async () => {
    // Fetch events that are open for registration
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('is_registration_open', true)
      .gte('start_datetime', new Date().toISOString())
      .order('start_datetime', { ascending: true });

    if (eventsError) {
      setIsLoading(false);
      return;
    }

    // Fetch registration counts
    const { data: registrationsData } = await supabase
      .from('registrations')
      .select('event_id, user_id')
      .eq('status', 'confirmed');

    // Combine data
    const eventsWithRegistrations = eventsData.map((event) => {
      const eventRegistrations = registrationsData?.filter(r => r.event_id === event.id) || [];
      return {
        ...event,
        registrationCount: eventRegistrations.length,
        isRegistered: user ? eventRegistrations.some(r => r.user_id === user.id) : false,
      };
    });

    setEvents(eventsWithRegistrations);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const handleRegister = async (eventId: string) => {
    if (!user) return;
    
    setLoadingEventId(eventId);
    try {
      const { error } = await supabase
        .from('registrations')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'confirmed',
        });

      if (error) throw error;

      toast({
        title: 'Inscription confirmée !',
        description: 'Vous êtes inscrit à cet événement.',
      });

      await fetchEvents();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de s\'inscrire. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setLoadingEventId(null);
    }
  };

  const handleUnregister = async (eventId: string) => {
    if (!user) return;
    
    setLoadingEventId(eventId);
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Désinscription effectuée',
        description: 'Vous n\'êtes plus inscrit à cet événement.',
      });

      await fetchEvents();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de se désinscrire. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setLoadingEventId(null);
    }
  };

  return (
    <div className="py-4">
      <div className="mb-6">
        <h1 
          className="font-display font-bold text-2xl"
          style={{ color: 'var(--brand-secondary)' }}
        >
          Inscriptions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inscrivez-vous aux événements à venir
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="font-display font-semibold text-lg">Aucun événement</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Pas d'événements ouverts aux inscriptions pour le moment
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => (
            <div 
              key={event.id} 
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <EventRegistrationCard
                event={event}
                isRegistered={event.isRegistered}
                registrationCount={event.registrationCount}
                onRegister={() => handleRegister(event.id)}
                onUnregister={() => handleUnregister(event.id)}
                isLoading={loadingEventId === event.id}
                isAuthenticated={!!user}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
