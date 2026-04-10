import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, FileText, Calendar, Users, Mail, Shield, Palette } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import StaffDashboard from './StaffDashboard';
import StaffPosts from './StaffPosts';
import StaffEvents from './StaffEvents';
import StaffRegistrations from './StaffRegistrations';
import StaffMessages from './StaffMessages';
import StaffCustomization from './StaffCustomization';
import AdminRoles from './AdminRoles';

const staffTabs = [
  { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'events', label: 'Événements', icon: Calendar },
  { id: 'registrations', label: 'Inscriptions', icon: Users },
  { id: 'messages', label: 'Messages', icon: Mail },
  { id: 'customization', label: 'Perso.', icon: Palette },
];

export default function StaffPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    return tabParam || 'dashboard';
  });
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const allTabs = isAdmin
    ? [...staffTabs, { id: 'roles', label: 'Rôles', icon: Shield }]
    : staffTabs;

  return (
    <div className="space-y-4 pb-4">
      <div 
        className="-mx-4 -mt-4 px-4 py-6 mb-6"
        style={{ 
          background: `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)`
        }}
      >
        <h1 className="font-display font-bold text-xl text-white">
          Espace Staff
        </h1>
        <p className="text-sm text-white/70">
          Gestion du BDS Sporty Wood Picker
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex overflow-x-auto scrollbar-hide gap-1 bg-muted/50 p-1 rounded-lg">
          {allTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex-1 min-w-fit flex items-center gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <StaffDashboard />
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <StaffPosts />
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <StaffEvents />
        </TabsContent>

        <TabsContent value="registrations" className="mt-4">
          <StaffRegistrations />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <StaffMessages />
        </TabsContent>

        <TabsContent value="customization" className="mt-4">
          <StaffCustomization />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="roles" className="mt-4">
            <AdminRoles />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
