-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('post_published', 'event_published', 'event_update', 'event_reminder');

-- Create notification status enum
CREATE TYPE public.notification_status AS ENUM ('draft', 'scheduled', 'sent');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'event')),
  target_id UUID NOT NULL,
  association_id UUID REFERENCES public.associations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  send_push BOOLEAN NOT NULL DEFAULT false,
  status notification_status NOT NULL DEFAULT 'sent'
);

-- Create notification_recipients table
CREATE TABLE public.notification_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Create push_subscriptions table for PWA push notifications
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on all tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS for notifications: staff can create/manage, users can read via recipients
CREATE POLICY "Staff can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can view all notifications" ON public.notifications
  FOR SELECT USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notification_recipients
      WHERE notification_recipients.notification_id = notifications.id
      AND notification_recipients.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update notifications" ON public.notifications
  FOR UPDATE USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete notifications" ON public.notifications
  FOR DELETE USING (is_staff_or_admin(auth.uid()));

-- RLS for notification_recipients
CREATE POLICY "Staff can manage recipients" ON public.notification_recipients
  FOR ALL USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Users can view their own recipients" ON public.notification_recipients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipients (mark as read)" ON public.notification_recipients
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS for push_subscriptions
CREATE POLICY "Users can manage their own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all subscriptions" ON public.push_subscriptions
  FOR SELECT USING (is_staff_or_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_notifications_target ON public.notifications(target_type, target_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notification_recipients_user ON public.notification_recipients(user_id);
CREATE INDEX idx_notification_recipients_unread ON public.notification_recipients(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- Trigger for updated_at on push_subscriptions
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();