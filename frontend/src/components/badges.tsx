/** Status / priority badges shared across list and detail views. */
import type { ComplaintStatus, Priority } from '../lib/types';

const STATUS_STYLE: Record<ComplaintStatus, string> = {
  SUBMITTED: 'bg-slate-100 text-slate-700',
  ACKNOWLEDGED: 'bg-sky-50 text-sky-700',
  ASSIGNED: 'bg-indigo-50 text-indigo-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-800',
  AWAITING_CITIZEN_INFO: 'bg-orange-50 text-orange-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-rose-50 text-rose-700',
  ESCALATED: 'bg-red-50 text-red-700',
};

const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-sky-50 text-sky-700',
  HIGH: 'bg-amber-50 text-amber-800',
  CRITICAL: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[priority] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {priority}
    </span>
  );
}
