import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Users, ChevronRight, Copy, Check, Download } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function StaffRegistrations() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery({
    queryKey: ['staff-events-registrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_datetime', new Date().toISOString())
        .order('start_datetime', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: registrations } = useQuery({
    queryKey: ['staff-registrations', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent) return [];
      
      const { data, error } = await supabase
        .from('registrations')
        .select('*, profiles(name, email)')
        .eq('event_id', selectedEvent.id)
        .eq('status', 'confirmed');
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEvent,
  });

  const { data: eventCounts } = useQuery({
    queryKey: ['staff-event-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('event_id')
        .eq('status', 'confirmed');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((reg) => {
        counts[reg.event_id] = (counts[reg.event_id] || 0) + 1;
      });
      return counts;
    },
  });

  const handleCopyList = () => {
    if (!registrations || registrations.length === 0) return;
    
    const text = registrations
      .map((r: any) => `${r.profiles?.name || 'N/A'} - ${r.profiles?.email || 'N/A'}`)
      .join('\n');
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Liste copiée !' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCSV = () => {
    if (!registrations || registrations.length === 0 || !selectedEvent) return;

    const headers = ['Nom', 'Email', 'Statut', 'Date inscription'];
    const rows = registrations.map((r: any) => [
      r.profiles?.name || 'N/A',
      r.profiles?.email || 'N/A',
      r.status,
      format(new Date(r.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Ajout BOM pour que Excel reconnaisse les accents
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const eventDate = format(new Date(selectedEvent.start_datetime), 'yyyy-MM-dd', { locale: fr });
    link.href = url;
    link.download = `inscrits_${selectedEvent.title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/g, '').replace(/\s+/g, '_')}_${eventDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'CSV téléchargé !' });
  };

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
      <h2 className="font-display font-semibold text-lg mb-4">Inscriptions aux événements</h2>

      {events?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun événement à venir
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events?.map((event) => (
            <Card
              key={event.id}
              className="overflow-hidden cursor-pointer card-hover"
              onClick={() => setSelectedEvent(event)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{event.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(event.start_datetime), 'dd MMM', { locale: fr })}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {eventCounts?.[event.id] || 0}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedEvent?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {registrations?.length || 0} inscrit(s)
              </p>
              {registrations && registrations.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyList}>
                    {copied ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copier
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              )}
            </div>

            {registrations?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucune inscription pour cet événement
              </p>
            ) : (
              <div className="space-y-2">
                {registrations?.map((reg: any) => (
                  <Card key={reg.id}>
                    <CardContent className="p-3">
                      <p className="font-medium">{reg.profiles?.name || 'Utilisateur'}</p>
                      <p className="text-sm text-muted-foreground">
                        {reg.profiles?.email || 'Email non disponible'}
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {reg.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
