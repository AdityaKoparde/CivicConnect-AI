/** Complaint queue — server-side filtering + pagination, role-scoped. */
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { PriorityBadge, StatusBadge } from '../../components/badges';
import type { Category, ComplaintStatus, ComplaintSummary, Paged, Priority } from '../../lib/types';

const STATUSES: ComplaintStatus[] = [
  'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS',
  'AWAITING_CITIZEN_INFO', 'RESOLVED', 'REJECTED', 'ESCALATED',
];
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function Complaints() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Paged<ComplaintSummary> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(params.get('search') ?? '');

  const status = params.get('status') ?? '';
  const priority = params.get('priority') ?? '';
  const category = params.get('category') ?? '';
  const page = Number(params.get('page') ?? 1);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    apiGet<Paged<ComplaintSummary>>('/complaints', {
      page,
      limit: 20,
      status: status || undefined,
      priority: priority || undefined,
      category: category || undefined,
      search: params.get('search') ?? undefined,
    })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [page, status, priority, category, params]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiGet<{ items: Category[] }>('/categories')
      .then((r) => setCategories(r.items))
      .catch(() => undefined);
  }, []);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Complaints</h1>
          <p className="text-sm text-slate-500">
            {data ? `${data.total} in your scope` : 'Loading…'}
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams(params);
            if (search) next.set('search', search);
            else next.delete('search');
            next.delete('page');
            setParams(next, { replace: true });
          }}
        >
          <input
            className="input !w-56"
            placeholder="Search ID or text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary !px-3">
            <Search size={16} />
          </button>
        </form>
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto" value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select className="input !w-auto" value={priority} onChange={(e) => setParam('priority', e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select className="input !w-auto" value={category} onChange={(e) => setParam('category', e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>{c.label.en}</option>
          ))}
        </select>
        {(status || priority || category || params.get('search')) && (
          <button type="button" className="btn-secondary" onClick={() => setParams({}, { replace: true })}>
            Clear
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">District</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Filed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data?.items.map((c) => (
              <tr key={c.id} className="hover:bg-civic-50/40">
                <td className="px-4 py-3">
                  <Link
                    to={`/dashboard/complaints/${c.complaintId}`}
                    className="font-mono font-semibold text-civic-700 hover:underline"
                  >
                    {c.complaintId}
                  </Link>
                  {c.isDemo && (
                    <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold uppercase text-slate-400">
                      demo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.category.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-slate-600">{c.district ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{c.departmentName ?? 'Unrouted'}</td>
                <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No complaints match these filters.
                </td>
              </tr>
            )}
            {!data && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setParam('page', String(page - 1))}
          >
            Previous
          </button>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setParam('page', String(page + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
