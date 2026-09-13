'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing Google authentication...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // 1. Check URL hash (OAuth Implicit flow) or query params
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash || window.location.search);

      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');
      const code = params.get('code');
      const authError = params.get('error');

      if (authError) {
        setError(`Google login error: ${authError}`);
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      const tokenToSend = idToken || accessToken || code;
      if (!tokenToSend) {
        setError('No authentication token returned from Google.');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      setStatus('Setting up your studio workspace...');

      const res = await apiFetch<any>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          id_token: idToken || '',
          access_token: accessToken || code || '',
        }),
      });

      if (res.success && res.data?.token) {
        localStorage.setItem('sonic_token', res.data.token);
        localStorage.setItem('sonic_user', JSON.stringify(res.data));
        router.push('/projects');
      } else {
        setError(res.error || 'Failed to complete Google authentication.');
        setTimeout(() => router.push('/login'), 3500);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#090A0F] px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#00D4B4] flex items-center justify-center shadow-[0_0_30px_rgba(0,212,180,0.4)] mb-6 animate-pulse">
        <Zap className="w-6 h-6 text-[#0D0D0D] fill-current" />
      </div>

      <div className="glass-card p-8 rounded-2xl border border-white/5 max-w-sm w-full space-y-4">
        {error ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
            <p className="text-xs text-zinc-500">Redirecting back to login...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Loader2 className="w-6 h-6 text-[#00D4B4] animate-spin mx-auto" />
            <p className="text-sm font-medium text-white">{status}</p>
            <p className="text-xs text-zinc-500 font-mono">Securing your session</p>
          </div>
        )}
      </div>
    </div>
  );
}
