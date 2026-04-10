import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContactForm } from '@/components/contact/ContactForm';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContactPage() {
  const [associationId, setAssociationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssociation = async () => {
      const { data } = await supabase
        .from('associations')
        .select('id')
        .eq('short_name', 'BDS')
        .maybeSingle();

      if (data) {
        setAssociationId(data.id);
      }
      setIsLoading(false);
    };

    fetchAssociation();
  }, []);

  return (
    <div className="py-4">
      <div className="mb-6">
        <h1 
          className="font-display font-bold text-2xl"
          style={{ color: 'var(--brand-secondary)' }}
        >
          Contact
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Une question ? Contactez le BDS
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : associationId ? (
        <ContactForm associationId={associationId} />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Impossible de charger le formulaire de contact.
          </p>
        </div>
      )}
    </div>
  );
}
