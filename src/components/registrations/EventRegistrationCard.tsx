import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Clock, Users, Check, Plus } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/integrations/supabase/types';

interface EventRegistrationCardProps {
  event: Tables<'events'>;
  isRegistered: boolean;
  registrationCount: number;
  onRegister: () => void;
  onUnregister: () => void;
  isLoading?: boolean;
  isAuthenticated: boolean;
}

export function EventRegistrationCard({
  event,
  isRegistered,
  registrationCount,
  onRegister,
  onUnregister,
  isLoading,
  isAuthenticated,
}: EventRegistrationCardProps) {
  const spotsLeft = event.max_participants ? event.max_participants - registrationCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  return (
    <Card 
      className="card-hover animate-slide-up border-l-4"
      style={{ borderLeftColor: 'var(--brand-accent)' }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {event.category && (
                <Badge variant="secondary" className="text-xs">
                  {event.category}
                </Badge>
              )}
              {isRegistered && (
                <Badge className="bg-success text-success-foreground text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Inscrit
                </Badge>
              )}
            </div>
            
            <h3 
              className="font-display font-semibold text-base"
              style={{ color: 'var(--brand-secondary)' }}
            >
              {event.title}
            </h3>
            
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" style={{ color: 'var(--brand-accent)' }} />
                <span>
                  {format(new Date(event.start_datetime), 'EEE d MMM • HH:mm', { locale: fr })}
                </span>
              </div>
              
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" style={{ color: 'var(--brand-accent)' }} />
                  <span>{event.location}</span>
                </div>
              )}

              {event.max_participants && (
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" style={{ color: 'var(--brand-accent)' }} />
                  <span>{registrationCount}/{event.max_participants} inscrits</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {!isAuthenticated ? (
          <Button variant="brand-secondary" className="w-full">
            Connectez-vous pour vous inscrire
          </Button>
        ) : isRegistered ? (
          <Button 
            variant="brand-secondary" 
            className="w-full" 
            onClick={onUnregister}
            disabled={isLoading}
          >
            Se désinscrire
          </Button>
        ) : isFull ? (
          <Button variant="outline" className="w-full" disabled>
            Complet
          </Button>
        ) : (
          <Button 
            variant="brand-primary"
            className="w-full"
            onClick={onRegister}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            S'inscrire
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
