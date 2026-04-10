import { User, LogOut, Settings, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useBrandingSettings, createGradient } from '@/hooks/useBrandingSettings';

export function Header() {
  const { user, signOut, isStaff } = useAuth();
  const navigate = useNavigate();
  const { branding } = useBrandingSettings();

  const headerStyle = {
    background: createGradient(branding.primary_color, branding.secondary_color),
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50" style={headerStyle}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {branding.logo_url ? (
            <img 
              src={branding.logo_url} 
              alt="Logo" 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg font-display font-bold text-white">🌲</span>
            </div>
          )}
          <div>
            <h1 className="font-display font-bold text-lg text-white leading-tight">
              Sporty Wood Picker
            </h1>
            <p className="text-xs text-white/70">BDS ESB</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-muted-foreground text-sm">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Bell className="mr-2 h-4 w-4" />
                  Paramètres
                </DropdownMenuItem>
                {isStaff && (
                  <DropdownMenuItem onClick={() => navigate('/staff?tab=customization')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Personnalisation
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/auth')}
              className="text-white hover:bg-white/10 font-medium"
            >
              Connexion
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
