import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Eye, Trash2, User, Calendar, Clock, Loader2 } from 'lucide-react';
import { formatDate, formatTime, cn } from '../../lib/utils';
import { toast } from 'sonner';
import { adminApi } from '@/services/api';
import type { Reservation, ReservationStatus } from '../../types';
import { useAuthListener } from '@/app/hooks/useAuthListener';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminReservations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuthListener();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const result = await adminApi.reservations.list(filters);
      setReservations(result.reservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to load reservations');
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
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, user, authLoading]);

  if (authLoading) {
    return (
      <AdminLayout title="Reservations">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return null;
  }

  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      reservation.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.phone.includes(searchTerm);

    return matchesSearch;
  });

  const handleStatusChange = async (id: string, newStatus: ReservationStatus) => {
    try {
      await adminApi.reservations.updateStatus(id, newStatus);
      toast.success(`Reservation status updated to ${newStatus}`);
      fetchReservations();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return;

    try {
      await adminApi.reservations.delete(id);
      toast.success('Reservation deleted');
      fetchReservations();
    } catch (error: any) {
      console.error('Error deleting reservation:', error);
      toast.error(error.message || 'Failed to delete reservation');
    }
  };

  const getStatusColor = (status: ReservationStatus) => {
    return 'bg-[#FFFDF9] text-foreground border-border';
  };

  return (
    <AdminLayout title="Reservations">
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReservationStatus | 'all')}
              className="px-4 py-2 rounded-lg border border-border bg-background"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="no-show">No Show</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Reservations Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Guest</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date & Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Party</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Seating</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Contact</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{reservation.guestName}</p>
                          <p className="text-sm text-muted-foreground">ID: {reservation.id}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(reservation.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {formatTime(reservation.time)}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className="font-semibold">{reservation.partySize}</span>
                      <span className="text-muted-foreground text-sm"> guests</span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium capitalize",
                        reservation.seatingType === 'balcony'
                          ? "bg-[#E8F1E8] text-[#2D5233]"
                          : "bg-[#F5F1ED] text-[#A04E32]"
                      )}>
                        {reservation.seatingType}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <select
                        value={reservation.status}
                        onChange={(e) => handleStatusChange(reservation.id, e.target.value as ReservationStatus)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border capitalize cursor-pointer",
                          getStatusColor(reservation.status)
                        )}
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="no-show">No Show</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        <p className="text-muted-foreground">{reservation.email}</p>
                        <p className="text-muted-foreground">{reservation.phone}</p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedReservation(reservation)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(reservation.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredReservations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No reservations found</p>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedReservation && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedReservation(null)}
          >
            <div
              className="bg-card rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6">Reservation Details</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Guest Name</p>
                    <p className="font-semibold">{selectedReservation.guestName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Party Size</p>
                    <p className="font-semibold">{selectedReservation.partySize} guests</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{formatDate(selectedReservation.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-semibold">{formatTime(selectedReservation.time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{selectedReservation.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-semibold">{selectedReservation.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Seating</p>
                    <p className="font-semibold capitalize">{selectedReservation.seatingType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold capitalize">{selectedReservation.status}</p>
                  </div>
                </div>
                
                {selectedReservation.specialRequests && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Special Requests</p>
                    <p className="bg-accent p-4 rounded-lg">{selectedReservation.specialRequests}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedReservation(null)}>
                  Close
                </Button>
                <Button className="flex-1">Edit Reservation</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
