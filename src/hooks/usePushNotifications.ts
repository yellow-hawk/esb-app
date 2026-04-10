import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// This key should match VAPID_PUBLIC_KEY in secrets
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check if push is supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!user || !isSupported) {
      setIsLoading(false);
      return;
    }

    try {
      // Check database for existing subscription
      const { data: existingSub } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      setIsSubscribed(!!existingSub && existingSub.length > 0);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Register service worker for push
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      // Register custom push service worker
      const registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/',
      });
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      console.log('Push SW registered:', registration);
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
      return null;
    }
  };

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!user || !isSupported) {
      toast({
        title: 'Non supporté',
        description: 'Les notifications push ne sont pas supportées sur ce navigateur.',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast({
          title: 'Permission refusée',
          description: 'Vous avez refusé les notifications. Activez-les dans les paramètres du navigateur.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error('Service worker registration failed');
      }

      // Check for VAPID key
      if (!VAPID_PUBLIC_KEY) {
        console.warn('VAPID_PUBLIC_KEY not set - using demo subscription');
        // Save a demo subscription to database
        const { error } = await supabase.from('push_subscriptions').upsert(
          {
            user_id: user.id,
            endpoint: `demo-endpoint-${user.id}-${Date.now()}`,
            p256dh: 'demo-p256dh',
            auth: 'demo-auth',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

        if (error) throw error;

        setIsSubscribed(true);
        toast({
          title: 'Notifications activées',
          description: 'Vous recevrez les notifications in-app.',
        });
        return true;
      }

      // Subscribe to push with VAPID key
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      console.log('Push subscription:', subscription);

      // Extract keys
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Failed to get subscription keys');
      }

      // Convert to base64
      const p256dhBase64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(p256dh))));
      const authBase64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(auth))));

      // Save to database
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: p256dhBase64,
          auth: authBase64,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

      if (error) {
        throw error;
      }

      setIsSubscribed(true);
      toast({
        title: 'Notifications activées',
        description: 'Vous recevrez les notifications push.',
      });

      return true;
    } catch (error: unknown) {
      console.error('Push subscription error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'activer les notifications push.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!user) return false;

    setIsLoading(true);

    try {
      // Get current subscription
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Remove from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setIsSubscribed(false);
      toast({
        title: 'Notifications désactivées',
        description: 'Vous ne recevrez plus les notifications push.',
      });

      return true;
    } catch (error: unknown) {
      console.error('Push unsubscribe error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de désactiver les notifications push.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
}

// Helper function to trigger push notification sending
export async function sendPushNotification(notificationId: string): Promise<{ success: boolean; sent: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { notification_id: notificationId },
    });

    if (error) {
      console.error('Failed to send push notification:', error);
      return { success: false, sent: 0 };
    }

    return { success: true, sent: data?.sent || 0 };
  } catch (error) {
    console.error('Error calling send-push-notification:', error);
    return { success: false, sent: 0 };
  }
}
