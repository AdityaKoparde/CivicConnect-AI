/** Staff/citizen dashboard shell: role-aware sidebar + routed content. */
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, ClipboardList, ScrollText, Users } from 'lucide-react';
import { useAuth, isStaffRole } from '../../lib/auth';

export default function DashboardLayout() {
  const { user } = useAuth();
  if (!user) return null;
  const staff = isStaffRole(user.role);

  const links = [
    ...(staff
      ? [
          { to: '/dashboard', label: 'Overview', icon: BarChart3, end: true },
          { to: '/dashboard/complaints', label: 'Complaints', icon: ClipboardList, end: false },
        ]
      : []),
    ...(user.role === 'SUPER_ADMIN' || user.role === 'DEPARTMENT_ADMIN'
      ? [{ to: '/dashboard/officers', label: 'Officers', icon: Users, end: false }]
      : []),
    ...(user.role === 'SUPER_ADMIN'
      ? [{ to: '/dashboard/audit', label: 'Audit log', icon: ScrollText, end: false }]
      : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="card p-4">
          <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <p className="mt-2 inline-block rounded bg-civic-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-civic-700">
            {user.role.replace('DEPARTMENT_', '').replace('_', ' ')}
          </p>
          {user.departmentName && (
            <p className="mt-1.5 text-xs text-slate-500">{user.departmentName}</p>
          )}
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto lg:flex-col">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-civic-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <l.icon size={16} />
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
