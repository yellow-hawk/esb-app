
-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create branding_settings table
CREATE TABLE public.branding_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_color text NOT NULL DEFAULT '#1C6135',
  secondary_color text NOT NULL DEFAULT '#2D7A4A',
  accent_color text DEFAULT '#4CAF50',
  background_color text DEFAULT '#0F3D1F',
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view branding settings
CREATE POLICY "Anyone can view branding settings"
ON public.branding_settings
FOR SELECT
USING (true);

-- Only staff can manage branding settings
CREATE POLICY "Staff can manage branding settings"
ON public.branding_settings
FOR ALL
USING (is_staff_or_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_branding_settings_updated_at
BEFORE UPDATE ON public.branding_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.branding_settings (primary_color, secondary_color, accent_color, background_color)
VALUES ('#1C6135', '#2D7A4A', '#4CAF50', '#0F3D1F');

-- Create post_images table
CREATE TABLE public.post_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view post images for published posts
CREATE POLICY "Anyone can view post images"
ON public.post_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_images.post_id 
    AND posts.is_published = true
  )
);

-- Staff can view all post images
CREATE POLICY "Staff can view all post images"
ON public.post_images
FOR SELECT
USING (is_staff_or_admin(auth.uid()));

-- Staff can manage post images
CREATE POLICY "Staff can manage post images"
ON public.post_images
FOR ALL
USING (is_staff_or_admin(auth.uid()));

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-images bucket
CREATE POLICY "Anyone can view post images storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

CREATE POLICY "Staff can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-images' AND is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete post images"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-images' AND is_staff_or_admin(auth.uid()));

-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for branding bucket
CREATE POLICY "Anyone can view branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Staff can upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branding' AND is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete branding assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'branding' AND is_staff_or_admin(auth.uid()));
