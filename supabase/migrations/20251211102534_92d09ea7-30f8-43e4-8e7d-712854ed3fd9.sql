-- Create splash_images table
CREATE TABLE public.splash_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.splash_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view active splash images
CREATE POLICY "Anyone can view splash images"
ON public.splash_images
FOR SELECT
USING (true);

-- Staff can manage splash images
CREATE POLICY "Staff can manage splash images"
ON public.splash_images
FOR ALL
USING (is_staff_or_admin(auth.uid()));

-- Create storage bucket for splash images
INSERT INTO storage.buckets (id, name, public) VALUES ('splash-images', 'splash-images', true);

-- Storage policies
CREATE POLICY "Anyone can view splash images storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'splash-images');

CREATE POLICY "Staff can upload splash images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'splash-images' AND is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete splash images"
ON storage.objects FOR DELETE
USING (bucket_id = 'splash-images' AND is_staff_or_admin(auth.uid()));