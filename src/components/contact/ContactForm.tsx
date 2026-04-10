import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const contactSchema = z.object({
  sender_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  sender_email: z.string().email('Adresse email invalide').max(255),
  subject: z.string().min(3, 'L\'objet doit contenir au moins 3 caractères').max(200),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères').max(2000),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  associationId: string;
}

export function ContactForm({ associationId }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      sender_name: '',
      sender_email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          association_id: associationId,
          sender_name: data.sender_name,
          sender_email: data.sender_email,
          subject: data.subject,
          message: data.message,
        });

      if (error) throw error;

      toast({
        title: 'Message envoyé !',
        description: 'Nous vous répondrons dès que possible.',
      });

      form.reset();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full gradient-forest flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-display text-lg">Contactez-nous</CardTitle>
            <CardDescription>Une question ? N'hésitez pas !</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sender_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Votre nom" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sender_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="votre@email.fr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objet</FormLabel>
                  <FormControl>
                    <Input placeholder="Sujet de votre message" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Votre message..." 
                      className="min-h-[120px] resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full gradient-forest text-primary-foreground"
              disabled={isSubmitting}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
            </Button>
          </form>
        </Form>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>bds@asso.etu-campus.fr</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Loic, Dorian, Baptiste, Joseph — L'équipe BDS
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
