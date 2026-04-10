import { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, getWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/integrations/supabase/types';

interface WeeklyCalendarProps {
  events: Tables<'events'>[];
  onEventClick?: (event: Tables<'events'>) => void;
}

export function WeeklyCalendar({ events, onEventClick }: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_datetime);
      return isSameDay(eventDate, day);
    });
  };

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToPreviousWeek}
          style={{ color: 'var(--brand-secondary)' }}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center">
          <h2 
            className="font-display font-semibold text-lg"
            style={{ color: 'var(--brand-primary)' }}
          >
            Semaine {weekNumber}
          </h2>
          <p className="text-sm" style={{ color: 'var(--brand-secondary)' }}>
            {format(weekStart, 'd MMM', { locale: fr })} - {format(weekEnd, 'd MMM yyyy', { locale: fr })}
          </p>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToNextWeek}
          style={{ color: 'var(--brand-secondary)' }}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Button 
        variant="brand-primary" 
        size="sm" 
        onClick={goToToday} 
        className="w-full"
      >
        Aujourd'hui
      </Button>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {daysOfWeek.map((day) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className="text-xs font-medium py-2 rounded"
              style={{
                backgroundColor: isToday ? 'var(--brand-accent)' : 'transparent',
                color: isToday ? 'var(--brand-accent-fg)' : 'var(--brand-secondary)'
              }}
            >
              <div>{format(day, 'EEE', { locale: fr })}</div>
              <div className="font-semibold">{format(day, 'd')}</div>
            </div>
          );
        })}
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {daysOfWeek.map((day) => {
          const dayEvents = getEventsForDay(day);
          if (dayEvents.length === 0) return null;

          return (
            <div key={day.toISOString()} className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">
                {format(day, 'EEEE d MMMM', { locale: fr })}
              </h3>
              {dayEvents.map((event) => (
                <Card 
                  key={event.id} 
                  className="card-hover cursor-pointer"
                  onClick={() => onEventClick?.(event)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{event.title}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(event.start_datetime), 'HH:mm', { locale: fr })}
                            {' - '}
                            {format(new Date(event.end_datetime), 'HH:mm', { locale: fr })}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                      {event.category && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {event.category}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}

        {daysOfWeek.every((day) => getEventsForDay(day).length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucun événement cette semaine</p>
          </div>
        )}
      </div>
    </div>
  );
}
