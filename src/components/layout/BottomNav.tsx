import { Newspaper, Calendar, ClipboardList, Mail, Users, Bell } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

const baseNavItems = [
  { to: '/', icon: Newspaper, label: "Fil d'actu" },
  { to: '/planning', icon: Calendar, label: 'Planning' },
  { to: '/inscriptions', icon: ClipboardList, label: 'Inscription' },
  { to: '/notifications', icon: Bell, label: 'Notifs', showBadge: true },
];

const contactItem = { to: '/contact', icon: Mail, label: 'Contact' };
const staffNavItem = { to: '/staff', icon: Users, label: 'Staff' };

export function BottomNav() {
  const { isStaff, user } = useAuth();
  const { unreadCount } = useNotifications();
  
  // Build nav items: for staff, replace contact with staff
  const navItems = isStaff 
    ? [...baseNavItems, staffNavItem] 
    : [...baseNavItems, contactItem];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{ 
        backgroundColor: 'hsl(var(--card))',
        borderColor: 'var(--brand-secondary)'
      }}
    >
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200"
            )}
            activeClassName="[&]:text-[var(--brand-primary-fg)] [&]:bg-[var(--brand-primary)]"
            style={{ color: 'var(--brand-secondary)' }}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {/* Notification badge */}
              {'showBadge' in item && item.showBadge && user && unreadCount > 0 && (
                <span 
                  className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center text-white px-1"
                  style={{ backgroundColor: 'var(--brand-accent)' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom" style={{ backgroundColor: 'hsl(var(--card))' }} />
    </nav>
  );
}
