import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createNotification } from '@/hooks/useNotifications';

function formatLocalDatetime(dt: string) {
  const d = new Date(dt);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toUTCString(localDatetime: string) {
  return new Date(localDatetime).toISOString();
}

function generateOccurrences(startDatetime: string, endDatetime: string, recurrence: string, recurrenceEndDate: string) {
  const occurrences: Array<{ start: string; end: string }> = [];
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const duration = end.getTime() - start.getTime();
  const endRecurrence = new Date(recurrenceEndDate + 'T23:59:59');

  let current = new Date(start);

  while (current <= endRecurrence) {
    const occStart = new Date(current);
    const occEnd = new Date(current.getTime() + duration);
    occurrences.push({
      start: occStart.toISOString(),
      end: occEnd.toISOString(),
    });

    switch (recurrence) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'biweekly':
        current.setDate(current.getDate() + 14);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        return occurrences;
    }
  }

  return occurrences;
}

const eventSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  description: z.string().optional(),
  start_datetime: z.string().min(1, 'La date de début est requise'),
  end_datetime: z.string().min(1, 'La date de fin est requise'),
  location: z.string().optional(),
  category: z.string().optional(),
  max_participants: z.coerce.number().positive().optional().or(z.literal('')),
  is_registration_open: z.boolean(),
  recurrence: z.string(),
  recurrence_end_date: z.string().optional(),
  send_notification: z.boolean(),
  notif_title: z.string().max(50).optional(),
  notif_body: z.string().max(120).optional(),
}).refine(
  (data) => data.recurrence === 'none' || (data.recurrence_end_date && data.recurrence_end_date.length > 0),
  { message: 'La date de fin de récurrence est requise', path: ['recurrence_end_date'] }
).refine(
  (data) => !data.send_notification || (data.notif_title && data.notif_title.length > 0),
  { message: 'Le titre de notification est requis', path: ['notif_title'] }
).refine(
  (data) => !data.send_notification || (data.notif_body && data.notif_body.length > 0),
  { message: 'La description de notification est requise', path: ['notif_body'] }
);

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: any;
}

export function EventFormDialog({ open, onOpenChange, event }: EventFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!event;

  const { data: association } = useQuery({
    queryKey: ['bds-association'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('associations')
        .select('id')
        .eq('short_name', 'BDS')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      start_datetime: '',
      end_datetime: '',
      location: '',
      category: '',
      max_participants: '',
      is_registration_open: true,
      recurrence: 'none',
      recurrence_end_date: '',
      send_notification: false,
      notif_title: '',
      notif_body: '',
    },
  });

  const sendNotification = form.watch('send_notification');
  const recurrence = form.watch('recurrence');

  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description || '',
        start_datetime: event.start_datetime ? formatLocalDatetime(event.start_datetime) : '',
        end_datetime: event.end_datetime ? formatLocalDatetime(event.end_datetime) : '',
        location: event.location || '',
        category: event.category || '',
        max_participants: event.max_participants || '',
        is_registration_open: event.is_registration_open,
        recurrence: event.recurrence || 'none',
        recurrence_end_date: event.recurrence_end_date || '',
        send_notification: false,
        notif_title: '',
        notif_body: '',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        location: '',
        category: '',
        max_participants: '',
        is_registration_open: true,
        recurrence: 'none',
        recurrence_end_date: '',
        send_notification: false,
        notif_title: '',
        notif_body: '',
      });
    }
  }, [event, form]);

  const mutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const baseEventData = {
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        category: data.category || null,
        max_participants: data.max_participants ? Number(data.max_participants) : null,
        is_registration_open: data.is_registration_open,
        association_id: association?.id,
        recurrence: data.recurrence,
        recurrence_end_date: data.recurrence_end_date || null,
      };

      let eventId: string;

      if (isEditing) {
        const { error } = await supabase
          .from('events')
          .update({
            ...baseEventData,
            start_datetime: toUTCString(data.start_datetime),
            end_datetime: toUTCString(data.end_datetime),
          })
          .eq('id', event.id);
        if (error) throw error;
        eventId = event.id;
      } else if (data.recurrence !== 'none' && data.recurrence_end_date) {
        // Générer les occurrences
        const groupId = crypto.randomUUID();
        const occurrences = generateOccurrences(
          data.start_datetime,
          data.end_datetime,
          data.recurrence,
          data.recurrence_end_date
        );

        if (occurrences.length === 0) {
          throw new Error('Aucune occurrence générée');
        }

        if (occurrences.length > 100) {
          throw new Error('Trop d\'occurrences (max 100). Réduisez la période ou changez la fréquence.');
        }

        const eventsToInsert = occurrences.map(occ => ({
          ...baseEventData,
          start_datetime: occ.start,
          end_datetime: occ.end,
          recurrence_group_id: groupId,
        }));

        const { data: newEvents, error } = await supabase
          .from('events')
          .insert(eventsToInsert)
          .select();
        if (error) throw error;
        eventId = newEvents[0].id;

        toast({
          title: `${occurrences.length} événements créés`,
          description: `Récurrence ${data.recurrence === 'daily' ? 'quotidienne' : data.recurrence === 'weekly' ? 'hebdomadaire' : data.recurrence === 'biweekly' ? 'bimensuelle' : 'mensuelle'} jusqu'au ${data.recurrence_end_date}`,
        });
      } else {
        const { data: newEvent, error } = await supabase
          .from('events')
          .insert({
            ...baseEventData,
            start_datetime: toUTCString(data.start_datetime),
            end_datetime: toUTCString(data.end_datetime),
          })
          .select()
          .single();
        if (error) throw error;
        eventId = newEvent.id;
      }

      // Send notification if enabled
      if (data.send_notification && data.notif_title && data.notif_body && user) {
        try {
          const result = await createNotification({
            type: isEditing ? 'event_update' : 'event_published',
            title: data.notif_title,
            body: data.notif_body,
            targetType: 'event',
            targetId: eventId,
            associationId: association?.id,
            createdBy: user.id,
            sendPush: true,
          });

          const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: { notification_id: result.notification.id },
          });

          if (pushError) {
            console.error('Push notification error:', pushError);
            return { eventId, notificationSent: true, recipientCount: result.recipientCount, pushCount: 0 };
          }

          return { 
            eventId, 
            notificationSent: true, 
            recipientCount: result.recipientCount, 
            pushCount: pushResult?.successCount || 0 
          };
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
          return { eventId, notificationSent: false, recipientCount: 0, pushCount: 0 };
        }
      }

      return { eventId, notificationSent: false, recipientCount: 0, pushCount: 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      
      if (result.notificationSent) {
        const pushInfo = result.pushCount > 0 ? ` (${result.pushCount} push)` : '';
        toast({ 
          title: isEditing ? 'Événement modifié' : 'Événement créé',
          description: `Notification envoyée à ${result.recipientCount} utilisateur${result.recipientCount > 1 ? 's' : ''}${pushInfo}`,
        });
      } else if (!isEditing && recurrence === 'none') {
        toast({ title: 'Événement créé' });
      } else if (isEditing) {
        toast({ title: 'Événement modifié' });
      }
      
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? 'Modifier l\'événement' : 'Créer un événement'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input placeholder="Titre de l'événement" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description de l'événement..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_datetime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Début</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_datetime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu</FormLabel>
                  <FormControl>
                    <Input placeholder="Lieu de l'événement" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Football" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max participants</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Illimité" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_registration_open"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Inscriptions ouvertes</FormLabel>
                </FormItem>
              )}
            />

            {/* Récurrence section */}
            <div className="border-t pt-4 space-y-3">
              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Récurrence</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pas de récurrence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Pas de récurrence</SelectItem>
                        <SelectItem value="daily">Tous les jours</SelectItem>
                        <SelectItem value="weekly">Toutes les semaines</SelectItem>
                        <SelectItem value="biweekly">Toutes les 2 semaines</SelectItem>
                        <SelectItem value="monthly">Tous les mois</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {recurrence !== 'none' && (
                <FormField
                  control={form.control}
                  name="recurrence_end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Répéter jusqu'au</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Tous les événements seront créés d'un coup
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Notification section */}
            <div className="border-t pt-4 space-y-3">
              <FormField
                control={form.control}
                name="send_notification"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Envoyer une notification</FormLabel>
                      <FormDescription className="text-xs">
                        Notifier tous les utilisateurs
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {sendNotification && (
                <>
                  <FormField
                    control={form.control}
                    name="notif_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titre notification (max 50 car.)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Titre court de la notification" 
                            maxLength={50}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notif_body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description notification (max 120 car.)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Description courte..."
                            maxLength={120}
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
