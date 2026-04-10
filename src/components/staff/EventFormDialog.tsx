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

const eventSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  description: z.string().optional(),
  start_datetime: z.string().min(1, 'La date de début est requise'),
  end_datetime: z.string().min(1, 'La date de fin est requise'),
  location: z.string().optional(),
  category: z.string().optional(),
  max_participants: z.coerce.number().positive().optional().or(z.literal('')),
  is_registration_open: z.boolean(),
  send_notification: z.boolean(),
  notif_title: z.string().max(50).optional(),
  notif_body: z.string().max(120).optional(),
}).refine(
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
      send_notification: false,
      notif_title: '',
      notif_body: '',
    },
  });

  const sendNotification = form.watch('send_notification');

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
        send_notification: false,
        notif_title: '',
        notif_body: '',
      });
    }
  }, [event, form]);

  const mutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const eventData = {
        title: data.title,
        description: data.description || null,
        start_datetime: toUTCString(data.start_datetime),
        end_datetime: toUTCString(data.end_datetime),
        location: data.location || null,
        category: data.category || null,
        max_participants: data.max_participants ? Number(data.max_participants) : null,
        is_registration_open: data.is_registration_open,
        association_id: association?.id,
      };

      let eventId: string;

      if (isEditing) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);
        if (error) throw error;
        eventId = event.id;
      } else {
        const { data: newEvent, error } = await supabase
          .from('events')
          .insert(eventData)
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

          // Call edge function to send push notifications
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
      } else {
        toast({ title: isEditing ? 'Événement modifié' : 'Événement créé' });
      }
      
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
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
