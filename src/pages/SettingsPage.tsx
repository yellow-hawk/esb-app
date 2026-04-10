import { useState } from 'react';
import { Bell, BellOff, Loader2, Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/hooks/useNotifications';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();
  const { toast } = useToast();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const sendTestNotification = async () => {
    if (!user) return;
    
    setIsSendingTest(true);
    try {
      // Create a test notification targeting only the current user
      const result = await createNotification({
        type: 'post_published',
        title: '🔔 Test de notification',
        body: 'Si vous voyez cette notification, les push fonctionnent !',
        targetType: 'post',
        targetId: '00000000-0000-0000-0000-000000000000', // Dummy ID for test
        createdBy: user.id,
        sendPush: true,
        targetUserIds: [user.id], // Only send to current user
      });

      // Call the edge function to send the push
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { notification_id: result.notification.id },
      });

      if (error) {
        console.error('Push send error:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'envoyer la notification push',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Notification envoyée',
          description: `Push envoyée à ${data?.successCount || 0} appareil(s)`,
        });
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--brand-primary)' }}>
        Paramètres
      </h1>

      {/* VAPID key warning */}
      {!VAPID_PUBLIC_KEY && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Configuration requise</p>
                <p className="text-muted-foreground mt-1">
                  La clé VAPID publique n'est pas configurée. Les notifications push ne fonctionneront pas.
                  Contactez l'administrateur.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications push
          </CardTitle>
          <CardDescription>
            Recevez des notifications sur votre appareil quand de nouveaux contenus sont publiés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported ? (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p>Les notifications push ne sont pas supportées sur ce navigateur.</p>
              <p className="mt-1 text-xs">
                Essayez avec Chrome, Firefox, Edge ou Safari sur iOS 16.4+.
              </p>
            </div>
          ) : (
            <>
              {permission === 'denied' && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <p>Vous avez bloqué les notifications.</p>
                  <p className="mt-1 text-xs">
                    Pour les réactiver, modifiez les paramètres de notification de votre navigateur pour ce site.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {isSubscribed ? 'Notifications activées' : 'Notifications désactivées'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isSubscribed
                      ? 'Vous recevez les notifications push.'
                      : 'Activez pour recevoir les notifications.'}
                  </p>
                </div>

                {isSubscribed ? (
                  <Button
                    variant="outline"
                    onClick={unsubscribe}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <BellOff className="h-4 w-4 mr-2" />
                        Désactiver
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={subscribe}
                    disabled={isLoading || permission === 'denied' || !VAPID_PUBLIC_KEY}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Bell className="h-4 w-4 mr-2" />
                        Activer
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Test notification button */}
              {isSubscribed && (
                <div className="border-t pt-4 mt-4">
                  <Button
                    variant="outline"
                    onClick={sendTestNotification}
                    disabled={isSendingTest}
                    className="w-full"
                  >
                    {isSendingTest ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Envoyer une notification de test
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Teste l'envoi de push sur cet appareil
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>À propos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sporty Wood Picker - Application du BDS
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Connecté en tant que : {user.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
