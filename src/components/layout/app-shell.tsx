'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Users, ShieldCheck, LayoutDashboard, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { he } from '@/lib/i18n/he';
import { cn } from '@/lib/utils';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/dashboard',    label: 'ראשי',      icon: LayoutDashboard },
  { href: '/teams',        label: 'קבוצות',    icon: ShieldCheck },
  { href: '/players',      label: 'שחקנים',    icon: Users },
  { href: '/competitions', label: 'תחרויות',   icon: Trophy },
];

export function AppShell({ children, user, isAdmin = false }: {
  children: React.ReactNode;
  user: { email: string; name?: string | null; avatar?: string | null } | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-[#0b1220] text-ink-900 dark:text-ink-100">
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-ink-900/85 backdrop-blur border-b border-ink-100 dark:border-ink-800">
        <div className="max-w-6xl mx-auto h-16 px-4 md:px-6 flex items-center gap-3">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-display font-bold text-lg shrink-0">
            <span className="size-8 rounded-lg bg-pitch-600 text-white grid place-items-center text-sm">⚽</span>
            <span className="hidden sm:inline">{he.app.name}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 mx-auto">
            {NAV.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'h-10 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-pitch-100 text-pitch-700 dark:bg-pitch-950 dark:text-pitch-200'
                      : 'text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800',
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2 ms-auto md:ms-0">
            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenu(v => !v)} className="h-10 px-2 rounded-xl inline-flex items-center gap-2 hover:bg-ink-100 dark:hover:bg-ink-800">
                  <div className="size-7 rounded-full bg-ink-200 dark:bg-ink-700 overflow-hidden">
                    {user.avatar && <img src={user.avatar} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">{user.name ?? user.email}</span>
                  <ChevronDown className="size-3.5 text-ink-500" />
                </button>
                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setUserMenu(false)} />
                    <div className="absolute end-0 mt-2 w-56 z-40 rounded-xl2 bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 shadow-cardLg p-1">
                      <div className="px-3 py-2 text-xs text-ink-500 dark:text-ink-400 truncate">{user.email}</div>
                      {isAdmin && <Link href="/invitations" onClick={() => setUserMenu(false)} className="block px-3 py-2 text-sm rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700">הזמנות</Link>}
                      {isAdmin && <Link href="/balancer" onClick={() => setUserMenu(false)} className="block px-3 py-2 text-sm rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700">מאזן קבוצות</Link>}
                      {isAdmin && <Link href="/training-groups" onClick={() => setUserMenu(false)} className="block px-3 py-2 text-sm rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700">קבוצות אימון</Link>}
                      <button onClick={logout} className="w-full text-start px-3 py-2 text-sm rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 inline-flex items-center gap-2">
                        <LogOut className="size-4" /> {he.nav.logout}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login" className="rounded-xl bg-pitch-600 text-white px-4 h-10 inline-flex items-center font-medium hover:bg-pitch-700">{he.nav.login}</Link>
            )}

            {/* Mobile menu toggle */}
            <button className="md:hidden size-10 rounded-xl grid place-items-center hover:bg-ink-100 dark:hover:bg-ink-800" onClick={() => setMenuOpen(v => !v)} aria-label="תפריט">
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {menuOpen && (
          <nav className="md:hidden border-t border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 px-2 py-2">
            {NAV.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn('h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-medium',
                    active ? 'bg-pitch-100 text-pitch-700 dark:bg-pitch-950 dark:text-pitch-200' : 'text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800',
                  )}
                >
                  <Icon className="size-4" />{item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">{children}</main>
    </div>
  );
}
