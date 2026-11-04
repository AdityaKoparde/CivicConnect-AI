/** Super-admin audit log (read-only, paginated). */
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import type { Paged } from '../../lib/types';

interface AuditRow {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export default function Audit() {
  const [data, setData] = useState<Paged<AuditRow> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Paged<AuditRow>>('/admin/audit', { page, limit: 25 })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500">
          {data ? `${data.total} events` : 'Loading…'} · every mutation is recorded
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{error}</p>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data?.items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-slate-700">{r.actorEmail ?? 'system'}</td>
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-civic-700">
                  {r.action}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">
                  {r.entityType}
                  {r.entityId ? ` · ${r.entityId.slice(0, 8)}…` : ''}
                </td>
                <td className="max-w-md truncate px-4 py-2.5 font-mono text-[11px] text-slate-500">
                  {r.metadata ? JSON.stringify(r.metadata) : '—'}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  No audit entries yet.
                </td>
              </tr>
            )}
            {!data && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
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
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-slate-500">Page {page} of {totalPages}</span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
