/** Public complaint tracking: identical 404 for wrong ID / wrong token /
 *  no access — no enumeration. Logged-in citizens may omit the token. */
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ShieldCheck } from 'lucide-react';
import { apiPost, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { PriorityBadge, StatusBadge } from '../components/badges';
import type { TrackResult } from '../lib/types';

interface StoredLookup {
  complaintId: string;
  at: number;
}
const STORAGE_KEY = 'ccai_recent_tracks';

function readRecent(): StoredLookup[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as StoredLookup[];
  } catch {
    return [];
  }
}

export default function Track() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [complaintId, setComplaintId] = useState(params.get('complaintId') ?? '');
  const [token, setToken] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<StoredLookup[]>(readRecent);

  const lookup = async (e?: FormEvent, override?: { complaintId: string; trackingToken?: string }) => {
    e?.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await apiPost<TrackResult>('/track', {
        complaintId: (override?.complaintId ?? complaintId).trim().toUpperCase(),
        ...(override?.trackingToken !== undefined
          ? { trackingToken: override.trackingToken }
          : token.trim()
            ? { trackingToken: token.trim() }
            : {}),
      });
      setResult(res);
      const next = [
        { complaintId: res.complaint.complaintId, at: Date.now() },
        ...recent.filter((r) => r.complaintId !== res.complaint.complaintId),
      ].slice(0, 6);
      setRecent(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? 'Complaint not found. Check the ID and tracking token — both must match exactly.'
          : err instanceof ApiError
            ? err.message
            : 'Tracking failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const c = result?.complaint;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-civic-100 text-civic-700">
          <Search size={22} />
        </span>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('track.title')}</h1>
          <p className="text-sm text-slate-500">
            Enter the complaint ID and the tracking token you received when registering.
          </p>
        </div>
      </div>

      <form onSubmit={lookup} className="card mt-6 space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cid">{t('track.id')}</label>
            <input
              id="cid"
              className="input font-mono"
              placeholder="CCAI-2026-000001"
              value={complaintId}
              onChange={(e) => setComplaintId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="tok">{t('track.token')}</label>
            <input
              id="tok"
              className="input font-mono"
              placeholder={user ? 'Optional for your own complaints' : 'Tracking token'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required={!user}
            />
          </div>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary">
          <Search size={16} />
          {busy ? 'Tracking…' : t('track.submit')}
        </button>
        {!user && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck size={13} />
            Wrong ID or token returns the same “not found” answer — we never reveal which one
            was wrong.
          </p>
        )}
      </form>

      {recent.length > 0 && !result && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-600">Recent lookups (this browser)</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {recent.map((r) => (
              <button
                key={r.complaintId}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs text-slate-600 hover:border-civic-300 hover:text-civic-700"
                onClick={() => {
                  setComplaintId(r.complaintId);
                  void lookup(undefined, { complaintId: r.complaintId, trackingToken: token.trim() || undefined });
                }}
              >
                {r.complaintId}
              </button>
            ))}
          </div>
        </div>
      )}

      {c && (
        <div className="card mt-6 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
            <div>
              <p className="font-mono text-lg font-bold text-slate-900">{c.complaintId}</p>
              <p className="text-sm text-slate-500">
                {c.categoryLabel?.en ?? c.category}
                {c.district ? ` · ${c.district}` : ''}
                {c.city ? ` · ${c.city}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={c.status} />
              <PriorityBadge priority={c.priority} />
            </div>
          </div>

          <dl className="grid gap-x-6 gap-y-3 px-6 py-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Department</dt>
              <dd className="font-medium text-slate-800">{c.departmentName ?? 'Awaiting routing'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Landmark</dt>
              <dd className="font-medium text-slate-800">{c.landmark ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Submitted</dt>
              <dd className="font-medium text-slate-800">
                {new Date(c.submittedAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Resolved</dt>
              <dd className="font-medium text-slate-800">
                {c.resolvedAt ? new Date(c.resolvedAt).toLocaleString() : '—'}
              </dd>
            </div>
          </dl>

          <div className="border-t border-slate-100 px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700">Progress</h3>
            <ol className="mt-4 space-y-4">
              {c.history.map((h, i) => (
                <li key={`${h.status}-${h.at}-${i}`} className="relative flex gap-3">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      i === c.history.length - 1 ? 'bg-civic-600' : 'bg-slate-300'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {h.status.replace(/_/g, ' ')}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {new Date(h.at).toLocaleString()}
                      </span>
                    </p>
                    {h.note && <p className="mt-0.5 text-sm text-slate-500">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {c.publicUpdates.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-5">
              <h3 className="text-sm font-semibold text-slate-700">Public updates</h3>
              <ul className="mt-3 space-y-3">
                {c.publicUpdates.map((u, i) => (
                  <li key={`${u.at}-${i}`} className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                    <span className="mr-2 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {u.kind.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-700">{u.note}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {new Date(u.at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 text-sm text-slate-500">
            Need to add information?{' '}
            <Link to="/chat" className="font-medium text-civic-600 hover:underline">
              Open the assistant
            </Link>{' '}
            or call your department.
          </div>
        </div>
      )}
    </div>
  );
}
