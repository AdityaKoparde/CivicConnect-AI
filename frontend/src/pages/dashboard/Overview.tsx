/** Staff overview: KPI cards + Recharts analytics + Leaflet complaint map.
 *  Data comes from GET /api/admin/stats and GET /api/map/points?scope=admin,
 *  both role-scoped on the server. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiGet } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import MapPanel from '../../components/MapPanel';
import type { AdminStats, MapPoint } from '../../lib/types';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#0ea5e9',
  HIGH: '#f59e0b',
  CRITICAL: '#dc2626',
};

const STATUS_COLORS = ['#64748b', '#0ea5e9', '#6366f1', '#f59e0b', '#f97316', '#10b981', '#f43f5e', '#ef4444'];

export default function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<AdminStats>('/admin/stats')
      .then(setStats)
      .catch((e: Error) => setError(e.message));
    apiGet<{ points: MapPoint[] }>('/map/points', { scope: 'admin' })
      .then((r) => setPoints(r.points))
      .catch(() => undefined);
  }, []);

  if (error) {
    return (
      <div className="card p-6 text-sm text-red-700" role="alert">
        {error}
      </div>
    );
  }
  if (!stats) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading analytics…</p>;
  }

  const o = stats.overview;
  const kpis = [
    { label: 'Total', value: o.total, tone: 'text-slate-900' },
    { label: 'New (24h)', value: o.newLast24h, tone: 'text-civic-700' },
    { label: 'Pending', value: o.pending, tone: 'text-amber-600' },
    { label: 'In progress', value: o.inProgress, tone: 'text-indigo-600' },
    { label: 'Resolved', value: o.resolved, tone: 'text-emerald-600' },
    { label: 'Escalated', value: o.escalated, tone: 'text-red-600' },
    { label: 'Critical', value: o.critical, tone: 'text-red-700' },
    { label: 'Awaiting citizen', value: o.awaitingCitizen, tone: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500">
            {user?.departmentName ?? 'All departments'} · role-scoped analytics
            {stats.isDemoData ? ' · demo data' : ''}
          </p>
        </div>
        <Link to="/dashboard/complaints" className="btn-primary">
          Open queue
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {kpis.map((k) => (
          <div key={k.label} className="card px-3 py-3.5 text-center">
            <p className={`text-2xl font-black ${k.tone}`}>{k.value}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {k.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Complaints by category */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-800">Complaints by category</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byCategory} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={130}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  formatter={(v: number) => [v, 'Complaints']}
                />
                <Bar dataKey="count" fill="#1b5ff5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority distribution */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-800">Priority distribution</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.priorityDistribution}
                  dataKey="count"
                  nameKey="priority"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {stats.priorityDistribution.map((p) => (
                    <Cell key={p.priority} fill={PRIORITY_COLORS[p.priority] ?? '#64748b'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number, n: string) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly trend */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-800">Monthly volume vs resolution</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthly} margin={{ left: -18, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#1b5ff5" strokeWidth={2} dot={false} name="Registered" />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={false} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending trend */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-800">
            Pending backlog · resolution rate{' '}
            <span className="text-civic-600">{Math.round(stats.resolutionRate * 100)}%</span>
          </h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.pendingTrend} margin={{ left: -18, right: 8 }}>
                <defs>
                  <linearGradient id="pendingFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1b5ff5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1b5ff5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="pending" stroke="#1b5ff5" fill="url(#pendingFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department + district breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-800">By department</h2>
          <ul className="mt-3 space-y-2">
            {stats.byDepartment.slice(0, 8).map((d, i) => {
              const max = Math.max(...stats.byDepartment.map((x) => x.count), 1);
              return (
                <li key={d.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate pr-2 font-medium text-slate-700">{d.name}</span>
                    <span className="font-bold text-slate-500">{d.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(d.count / max) * 100}%`,
                        backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length],
                      }}
                    />
                  </div>
                </li>
              );
            })}
            {stats.byDepartment.length === 0 && (
              <li className="py-4 text-center text-sm text-slate-400">No data yet.</li>
            )}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-bold text-slate-800">By district</h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byDistrict} margin={{ left: -18, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="district" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#144ae1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Complaint map (your scope)</h2>
          <span className="text-xs text-slate-400">{points.length} points</span>
        </div>
        <div className="mt-4">
          <MapPanel points={points} height={400} />
        </div>
      </div>
    </div>
  );
}
