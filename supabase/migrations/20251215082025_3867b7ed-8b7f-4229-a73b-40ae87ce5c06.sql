-- Enable realtime for branding_settings to allow live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.branding_settings;