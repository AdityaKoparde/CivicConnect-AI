/** Top navigation: brand, primary links, language switcher, notifications
 *  bell, user menu / sign-in. */
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, Globe, LogOut, Menu, User, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n, type Lang } from '../lib/i18n';
import { apiGet, apiPost } from '../lib/api';
import type { NotificationItem } from '../lib/types';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'हिंदी' },
];

function NotificationsBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      apiGet<{ items: NotificationItem[]; unreadCount: number }>('/notifications', { limit: 12 })
        .then((res) => {
          if (!alive) return;
          setItems(res.items);
          setUnread(res.unreadCount);
        })
        .catch(() => undefined);
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    try {
      const res = await apiPost<{ unreadCount: number }>('/notifications/read', { ids: 'all' });
      setUnread(res.unreadCount);
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={t('nav.notifications')}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold">{t('nav.notifications')}</span>
            {unread > 0 && (
              <button type="button" className="text-xs text-civic-600 hover:underline" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`border-b border-slate-50 px-4 py-3 last:border-0 ${n.readAt ? 'opacity-60' : ''}`}
              >
                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/chat', label: t('nav.chat'), end: false },
    { to: '/track', label: t('nav.track'), end: false },
    ...(user ? [{ to: '/dashboard', label: t('nav.dashboard'), end: false }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-civic-600 to-civic-800 text-sm font-black text-white">
            CC
          </span>
          <span className="hidden sm:block">
            CivicConnect <span className="text-civic-600">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-civic-50 text-civic-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-lg border border-slate-200 p-0.5 sm:flex">
            <Globe size={14} className="mx-1.5 text-slate-400" />
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                  lang === l.code ? 'bg-civic-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {user && <NotificationsBell />}

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
                <User size={14} className="text-slate-500" />
                <span className="max-w-32 truncate text-sm font-medium text-slate-700">
                  {user.name}
                </span>
                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-civic-700">
                  {user.role === 'SUPER_ADMIN'
                    ? 'Admin'
                    : user.role.replace('DEPARTMENT_', '').replace('_', ' ')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label={t('nav.logout')}
              >
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary hidden md:inline-flex">
              {t('nav.login')}
            </Link>
          )}

          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    lang === l.code ? 'bg-civic-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void handleLogout();
                }}
                className="mt-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                {t('nav.logout')}
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="btn-primary mt-2"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
