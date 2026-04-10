import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Notification = Tables<'notifications'>;

interface NotificationWithRecipient extends Notification {
  notification_recipients: {
    id: string;
    read_at: string | null;
  }[];
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithRecipient[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        notification_recipients!inner (id, read_at)
      `)
      .eq('notification_recipients.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as NotificationWithRecipient[]);
      const unread = data.filter(n => 
        n.notification_recipients.some(r => r.read_at === null)
      ).length;
      setUnreadCount(unread);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('notification_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('notification_id', notificationId)
      .eq('user_id', user.id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, notification_recipients: n.notification_recipients.map(r => ({ ...r, read_at: new Date().toISOString() })) }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unreadIds = notifications
      .filter(n => n.notification_recipients.some(r => r.read_at === null))
      .map(n => n.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notification_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => ({
          ...n,
          notification_recipients: n.notification_recipients.map(r => ({ ...r, read_at: new Date().toISOString() }))
        }))
      );
      setUnreadCount(0);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}

// Function to create notification and recipients
export async function createNotification({
  type,
  title,
  body,
  targetType,
  targetId,
  associationId,
  createdBy,
  sendPush = false,
  targetUserIds,
}: {
  type: 'post_published' | 'event_published' | 'event_update' | 'event_reminder';
  title: string;
  body: string;
  targetType: 'post' | 'event';
  targetId: string;
  associationId?: string;
  createdBy: string;
  sendPush?: boolean;
  targetUserIds?: string[]; // If not provided, send to all users
}) {
  // Create the notification
  const { data: notification, error: notifError } = await supabase
    .from('notifications')
    .insert({
      type,
      title,
      body,
      target_type: targetType,
      target_id: targetId,
      association_id: associationId,
      created_by: createdBy,
      send_push: sendPush,
      status: 'sent',
    })
    .select()
    .single();

  if (notifError || !notification) {
    throw notifError || new Error('Failed to create notification');
  }

  // Get target users
  let userIds = targetUserIds;
  
  if (!userIds) {
    // Get all users from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');
    
    if (profilesError) throw profilesError;
    userIds = profiles?.map(p => p.id) || [];
  }

  // Create recipients
  if (userIds.length > 0) {
    const recipients = userIds.map(userId => ({
      notification_id: notification.id,
      user_id: userId,
    }));

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipients);

    if (recipientsError) throw recipientsError;
  }

  return { notification, recipientCount: userIds.length };
}

// Get registered users for an event
export async function getEventRegisteredUsers(eventId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmed');

  if (error) throw error;
  return data?.map(r => r.user_id) || [];
}
