'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, Loader2, Lock, Mail, User, Sparkles, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoNotice(null);
    setLoading(true);

    const res = await apiFetch<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
      }),
    });

    setLoading(false);

    if (res.success && res.data?.token) {
      localStorage.setItem('sonic_token', res.data.token);
      localStorage.setItem('sonic_user', JSON.stringify(res.data));
      router.push('/projects');
    } else {
      setError(res.error || 'Registration failed. Please try again.');
    }
  };

  const handleGoogleSignUp = () => {
    setError(null);
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      setInfoNotice(
        'Google OAuth requires NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment variables. Please provide your Google Cloud Client ID to activate 1-click Google sign-up, or use email registration below.'
      );
      return;
    }

    setGoogleLoading(true);
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=openid%20email%20profile`;

    window.location.href = googleAuthUrl;
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-[#090A0F] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[550px] h-[320px] bg-[#00D4B4]/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#00D4B4] flex items-center justify-center shadow-[0_0_25px_rgba(0,212,180,0.4)]">
              <Zap className="w-5 h-5 text-[#0D0D0D] fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Sonic AI Studio</span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create your studio</h1>
          
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" /> 50 Free Starter Credits Included
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8 rounded-2xl border border-white/5 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          {infoNotice && (
            <div className="p-3 rounded-xl bg-[#00D4B4]/10 border border-[#00D4B4]/30 text-zinc-300 text-xs flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-[#00D4B4] shrink-0 mt-0.5" />
              <span>{infoNotice}</span>
            </div>
          )}

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2.5 shadow-sm active:scale-95 disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
            )}
            <span>Sign up with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono whitespace-nowrap shrink-0">
              or with email
            </span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00D4B4] focus:ring-1 focus:ring-[#00D4B4] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00D4B4] focus:ring-1 focus:ring-[#00D4B4] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00D4B4] focus:ring-1 focus:ring-[#00D4B4] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#00D4B4] hover:bg-[#00D4B4]/90 text-[#0D0D0D] text-sm font-bold rounded-xl transition shadow-lg shadow-[#00D4B4]/25 hover:shadow-[0_0_20px_rgba(0,212,180,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 mt-2 active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Studio...
                </>
              ) : (
                <>
                  Create Free Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00D4B4] hover:text-[#00D4B4]/80 font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
