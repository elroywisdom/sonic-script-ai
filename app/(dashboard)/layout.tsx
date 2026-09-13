'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  FolderKanban, 
  CreditCard, 
  Zap, 
  LogOut, 
  Menu, 
  X,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ fullName?: string; email?: string; balance?: number } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // 1. Initial cached user info
    const cached = localStorage.getItem("sonic_user");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setUser({
          fullName: parsed.full_name || "Creator",
          email: parsed.email,
          balance: parsed.balance_credits ?? 50,
        });
      } catch (e) {}
    }

    // Load saved sidebar collapsed state
    const savedCollapsed = localStorage.getItem("sonic_sidebar_collapsed");
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === "true");
    }

    // 2. Fetch live data from /auth/me
    const token = localStorage.getItem("sonic_token");
    if (!token) {
      router.push("/login");
      return;
    }

    apiFetch<any>("/auth/me").then((res) => {
      if (res.success && res.data) {
        setUser({
          fullName: res.data.full_name,
          email: res.data.email,
          balance: res.data.balance_credits ?? 50,
        });
      }
    });

    // 3. Listen for live balance updates from billing page
    const handleBalanceUpdate = (e: any) => {
      if (e.detail !== undefined) {
        setUser((prev) => prev ? { ...prev, balance: e.detail } : prev);
      }
    };
    window.addEventListener("sonic_balance_updated", handleBalanceUpdate);

    return () => {
      window.removeEventListener("sonic_balance_updated", handleBalanceUpdate);
    };
  }, [router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sonic_sidebar_collapsed", String(next));
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("sonic_token");
    localStorage.removeItem("sonic_user");
    router.push("/login");
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CR";

  return (
    <div className="min-h-screen flex bg-[#090A0F] text-white">
      {/* Desktop Sidebar (Claude-style: clean header, collapse button at bottom right) */}
      <aside 
        className={`hidden md:flex flex-col justify-between bg-[#0c0d12]/95 backdrop-blur-xl shrink-0 sticky top-0 h-screen transition-all duration-300 ease-in-out z-30 ${
          collapsed 
            ? 'w-0 p-0 border-r-0 overflow-hidden opacity-0 pointer-events-none' 
            : 'w-64 p-4 border-r border-white/[0.08] opacity-100'
        }`}
      >
        <div>
          {/* Header Row: Logo & Title only (NO close button here, matching Claude) */}
          <div className="flex items-center justify-between mb-6 pt-1 px-1">
            <Link 
              href="/projects" 
              className="flex items-center gap-3 overflow-hidden"
              title="Sonic AI Studio"
            >
              <div className="w-9 h-9 rounded-xl bg-[#00D4B4] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,180,0.35)] shrink-0">
                <Zap className="w-5 h-5 text-[#0D0D0D] fill-current" />
              </div>
              <div className="overflow-hidden">
                <h2 className="font-bold text-sm tracking-tight text-white whitespace-nowrap">Sonic AI</h2>
                <p className="text-[11px] text-zinc-400 whitespace-nowrap">Creator Studio</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <Link
              href="/projects"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                pathname.startsWith("/projects")
                  ? "text-white bg-white/10 shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FolderKanban className="w-4 h-4 text-[#00D4B4] shrink-0" />
              <span>Projects</span>
            </Link>

            <Link
              href="/billing"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                pathname.startsWith("/billing")
                  ? "text-white bg-white/10 shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CreditCard className="w-4 h-4 text-[#00D4B4] shrink-0" />
              <span>Billing</span>
            </Link>
          </nav>
        </div>

        {/* User Footer Row: Avatar, Info, Logout, and Collapse Button at the BOTTOM right */}
        <div className="border-t border-white/[0.08] pt-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#00D4B4]/15 text-[#00D4B4] font-semibold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-white truncate">{user?.fullName || "My Studio"}</p>
                <p className="text-[11px] text-[#00D4B4] font-mono font-medium">{user?.balance ?? 50} Credits</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="text-zinc-400 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-white/5"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Claude-style bottom toggle icon when sidebar is OPEN */}
              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                className="text-zinc-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/5"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-[#0D0E12] border-r border-white/10 p-5 flex flex-col justify-between z-10 animate-fade-in shadow-2xl h-full">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
                <Link href="/projects" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                  <div className="w-8 h-8 rounded-xl bg-[#00D4B4] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,180,0.35)]">
                    <Zap className="w-4 h-4 text-[#0D0D0D] fill-current" />
                  </div>
                  <span className="font-bold text-sm text-white">Sonic AI</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <Link
                  href="/projects"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition ${
                    pathname.startsWith("/projects")
                      ? "text-white bg-white/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <FolderKanban className="w-4 h-4 text-[#00D4B4]" /> Projects
                </Link>
                <Link
                  href="/billing"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition ${
                    pathname.startsWith("/billing")
                      ? "text-white bg-white/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-[#00D4B4]" /> Billing
                </Link>
              </nav>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-[#00D4B4]/15 text-[#00D4B4] font-semibold text-xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-white truncate">{user?.fullName || "My Studio"}</p>
                    <p className="text-[10px] text-[#00D4B4] font-mono">{user?.balance ?? 50} Credits</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="text-slate-400 hover:text-red-400 p-1.5"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 flex items-center justify-between bg-[#090A0F]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Expand Button: ONLY visible when sidebar is COLLAPSED (at top-left like Claude) */}
            {collapsed && (
              <button
                onClick={toggleSidebar}
                title="Open sidebar"
                className="hidden md:flex p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
              <span className="hidden sm:inline">Workspace</span>
              <span className="hidden sm:inline">/</span>
              <span className="text-white font-medium">Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/billing"
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#00D4B4] text-xs font-mono hover:bg-[#00D4B4]/20 transition"
            >
              <span>⚡</span>
              <span className="font-bold">{user?.balance ?? 50}</span>
              <span className="hidden sm:inline text-zinc-400">Credits</span>
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
