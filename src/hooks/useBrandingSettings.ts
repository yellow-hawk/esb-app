import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BrandingSettings {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  logo_url: string | null;
}

const DEFAULT_BRANDING: BrandingSettings = {
  primary_color: '#1C6135',
  secondary_color: '#2D7A4A',
  accent_color: '#4CAF50',
  background_color: '#0F3D1F',
  logo_url: null,
};

export function useBrandingSettings() {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data, error } = await supabase
        .from('branding_settings')
        .select('primary_color, secondary_color, accent_color, background_color, logo_url')
        .limit(1)
        .single();

      if (data && !error) {
        setBranding({
          primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
          secondary_color: data.secondary_color || DEFAULT_BRANDING.secondary_color,
          accent_color: data.accent_color || DEFAULT_BRANDING.accent_color,
          background_color: data.background_color || DEFAULT_BRANDING.background_color,
          logo_url: data.logo_url,
        });
      }
      setIsLoading(false);
    };

    fetchBranding();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('branding_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'branding_settings',
        },
        () => {
          fetchBranding();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { branding, isLoading };
}

// Utility to create gradient from colors
export function createGradient(primary: string, secondary: string): string {
  return `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
}
