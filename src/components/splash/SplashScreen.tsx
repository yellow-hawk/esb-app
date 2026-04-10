import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrandingSettings, createGradient } from '@/hooks/useBrandingSettings';

interface SplashImage {
  id: string;
  image_url: string;
  title: string | null;
}

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 2500 }: SplashScreenProps) {
  const [images, setImages] = useState<SplashImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { branding } = useBrandingSettings();

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase
        .from('splash_images')
        .select('id, image_url, title')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .limit(2);
      
      setImages(data || []);
      setIsLoading(false);
    };

    fetchImages();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  const splashStyle = {
    background: `linear-gradient(135deg, ${branding.background_color} 0%, ${branding.primary_color} 100%)`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={splashStyle}>
      <div className="flex flex-col items-center gap-8">
        {/* Logo or orbital animation container */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          {images.length >= 2 ? (
            <div className="orbit-container w-full h-full animate-orbit">
              <img
                src={images[0].image_url}
                alt={images[0].title || 'Splash 1'}
                className="orbit-image absolute w-16 h-16 rounded-full object-cover shadow-lg border-2 border-white/30"
                style={{ top: '0%', left: '50%', transform: 'translate(-50%, 0)' }}
              />
              <img
                src={images[1].image_url}
                alt={images[1].title || 'Splash 2'}
                className="orbit-image absolute w-16 h-16 rounded-full object-cover shadow-lg border-2 border-white/30"
                style={{ bottom: '0%', left: '50%', transform: 'translate(-50%, 0)' }}
              />
            </div>
          ) : images.length === 1 ? (
            <img
              src={images[0].image_url}
              alt={images[0].title || 'Splash'}
              className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-white/30 animate-pulse"
            />
          ) : branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt="Logo"
              className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-white/30 animate-pulse"
            />
          ) : null}
          
          {/* Center text - only show if no logo or orbital images */}
          {images.length === 0 && !branding.logo_url && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white font-display font-bold text-xs text-center leading-tight px-2">
                  Sporty Wood Picker
                </span>
              </div>
            </div>
          )}

          {/* Center overlay for orbital animation */}
          {images.length >= 2 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                {branding.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt="Logo"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-display font-bold text-xs text-center leading-tight px-2">
                    Sporty Wood Picker
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading text */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-display font-bold text-2xl text-white">
            Sporty Wood Picker
          </h1>
          <div className="flex items-center gap-2 text-white/70">
            <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
