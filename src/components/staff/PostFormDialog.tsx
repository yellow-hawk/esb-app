import { useEffect, useState } from 'react';
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
import { PostImageManager } from './PostImageManager';
import { createNotification } from '@/hooks/useNotifications';

const postSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  content: z.string().min(1, 'Le contenu est requis'),
  is_published: z.boolean(),
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

type PostFormData = z.infer<typeof postSchema>;

interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  order_index: number;
}

interface PostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: any;
}

export function PostFormDialog({ open, onOpenChange, post }: PostFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!post;
  const [postImages, setPostImages] = useState<PostImage[]>([]);
  const [tempImages, setTempImages] = useState<{ url: string; order_index: number }[]>([]);

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

  // Fetch existing post images when editing
  const { data: existingImages } = useQuery({
    queryKey: ['post-images', post?.id],
    queryFn: async () => {
      if (!post?.id) return [];
      const { data, error } = await supabase
        .from('post_images')
        .select('*')
        .eq('post_id', post.id)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data as PostImage[];
    },
    enabled: !!post?.id,
  });

  useEffect(() => {
    if (existingImages) {
      setPostImages(existingImages);
    }
  }, [existingImages]);

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      is_published: true,
      send_notification: false,
      notif_title: '',
      notif_body: '',
    },
  });

  const sendNotification = form.watch('send_notification');

  useEffect(() => {
    if (post) {
      form.reset({
        title: post.title,
        content: post.content,
        is_published: post.is_published,
        send_notification: false,
        notif_title: '',
        notif_body: '',
      });
    } else {
      form.reset({
        title: '',
        content: '',
        is_published: true,
        send_notification: false,
        notif_title: '',
        notif_body: '',
      });
      setPostImages([]);
      setTempImages([]);
    }
  }, [post, form, open]);

  const mutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      const wasPublished = post?.is_published;
      const postData = {
        title: data.title,
        content: data.content,
        image_url: tempImages[0]?.url || postImages[0]?.image_url || null,
        is_published: data.is_published,
        association_id: association?.id,
        author_id: user?.id,
      };

      let postId: string;

      if (isEditing) {
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', post.id);
        if (error) throw error;
        postId = post.id;
      } else {
        const { data: newPost, error } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();
        if (error) throw error;
        
        // Save temp images to database
        if (tempImages.length > 0 && newPost) {
          const imagesToInsert = tempImages.map((img, index) => ({
            post_id: newPost.id,
            image_url: img.url,
            order_index: index,
          }));
          
          const { error: imagesError } = await supabase
            .from('post_images')
            .insert(imagesToInsert);
          
          if (imagesError) throw imagesError;
        }
        
        postId = newPost.id;
      }

      // Send notification if enabled and post is being published
      const shouldNotify = data.send_notification && data.is_published && (!isEditing || !wasPublished);
      
      if (shouldNotify && data.notif_title && data.notif_body && user) {
        try {
          const result = await createNotification({
            type: 'post_published',
            title: data.notif_title,
            body: data.notif_body,
            targetType: 'post',
            targetId: postId,
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
            return { postId, notificationSent: true, recipientCount: result.recipientCount, pushCount: 0 };
          }

          return { 
            postId, 
            notificationSent: true, 
            recipientCount: result.recipientCount, 
            pushCount: pushResult?.successCount || 0 
          };
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
          return { postId, notificationSent: false, recipientCount: 0, pushCount: 0 };
        }
      }

      return { postId, notificationSent: false, recipientCount: 0, pushCount: 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post-images'] });
      
      if (result.notificationSent) {
        const pushInfo = result.pushCount > 0 ? ` (${result.pushCount} push)` : '';
        toast({ 
          title: isEditing ? 'Post modifié' : 'Post créé',
          description: `Notification envoyée à ${result.recipientCount} utilisateur${result.recipientCount > 1 ? 's' : ''}${pushInfo}`,
        });
      } else {
        toast({ title: isEditing ? 'Post modifié' : 'Post créé' });
      }
      
      onOpenChange(false);
      form.reset();
      setTempImages([]);
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
            {isEditing ? 'Modifier le post' : 'Créer un post'}
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
                    <Input placeholder="Titre du post" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenu</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Contenu du post..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <PostImageManager
              postId={post?.id}
              images={postImages}
              onImagesChange={setPostImages}
              tempImages={tempImages}
              onTempImagesChange={setTempImages}
            />

            <FormField
              control={form.control}
              name="is_published"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Publier immédiatement</FormLabel>
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
