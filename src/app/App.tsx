import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import ReservationForm from './pages/ReservationForm';
import Confirmation from './pages/Confirmation';
import Waitlist from './pages/Waitlist';
import AdminDashboard from './pages/admin/Dashboard';
import AdminReservations from './pages/admin/Reservations';
import AdminCalendar from './pages/admin/Calendar';
import AdminWaitlist from './pages/admin/WaitlistManagement';
import AdminSettings from './pages/admin/Settings';
import AdminLoginPage from './pages/admin/Login';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Customer-facing routes */}
          <Route path="/" element={<Navigate to="/reserve" replace />} />
          <Route path="/reserve" element={<ReservationForm />} />
          <Route path="/confirmation/:id" element={<Confirmation />} />
          <Route path="/waitlist" element={<Waitlist />} />
          
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/reservations" element={<AdminReservations />} />
          <Route path="/admin/calendar" element={<AdminCalendar />} />
          <Route path="/admin/waitlist" element={<AdminWaitlist />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Routes>
        
        <Toaster position="top-right" richColors />
      </div>
    </BrowserRouter>
  );
}
