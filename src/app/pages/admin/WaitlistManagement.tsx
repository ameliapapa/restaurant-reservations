import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Button } from '../../components/ui/button';
import { User, Calendar, Clock, Mail, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/api';
import type { WaitlistEntry } from '../../types';
import { useAuthListener } from '@/app/hooks/useAuthListener';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminWaitlist() {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuthListener();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchWaitlist = async () => {
    setLoading(true);
    try {
      const entries = await adminApi.waitlist.list();
      setWaitlist(entries);
    } catch (error) {
      console.error('Error fetching waitlist:', error);
      toast.error('Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/admin/login', { replace: true, state: { from: location.pathname } });
      return;
    }
    fetchWaitlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleConvertToReservation = async (id: string) => {
    try {
      const reservationId = await adminApi.waitlist.convertToReservation(id);
      toast.success('Converted to reservation!');
      fetchWaitlist();
    } catch (error: any) {
      console.error('Error converting to reservation:', error);
      toast.error(error.message || 'Failed to convert');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this entry from the waitlist?')) return;

    try {
      await adminApi.waitlist.remove(id);
      toast.success('Removed from waitlist');
      fetchWaitlist();
    } catch (error: any) {
      console.error('Error removing from waitlist:', error);
      toast.error(error.message || 'Failed to remove');
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Waitlist Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AdminLayout title="Waitlist Management">
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold">Current Waitlist</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {waitlist.length} guests waiting for availability
              </p>
            </div>
          </div>

          {waitlist.length > 0 ? (
            <div className="space-y-4">
              {waitlist.map((entry) => (
                <div
                  key={entry.id}
                  className="p-6 bg-accent rounded-xl border-2 border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                          #{entry.position}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{entry.guestName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Added {new Date(entry.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Requested Date</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(entry.requestedDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Time</p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{entry.requestedTime}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Party Size</p>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{entry.partySize} guests</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Seating</p>
                          <span className="text-sm capitalize">{entry.seatingType}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {entry.email}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {entry.phone}
                        </div>
                        <div className="px-3 py-1 bg-background rounded-full text-xs">
                          Notify via: {entry.notificationPreference}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => handleConvertToReservation(entry.id)}
                      >
                        <ArrowRight className="w-4 h-4" />
                        Convert
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(entry.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No entries in the waitlist</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
