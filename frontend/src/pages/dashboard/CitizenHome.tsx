/** Citizen home: quick actions, notifications, and locally saved tracking
 *  lookups (citizens track via tokens — there is no server-side listing by
 *  design, which prevents enumeration). */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageSquareText, Search } from 'lucide-react';
import { apiGet } from '../../lib/api';
import type { NotificationItem } from '../../lib/types';

export default function CitizenHome() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [tracked, setTracked] = useState<{ complaintId: string; at: number }[]>([]);

  useEffect(() => {
    apiGet<{ items: NotificationItem[]; unreadCount: number }>('/notifications', { limit: 8 })
      .then((r) => {
        setNotifications(r.items);
        setUnread(r.unreadCount);
      })
      .catch(() => undefined);
    try {
      setTracked(JSON.parse(localStorage.getItem('ccai_recent_tracks') ?? '[]'));
    } catch {
      setTracked([]);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your activity</h1>
        <p className="text-sm text-slate-500">
          Report issues, track them and follow updates — all in your language.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/chat"
          className="card group flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:border-civic-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-civic-100 text-civic-700">
            <MessageSquareText size={21} />
          </span>
          <span>
            <span className="block font-bold text-slate-900 group-hover:text-civic-700">
              Report an issue
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Talk to the assistant in Kannada, English or Hindi. You confirm before anything is
              registered.
            </span>
          </span>
        </Link>
        <Link
          to="/track"
          className="card group flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:border-civic-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Search size={21} />
          </span>
          <span>
            <span className="block font-bold text-slate-900 group-hover:text-civic-700">
              Track a complaint
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Use your CCAI ID and private tracking token to see live status and public updates.
            </span>
          </span>
        </Link>
      </div>

      {tracked.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-800">Recently tracked (this browser)</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {tracked.map((t) => (
              <Link
                key={t.complaintId}
                to="/track"
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-semibold text-slate-600 hover:border-civic-300 hover:text-civic-700"
              >
                {t.complaintId}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Bell size={15} /> Notifications
            {unread > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                {unread} new
              </span>
            )}
          </h2>
        </div>
        <ul className="mt-3 divide-y divide-slate-50">
          {notifications.map((n) => (
            <li key={n.id} className={`py-3 ${n.readAt ? 'opacity-60' : ''}`}>
              <p className="text-sm font-medium text-slate-800">{n.title}</p>
              <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>
              <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
            </li>
          ))}
          {notifications.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-400">No notifications yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
