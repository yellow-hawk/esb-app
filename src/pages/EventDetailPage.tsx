import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';

type EventWithRegistrations = Tables<'events'> & {
  associations: { short_name: string } | null;
  registrationCount: number;
  isRegistered: boolean;
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<EventWithRegistrations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvent = async () => {
    if (!id) return;

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        associations (short_name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (eventError || !eventData) {
      setIsLoading(false);
      return;
    }

    // Get registration count
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'confirmed');

    // Check if user is registered
    let isRegistered = false;
    if (user) {
      const { data: registration } = await supabase
        .from('registrations')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      isRegistered = !!registration;
    }

    setEvent({
      ...eventData,
      registrationCount: count || 0,
      isRegistered,
    } as EventWithRegistrations);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvent();
  }, [id, user]);

  const handleRegister = async () => {
    if (!user || !event) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour vous inscrire',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from('registrations')
      .insert({
        event_id: event.id,
        user_id: user.id,
        status: 'confirmed',
      });

    if (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de s'inscrire",
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Inscription confirmée !' });
      fetchEvent();
    }
    setIsSubmitting(false);
  };

  const handleUnregister = async () => {
    if (!user || !event) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('event_id', event.id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de se désinscrire',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Désinscription confirmée' });
      fetchEvent();
    }
    setIsSubmitting(false);
  };

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

  if (!event) {
    return (
      <div className="py-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="text-center py-12">
          <h3 className="font-display font-semibold text-lg">Événement non trouvé</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cet événement n'existe pas ou a été supprimé
          </p>
        </div>
      </div>
    );
  }

  const isFull = event.max_participants && event.registrationCount >= event.max_participants;
  const isPast = new Date(event.end_datetime) < new Date();

  return (
    <div className="py-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <Card className="overflow-hidden">
        <div 
          className="h-32 flex items-center justify-center"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <Calendar className="h-16 w-16 text-white opacity-50" />
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {event.associations?.short_name && (
              <Badge variant="accent">
                {event.associations.short_name}
              </Badge>
            )}
            {event.category && (
              <Badge variant="secondary">
                {event.category}
              </Badge>
            )}
            {event.is_registration_open && !isPast && (
              <Badge variant="accent">Inscriptions ouvertes</Badge>
            )}
            {isPast && (
              <Badge variant="secondary">Terminé</Badge>
            )}
          </div>

          <h1 
            className="font-display font-bold text-xl"
            style={{ color: 'var(--brand-secondary)' }}
          >
            {event.title}
          </h1>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" style={{ color: 'var(--brand-accent)' }} />
              <span>
                {format(new Date(event.start_datetime), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" style={{ color: 'var(--brand-accent)' }} />
                <span>{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" style={{ color: 'var(--brand-accent)' }} />
              <span>
                {event.registrationCount} inscrit{event.registrationCount !== 1 ? 's' : ''}
                {event.max_participants && ` / ${event.max_participants}`}
              </span>
            </div>
          </div>

          {event.description && (
            <p className="text-foreground whitespace-pre-wrap pt-4 border-t">
              {event.description}
            </p>
          )}

          {/* Registration CTA */}
          {!isPast && event.is_registration_open && (
            <div className="pt-4 border-t">
              {event.isRegistered ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleUnregister}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Traitement...' : 'Se désinscrire'}
                </Button>
              ) : isFull ? (
                <Button variant="secondary" className="w-full" disabled>
                  Complet
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleRegister}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Traitement...' : "S'inscrire"}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
