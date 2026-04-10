import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';

interface EventCardProps {
  event: Tables<'events'> & {
    associations?: { short_name: string } | null;
  };
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/events/${event.id}`);
  };

  return (
    <Card 
      className="overflow-hidden cursor-pointer transition-all hover:shadow-md border-l-4"
      style={{ borderLeftColor: 'var(--brand-accent)' }}
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Date block */}
          <div 
            className="flex-shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <span className="text-xs font-medium uppercase">
              {format(new Date(event.start_datetime), 'MMM', { locale: fr })}
            </span>
            <span className="text-xl font-bold">
              {format(new Date(event.start_datetime), 'd')}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {event.associations?.short_name && (
                <Badge variant="brand-accent" className="text-xs">
                  {event.associations.short_name}
                </Badge>
              )}
              {event.is_registration_open && (
                <Badge variant="secondary" className="text-xs">
                  Inscriptions
                </Badge>
              )}
            </div>

            <h3 
              className="font-display font-semibold text-base line-clamp-2 mb-2"
              style={{ color: 'var(--brand-secondary)' }}
            >
              {event.title}
            </h3>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {format(new Date(event.start_datetime), 'HH:mm', { locale: fr })}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="line-clamp-1">{event.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight 
            className="flex-shrink-0 h-5 w-5 text-muted-foreground" 
          />
        </div>

        {/* CTA */}
        <div className="mt-3 pt-3 border-t">
          <Button 
            variant="brand-accent" 
            size="sm" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/events/${event.id}`);
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Voir / S'inscrire
          </Button>
        </div>
      </div>
    </Card>
  );
}
