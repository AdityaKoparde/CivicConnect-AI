/** Complaint detail: full record, timeline, and role-scoped workflow actions
 *  (status transitions, updates, assignment, duplicate link). The server
 *  re-validates every action — the UI only offers what the role allows. */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, GitBranch, PlusCircle, RefreshCw } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiError } from '../../lib/api';
import { useAuth, isStaffRole } from '../../lib/auth';
import { PriorityBadge, StatusBadge } from '../../components/badges';
import type {
  ComplaintDetail as Detail,
  ComplaintStatus,
  ComplaintUpdate,
  Department,
} from '../../lib/types';

/** Mirrors backend STATUS_TRANSITIONS (server is authoritative). */
const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'REJECTED', 'ESCALATED'],
  ACKNOWLEDGED: ['ASSIGNED', 'IN_PROGRESS', 'AWAITING_CITIZEN_INFO', 'REJECTED', 'ESCALATED'],
  ASSIGNED: ['ACKNOWLEDGED', 'IN_PROGRESS', 'AWAITING_CITIZEN_INFO', 'REJECTED', 'ESCALATED'],
  IN_PROGRESS: ['AWAITING_CITIZEN_INFO', 'RESOLVED', 'REJECTED', 'ESCALATED'],
  AWAITING_CITIZEN_INFO: ['IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED'],
  ESCALATED: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'AWAITING_CITIZEN_INFO'],
  RESOLVED: ['ESCALATED'],
  REJECTED: [],
};

const UPDATE_KINDS = ['NOTE', 'INFO_REQUEST', 'RESOLUTION', 'ESCALATION'] as const;

interface OfficerOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ComplaintDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<{ complaint: Detail; updates: ComplaintUpdate[]; assignments: unknown[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [note, setNote] = useState('');
  const [kind, setKind] = useState<(typeof UPDATE_KINDS)[number]>('NOTE');
  const [resolutionNote, setResolutionNote] = useState('');
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<OfficerOption[]>([]);
  const [assignDept, setAssignDept] = useState('');
  const [assignOfficer, setAssignOfficer] = useState('');
  const [dupOf, setDupOf] = useState('');

  const staff = Boolean(user && isStaffRole(user.role));
  const canAssign = user?.role === 'SUPER_ADMIN' || user?.role === 'DEPARTMENT_ADMIN';

  const load = useCallback(() => {
    apiGet<{ complaint: Detail; updates: ComplaintUpdate[]; assignments: unknown[] }>(
      `/complaints/${id}`,
    )
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canAssign) return;
    apiGet<{ items: Department[] }>('/departments')
      .then((r) => setDepartments(r.items))
      .catch(() => undefined);
    apiGet<{ items: OfficerOption[] }>('/admin/officers')
      .then((r) => setOfficers(r.items))
      .catch(() => undefined);
  }, [canAssign]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await fn();
      setFlash(okMsg);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
        <Link to="/dashboard/complaints" className="btn-secondary">
          <ArrowLeft size={15} /> Back to queue
        </Link>
      </div>
    );
  }
  if (!data) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading complaint…</p>;
  }

  const c = data.complaint;
  const nextStatuses = TRANSITIONS[c.status] ?? [];

  const submitUpdate = (e: FormEvent) => {
    e.preventDefault();
    void run(
      () =>
        apiPost(`/complaints/${c.complaintId}/updates`, {
          kind,
          note: note.trim(),
          ...(kind === 'RESOLUTION' ? { resolutionNote: resolutionNote.trim() || note.trim() } : {}),
        }),
      'Update added.',
    ).then(() => {
      setNote('');
      setResolutionNote('');
      setKind('NOTE');
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/dashboard/complaints"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-civic-600"
          >
            <ArrowLeft size={13} /> Back to queue
          </Link>
          <h1 className="font-mono text-2xl font-bold text-slate-900">{c.complaintId}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            <PriorityBadge priority={c.priority} />
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {c.category.replace(/_/g, ' ')}
            </span>
            {c.emergency && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                EMERGENCY
              </span>
            )}
            {c.requiresManualReview && (
              <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                TRIAGE REVIEW
              </span>
            )}
            {c.isDemo && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-400">
                demo
              </span>
            )}
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={load}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {flash && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700" role="status">
          {flash}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* main column */}
        <div className="space-y-5 lg:col-span-2">
          <div className="card p-5">
            <h2 className="text-sm font-bold text-slate-800">Complaint text</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {c.originalText}
            </p>
            {c.summary && c.summary !== c.originalText && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span className="font-semibold">AI summary:</span> {c.summary}
              </p>
            )}
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="inline font-semibold text-slate-600">Citizen: </dt>
                <dd className="inline text-slate-700">{c.citizenName ?? '—'}</dd></div>
              <div><dt className="inline font-semibold text-slate-600">Language: </dt>
                <dd className="inline text-slate-700">{c.language ?? '—'}</dd></div>
              <div><dt className="inline font-semibold text-slate-600">District: </dt>
                <dd className="inline text-slate-700">{c.district ?? '—'}{c.city ? `, ${c.city}` : ''}</dd></div>
              <div><dt className="inline font-semibold text-slate-600">Landmark: </dt>
                <dd className="inline text-slate-700">{c.landmark ?? '—'}</dd></div>
              <div><dt className="inline font-semibold text-slate-600">Department: </dt>
                <dd className="inline text-slate-700">{c.departmentName ?? 'Unrouted'}</dd></div>
              <div><dt className="inline font-semibold text-slate-600">Filed: </dt>
                <dd className="inline text-slate-700">{new Date(c.createdAt).toLocaleString()}</dd></div>
            </dl>
          </div>

          {(c.aiReasoning || c.routingExplanation) && (
            <div className="card p-5">
              <h2 className="text-sm font-bold text-slate-800">
                AI routing{' '}
                <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-500">
                  {c.aiProvider ?? 'demo'}
                </span>
                {typeof c.aiConfidence === 'number' && (
                  <span className="ml-1 text-xs font-medium text-slate-400">
                    confidence {(c.aiConfidence * 100).toFixed(0)}%
                  </span>
                )}
              </h2>
              {c.routingExplanation && (
                <p className="mt-2 text-sm text-slate-600">{c.routingExplanation}</p>
              )}
              {c.aiReasoning && (
                <p className="mt-2 text-sm text-slate-500">{c.aiReasoning}</p>
              )}
            </div>
          )}

          {/* timeline */}
          <div className="card p-5">
            <h2 className="text-sm font-bold text-slate-800">Updates & history</h2>
            <ol className="mt-4 space-y-4">
              {data.updates.map((u) => (
                <li key={u.id} className="relative flex gap-3">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      u.isPublic === false ? 'bg-slate-400' : 'bg-civic-600'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {u.kind.replace(/_/g, ' ')}
                      {u.toStatus ? ` → ${u.toStatus.replace(/_/g, ' ')}` : ''}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {new Date(u.createdAt).toLocaleString()}
                        {u.isPublic === false ? ' · internal' : ''}
                      </span>
                    </p>
                    {u.note && <p className="mt-0.5 text-sm text-slate-600">{u.note}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">
                      {u.actorName ?? 'System'} {u.actorRole ? `(${u.actorRole})` : ''}
                    </p>
                  </div>
                </li>
              ))}
              {data.updates.length === 0 && (
                <li className="py-3 text-sm text-slate-400">No updates yet.</li>
              )}
            </ol>
          </div>
        </div>

        {/* actions column */}
        <div className="space-y-5">
          {staff && (
            <div className="card p-5">
              <h2 className="text-sm font-bold text-slate-800">Change status</h2>
              {nextStatuses.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  {c.status === 'REJECTED' ? 'Rejected — terminal state.' : 'No transitions available.'}
                </p>
              ) : (
                <form
                  className="mt-3 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!targetStatus) return;
                    void run(
                      () =>
                        apiPatch(`/complaints/${c.complaintId}/status`, {
                          status: targetStatus,
                          ...(statusNote.trim() ? { note: statusNote.trim() } : {}),
                        }),
                      `Status → ${targetStatus.replace(/_/g, ' ')}`,
                    ).then(() => {
                      setTargetStatus('');
                      setStatusNote('');
                    });
                  }}
                >
                  <select
                    className="input"
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as ComplaintStatus | '')}
                    required
                  >
                    <option value="">Select next status…</option>
                    {nextStatuses.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Public note (required for RESOLVED)"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                  <button type="submit" disabled={busy || !targetStatus} className="btn-primary w-full">
                    Apply transition
                  </button>
                </form>
              )}
            </div>
          )}

          {staff && (
            <div className="card p-5">
              <h2 className="text-sm font-bold text-slate-800">Add update</h2>
              <form className="mt-3 space-y-3" onSubmit={submitUpdate}>
                <select
                  className="input"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as (typeof UPDATE_KINDS)[number])}
                >
                  {UPDATE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k === 'NOTE' ? 'NOTE (internal)' : k.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                {kind === 'RESOLUTION' && (
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Resolution note (shown to citizen)"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    required
                  />
                )}
                <textarea
                  className="input"
                  rows={3}
                  placeholder={kind === 'NOTE' ? 'Internal note — hidden from tracking' : 'Public note'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  required
                />
                <button type="submit" disabled={busy} className="btn-secondary w-full">
                  <PlusCircle size={15} /> Post update
                </button>
              </form>
            </div>
          )}

          {canAssign && (
            <div className="card p-5">
              <h2 className="text-sm font-bold text-slate-800">Reassign</h2>
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(
                    () =>
                      apiPatch(`/complaints/${c.complaintId}/assign`, {
                        ...(assignDept ? { departmentId: assignDept } : {}),
                        ...(assignOfficer ? { officerId: assignOfficer } : {}),
                      }),
                    'Complaint reassigned.',
                  ).then(() => {
                    setAssignDept('');
                    setAssignOfficer('');
                  });
                }}
              >
                <select
                  className="input"
                  value={assignDept}
                  onChange={(e) => {
                    setAssignDept(e.target.value);
                    setAssignOfficer('');
                  }}
                >
                  <option value="">Department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <select
                  className="input"
                  value={assignOfficer}
                  onChange={(e) => setAssignOfficer(e.target.value)}
                >
                  <option value="">Officer (optional)…</option>
                  {officers
                    .filter((o) => !assignDept || o.role === 'DEPARTMENT_OFFICER')
                    .map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                </select>
                <button
                  type="submit"
                  disabled={busy || (!assignDept && !assignOfficer)}
                  className="btn-secondary w-full"
                >
                  Assign
                </button>
              </form>
            </div>
          )}

          {staff && (
            <div className="card p-5">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <GitBranch size={14} /> Link duplicate
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Links without deleting either report.
              </p>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(
                    () =>
                      apiPost(`/complaints/${c.complaintId}/duplicate`, {
                        duplicateOfId: dupOf.trim().toUpperCase(),
                      }),
                    'Duplicate linked.',
                  ).then(() => setDupOf(''));
                }}
              >
                <input
                  className="input !w-full font-mono"
                  placeholder="CCAI-2026-000042"
                  value={dupOf}
                  onChange={(e) => setDupOf(e.target.value)}
                  required
                />
                <button type="submit" disabled={busy} className="btn-secondary shrink-0">
                  Link
                </button>
              </form>
              {c.duplicateOfComplaintId && (
                <p className="mt-2 text-xs text-slate-500">
                  Linked to{' '}
                  <Link
                    to={`/dashboard/complaints/${c.duplicateOfComplaintId}`}
                    className="font-mono text-civic-600 hover:underline"
                  >
                    {c.duplicateOfComplaintId}
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className="card p-5 text-xs text-slate-500">
            <p>
              AI confidence:{' '}
              {typeof c.aiConfidence === 'number'
                ? `${(c.aiConfidence * 100).toFixed(0)}%`
                : '—'}
            </p>
            <p className="mt-1">
              Tracking token on file: {c.trackingHashPresent ? 'yes' : 'no'}
            </p>
            <p className="mt-1">
              Resolved at:{' '}
              {c.resolvedAt ? new Date(c.resolvedAt).toLocaleString() : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
