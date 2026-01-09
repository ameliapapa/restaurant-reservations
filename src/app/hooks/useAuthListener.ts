import { useEffect, useState } from 'react';
import { auth } from '@/config/firebase';
import type { User } from 'firebase/auth';

export function useAuthListener() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(!auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
