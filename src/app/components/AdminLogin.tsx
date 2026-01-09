import { useState } from 'react';
import { auth } from '@/config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('admin@freshgarden.com');
  const [password, setPassword] = useState('admin123456');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in');
      onSuccess();
    } catch (error: any) {
      console.error('Admin login failed:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-card border border-border rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-1">Admin Sign In</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Use your admin credentials. In emulator mode, defaults are pre-filled.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground" htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground" htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-primary/90 disabled:opacity-60"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

export default AdminLogin;
