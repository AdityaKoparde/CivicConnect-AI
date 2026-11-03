/** Officer account management (department admins + super admins). */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiGet, apiPatch, apiPost, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { Department, Role } from '../../lib/types';

interface OfficerRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  departmentId: string | null;
  departmentName: string | null;
  jurisdictionName: string | null;
  createdAt: string;
}

export default function Officers() {
  const { user } = useAuth();
  const [items, setItems] = useState<OfficerRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DEPARTMENT_OFFICER' as Role,
    departmentId: '',
  });

  const load = useCallback(() => {
    apiGet<{ items: OfficerRow[] }>('/admin/officers')
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    apiGet<{ items: Department[] }>('/departments')
      .then((r) => setDepartments(r.items))
      .catch(() => undefined);
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await apiPost('/admin/officers', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.departmentId ? { departmentId: form.departmentId } : {}),
      });
      setFlash(`Account created for ${form.email}.`);
      setForm({ name: '', email: '', password: '', role: 'DEPARTMENT_OFFICER', departmentId: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row: OfficerRow) => {
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/admin/officers/${row.id}`, { isActive: !row.isActive });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  const isSuper = user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Officers</h1>
        <p className="text-sm text-slate-500">
          {isSuper ? 'All departments' : user?.departmentName} · {items.length} accounts
        </p>
      </div>

      {flash && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{flash}</p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{error}</p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-800">Accounts</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-800">{o.name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{o.email}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">
                      {o.role.replace('DEPARTMENT_', '').replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{o.departmentName ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          o.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {o.isActive ? 'active' : 'disabled'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={busy || o.id === user?.id}
                        onClick={() => void toggleActive(o)}
                        className="text-xs font-semibold text-civic-600 hover:underline disabled:opacity-40"
                      >
                        {o.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                      No officer accounts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card h-fit p-5">
          <h2 className="text-sm font-bold text-slate-800">Create account</h2>
          <form className="mt-3 space-y-3" onSubmit={create}>
            <input
              className="input"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Password (min 8)"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
            >
              <option value="DEPARTMENT_OFFICER">Officer</option>
              <option value="DEPARTMENT_ADMIN">Department admin</option>
            </select>
            <select
              className="input"
              value={form.departmentId}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
              required={isSuper}
            >
              <option value="">Department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
