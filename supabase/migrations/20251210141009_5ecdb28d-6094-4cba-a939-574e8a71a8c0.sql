
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('etudiant', 'bds_staff', 'admin');

-- Create enum for registration status
CREATE TYPE public.registration_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- Create enum for message status
CREATE TYPE public.message_status AS ENUM ('unread', 'read', 'archived');

-- Create associations table
CREATE TABLE public.associations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  association_id UUID REFERENCES public.associations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'etudiant',
  UNIQUE (user_id, role)
);

-- Create posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  max_participants INTEGER,
  is_registration_open BOOLEAN NOT NULL DEFAULT true,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create registrations table
CREATE TABLE public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status registration_status NOT NULL DEFAULT 'confirmed',
  UNIQUE (event_id, user_id)
);

-- Create contact_messages table
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status message_status NOT NULL DEFAULT 'unread'
);

-- Enable Row Level Security on all tables
ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is bds_staff or admin
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('bds_staff', 'admin')
  )
$$;

-- RLS Policies for associations (public read)
CREATE POLICY "Anyone can view associations"
  ON public.associations FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage associations"
  ON public.associations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for posts (public read, staff write)
CREATE POLICY "Anyone can view published posts"
  ON public.posts FOR SELECT
  USING (is_published = true);

CREATE POLICY "Staff can manage posts"
  ON public.posts FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- RLS Policies for events (public read, staff write)
CREATE POLICY "Anyone can view events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage events"
  ON public.events FOR ALL
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- RLS Policies for registrations
CREATE POLICY "Users can view their own registrations"
  ON public.registrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all registrations"
  ON public.registrations FOR SELECT
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Users can manage their own registrations"
  ON public.registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own registrations"
  ON public.registrations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for contact_messages
CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can view contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update message status"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'name', new.email), new.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'etudiant');
  
  RETURN new;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default BDS association
INSERT INTO public.associations (name, short_name, description, email)
VALUES (
  'Bureau Des Sports - Sporty Wood Picker',
  'BDS',
  'Le Bureau Des Sports de l''École Supérieure du Bois organise des événements sportifs et des activités pour tous les étudiants.',
  'bds@asso.etu-campus.fr'
);
