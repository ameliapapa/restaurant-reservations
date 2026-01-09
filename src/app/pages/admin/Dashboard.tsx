import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Calendar, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { formatTime } from '../../lib/utils';
import { adminApi } from '@/services/api';
import { useAuthListener } from '@/app/hooks/useAuthListener';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuthListener();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/admin/login', { replace: true, state: { from: location.pathname } });
      return;
    }

    adminApi.dashboard.getStats()
      .then((data) => {
        setDashboardStats(data);
      })
      .catch((error) => {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate, location.pathname]);

  if (authLoading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!dashboardStats) {
    return (
      <AdminLayout title="Dashboard">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    {
      name: 'Total Reservations',
      value: dashboardStats.todayReservations || 0,
    },
    {
      name: 'Total Guests',
      value: dashboardStats.todayGuests || 0,
    },
    {
      name: 'Balcony Seating',
      value: dashboardStats.balconyCount || 0,
    },
    {
      name: 'Indoor Seating',
      value: dashboardStats.indoorCount || 0,
    },
  ];

  const upcomingToday = dashboardStats.upcomingReservations || [];
  const totalReservationsCount = dashboardStats.todayReservations || 0;
  const balconyCount = dashboardStats.balconyCount || 0;
  const indoorCount = dashboardStats.indoorCount || 0;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8">
        {/* Date Display */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg text-muted-foreground">Today's Date</h3>
              <p className="text-2xl font-bold mt-1">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-primary/10 p-4 rounded-lg">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            return (
              <div key={stat.name} className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted-foreground mb-4">{stat.name}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Upcoming Arrivals Timeline */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">Upcoming Arrivals Today</h3>
          </div>

          {upcomingToday.length > 0 ? (
            <div className="space-y-4">
              {upcomingToday.map((reservation, index) => (
                <div
                  key={reservation.id}
                  className="flex items-center gap-4 p-4 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary">
                      {formatTime(reservation.time).split(' ')[0]}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold">{reservation.guestName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {reservation.partySize} guests • {reservation.seatingType}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatTime(reservation.time)}</p>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${
                        reservation.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {reservation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No upcoming reservations for today</p>
            </div>
          )}
        </div>

        {/* Seating Distribution */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Balcony vs Indoor Split</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Balcony</span>
                  <span className="font-semibold">{balconyCount} reservations</span>
                </div>
                <div className="h-3 bg-accent rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${
                        totalReservationsCount > 0
                          ? (balconyCount / totalReservationsCount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Indoor</span>
                  <span className="font-semibold">{indoorCount} reservations</span>
                </div>
                <div className="h-3 bg-accent rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{
                      width: `${
                        totalReservationsCount > 0
                          ? (indoorCount / totalReservationsCount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Reservation Status</h3>
            <div className="space-y-3">
              {['confirmed', 'pending', 'seated', 'completed'].map((status) => {
                const count = dashboardStats.statusBreakdown?.[status] || 0;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{status}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
