import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-civic-700 text-xs font-black text-white">
              CC
            </span>
            CivicConnect AI
          </div>
          <p className="mt-3 text-sm text-slate-500">
            A multilingual citizen grievance platform for Karnataka. Report in
            Kannada, English or Hindi — track it to resolution.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Citizens</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link className="hover:text-civic-600" to="/chat">Report an issue</Link></li>
            <li><Link className="hover:text-civic-600" to="/track">Track a complaint</Link></li>
            <li><Link className="hover:text-civic-600" to="/register">Create an account</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Departments</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link className="hover:text-civic-600" to="/login">Officer sign in</Link></li>
            <li><Link className="hover:text-civic-600" to="/dashboard">Dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        CivicConnect AI · Not affiliated with any government body · For emergencies call{' '}
        <span className="font-bold text-slate-600">112</span>
      </div>
    </footer>
  );
}
