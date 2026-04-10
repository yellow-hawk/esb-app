import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface StaffGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function StaffGuard({ children, requireAdmin = false }: StaffGuardProps) {
  const { user, isLoading, userRole, isStaff } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (requireAdmin && userRole !== 'admin') {
      toast({
        title: 'Accès refusé',
        description: 'Cette page est réservée aux administrateurs.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    if (!isStaff) {
      toast({
        title: 'Accès refusé',
        description: 'Accès réservé au staff du BDS.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [user, isLoading, userRole, isStaff, requireAdmin, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isStaff || (requireAdmin && userRole !== 'admin')) {
    return null;
  }

  return <>{children}</>;
}
