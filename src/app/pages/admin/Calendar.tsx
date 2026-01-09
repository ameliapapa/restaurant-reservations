import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { DayPicker } from 'react-day-picker';
import { Button } from '../../components/ui/button';
import { mockReservations } from '../../data/reservations';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import 'react-day-picker/dist/style.css';
import { useAuthListener } from '@/app/hooks/useAuthListener';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function AdminCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const { user, loading } = useAuthListener();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/admin/login', { replace: true, state: { from: location.pathname } });
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading || !user) {
    return (
      <AdminLayout title="Calendar View">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const reservationsForDate = selectedDate
    ? mockReservations.filter((r) => {
        const resDate = new Date(r.date);
        return (
          resDate.getDate() === selectedDate.getDate() &&
          resDate.getMonth() === selectedDate.getMonth() &&
          resDate.getFullYear() === selectedDate.getFullYear()
        );
      })
    : [];

  const reservationCounts = mockReservations.reduce((acc, res) => {
    const dateKey = new Date(res.date).toDateString();
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AdminLayout title="Calendar View">
      <div className="space-y-6">
        {/* View Toggle */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="outline" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="mx-auto"
              classNames={{
                day_selected: "bg-primary text-primary-foreground",
                day_today: "border-2 border-primary",
              }}
              modifiers={{
                hasReservations: (date) => {
                  const dateKey = date.toDateString();
                  return !!reservationCounts[dateKey];
                },
              }}
              modifiersStyles={{
                hasReservations: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                },
              }}
            />
          </div>

          {/* Selected Date Details */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <span className="text-sm text-muted-foreground">Total Reservations</span>
                <span className="font-bold text-lg">{reservationsForDate.length}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <span className="text-sm text-muted-foreground">Total Guests</span>
                <span className="font-bold text-lg">
                  {reservationsForDate.reduce((sum, r) => sum + r.partySize, 0)}
                </span>
              </div>
            </div>

            {reservationsForDate.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3">Reservations</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {reservationsForDate
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((res) => (
                      <div key={res.id} className="p-3 bg-accent/50 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{res.guestName}</span>
                          <span className="text-muted-foreground">{res.time}</span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {res.partySize} guests • {res.seatingType}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
