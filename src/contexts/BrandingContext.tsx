import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useBrandingSettings, BrandingSettings } from '@/hooks/useBrandingSettings';

interface BrandingContextType {
  branding: BrandingSettings;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Utility function to check if a color is dark (for text contrast)
function isColorDark(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

// Convert hex to HSL for CSS variables
function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { branding, isLoading } = useBrandingSettings();

  useEffect(() => {
    const root = document.documentElement;
    
    // Set CSS variables for branding - always apply (use defaults if loading)
    root.style.setProperty('--brand-primary', branding.primary_color);
    root.style.setProperty('--brand-secondary', branding.secondary_color);
    root.style.setProperty('--brand-accent', branding.accent_color);
    root.style.setProperty('--brand-bg', branding.background_color);
    
    // Set HSL versions for Tailwind compatibility
    root.style.setProperty('--brand-primary-hsl', hexToHSL(branding.primary_color));
    root.style.setProperty('--brand-secondary-hsl', hexToHSL(branding.secondary_color));
    root.style.setProperty('--brand-accent-hsl', hexToHSL(branding.accent_color));
    root.style.setProperty('--brand-bg-hsl', hexToHSL(branding.background_color));
    
    // Set foreground colors based on contrast
    root.style.setProperty('--brand-primary-fg', isColorDark(branding.primary_color) ? '#ffffff' : '#000000');
    root.style.setProperty('--brand-secondary-fg', isColorDark(branding.secondary_color) ? '#ffffff' : '#000000');
    root.style.setProperty('--brand-accent-fg', isColorDark(branding.accent_color) ? '#ffffff' : '#000000');
    root.style.setProperty('--brand-bg-fg', isColorDark(branding.background_color) ? '#ffffff' : '#000000');
    
    // Also set the body background for full coverage
    document.body.style.backgroundColor = branding.background_color;
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}

export { isColorDark };
