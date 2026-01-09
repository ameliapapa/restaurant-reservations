import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import AdminLogin from '../../components/AdminLogin';
import { useAuthListener } from '@/app/hooks/useAuthListener';

export default function AdminLoginPage() {
  const { user, loading } = useAuthListener();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user) {
      const redirectTo = (location.state as any)?.from || '/admin/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, location.state]);

  return (
    <AdminLayout title="Admin Login">
      <div className="max-w-4xl mx-auto py-10">
        <AdminLogin onSuccess={() => navigate('/admin/dashboard', { replace: true })} />
      </div>
    </AdminLayout>
  );
}
