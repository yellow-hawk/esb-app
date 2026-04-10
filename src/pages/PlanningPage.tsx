import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyCalendar } from '@/components/planning/WeeklyCalendar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

export default function PlanningPage() {
  const [events, setEvents] = useState<Tables<'events'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Tables<'events'> | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_datetime', { ascending: true });

      if (!error && data) {
        setEvents(data);
      }
      setIsLoading(false);
    };

    fetchEvents();
  }, []);

  return (
    <div className="py-4">
      <div className="mb-6">
        <h1 
          className="font-display font-bold text-2xl"
          style={{ color: 'var(--brand-secondary)' }}
        >
          Planning
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Les événements sportifs de la semaine
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-8" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-7 gap-1">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      ) : (
        <WeeklyCalendar 
          events={events} 
          onEventClick={setSelectedEvent}
        />
      )}

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {selectedEvent.category && (
                    <Badge variant="secondary">{selectedEvent.category}</Badge>
                  )}
                  {selectedEvent.is_registration_open && (
                    <Badge className="bg-success text-success-foreground">
                      Inscriptions ouvertes
                    </Badge>
                  )}
                </div>
                <DialogTitle className="font-display text-xl">
                  {selectedEvent.title}
                </DialogTitle>
                {selectedEvent.description && (
                  <DialogDescription className="mt-2">
                    {selectedEvent.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(selectedEvent.start_datetime), 'EEEE d MMMM yyyy', { locale: fr })}
                    </p>
                    <p className="text-muted-foreground">
                      {format(new Date(selectedEvent.start_datetime), 'HH:mm', { locale: fr })}
                      {' - '}
                      {format(new Date(selectedEvent.end_datetime), 'HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.max_participants && (
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Maximum {selectedEvent.max_participants} participants</span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
