import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type MessageStatus = Database['public']['Enums']['message_status'];

const statusLabels: Record<MessageStatus, string> = {
  unread: 'Non lu',
  read: 'Lu',
  archived: 'Traité',
};

const statusColors: Record<MessageStatus, string> = {
  unread: 'bg-destructive text-destructive-foreground',
  read: 'bg-warning text-warning-foreground',
  archived: 'bg-success text-success-foreground',
};

export default function StaffMessages() {
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['staff-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*, associations(name, short_name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MessageStatus }) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-messages'] });
    },
  });

  const handleStatusChange = (id: string, status: MessageStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">Messages de contact</h2>
      </div>

      {messages?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun message de contact
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages?.map((message) => (
            <Card
              key={message.id}
              className="overflow-hidden cursor-pointer card-hover"
              onClick={() => setSelectedMessage(message)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={statusColors[message.status as MessageStatus]}>
                        {statusLabels[message.status as MessageStatus]}
                      </Badge>
                    </div>
                    <h3 className="font-semibold truncate">{message.subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      De: {message.sender_name}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(message.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {message.message}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedMessage?.subject}</DialogTitle>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">De:</span>
                  <span className="font-medium">{selectedMessage.sender_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{selectedMessage.sender_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>
                    {format(new Date(selectedMessage.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Statut:</span>
                  <Select
                    value={selectedMessage.status}
                    onValueChange={(value) =>
                      handleStatusChange(selectedMessage.id, value as MessageStatus)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unread">Non lu</SelectItem>
                      <SelectItem value="read">Lu</SelectItem>
                      <SelectItem value="archived">Traité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Message</h4>
                <p className="text-sm whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
