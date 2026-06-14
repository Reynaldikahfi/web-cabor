"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Trophy, 
  LayoutDashboard, 
  Calendar, 
  Users, 
  LogOut, 
  Shield,
  Clock,
  Sparkles,
  Award,
  FileSpreadsheet
} from "lucide-react";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    async function verifySession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        
        if (data.authenticated) {
          setSession(data.admin);
          if (isLoginPage) {
            router.push("/admin");
          }
        } else {
          setSession(null);
          if (!isLoginPage) {
            router.push("/admin/login");
          }
        }
      } catch (err) {
        console.error("Session check error in admin layout:", err);
        if (!isLoginPage) router.push("/admin/login");
      } finally {
        setChecking(false);
      }
    }
    verifySession();
  }, [pathname, router, isLoginPage]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center gap-4">
        <div className="h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">Memverifikasi Sesi...</span>
      </div>
    );
  }

  // If we are on the login page, render children directly without dashboard shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col md:min-h-screen">
        {/* Brand header */}
        <div className="p-6 border-b border-slate-800/50 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-bg-indigo flex items-center justify-center text-white shadow shadow-indigo-500/30">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase">
                ADMIN CONSOLE
              </span>
              <span className="block text-[8px] font-bold text-slate-500 tracking-wider uppercase mt-0.5">
                Cabor Management
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 flex-1 space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible">
          {[
            { id: "overview", href: "/admin", label: "Overview", icon: LayoutDashboard },
            { id: "home", href: "/", label: "Public Portal", icon: Trophy }
          ].map((item) => {
            // Check if active: overview matches exact admin page, etc.
            // Since we built the sub-sections as tab components inside /admin/page.js, we only need to direct them nicely or have tabs inside a single page.
            // This is actually extremely neat! It means the organizer can have a fully modular tabs system in the same admin index page, making it incredibly fast.
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs tracking-wide uppercase transition-all flex-shrink-0 md:flex-shrink ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md glow-indigo scale-102"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Session card & Logout */}
        <div className="p-4 border-t border-slate-800/60 mt-auto hidden md:block">
          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl mb-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
              AD
            </div>
            <div className="overflow-hidden">
              <span className="block text-[10px] font-bold text-slate-200 truncate">{session?.username || "Administrator"}</span>
              <span className="block text-[8px] font-semibold text-slate-500 uppercase mt-0.5">Level: Super Admin</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs uppercase transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Sistem</span>
          </button>
        </div>
        
        {/* Mobile logout */}
        <div className="p-4 border-t border-slate-800/60 md:hidden flex items-center justify-between gap-4">
          <span className="text-[10px] font-bold text-slate-500">Sesi: {session?.username}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold text-[10px] uppercase transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 gradient-bg-dark">
        {children}
      </main>

    </div>
  );
}
