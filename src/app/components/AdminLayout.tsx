import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { LayoutDashboard, Calendar, ListOrdered, Clock, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Reservations', href: '/admin/reservations', icon: ListOrdered },
  { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
  { name: 'Waitlist', href: '/admin/waitlist', icon: Clock },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/admin/login', { replace: true });
    } catch (error: any) {
      console.error('Logout failed:', error);
      toast.error(error.message || 'Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl" style={{ fontFamily: 'Instrument Serif, serif' }}>Fresh Garden</h1>
            <p className="text-xs text-muted-foreground">Admin Portal</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              View Website
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">{title}</h2>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
