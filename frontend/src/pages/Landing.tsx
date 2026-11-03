/** Landing page — 13 sections:
 *  1 Hero · 2 Live stats · 3 How it works · 4 Languages · 5 AI assistant
 *  6 Categories · 7 Coverage map · 8 Track CTA · 9 For departments
 *  10 Trust & transparency · 11 Department network
 *  13 Final CTA */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  FileCheck2,
  Globe2,
  Languages,
  Lock,
  MapPin,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Siren,
  Timer,
} from 'lucide-react';
import { apiGet } from '../lib/api';
import { useI18n } from '../lib/i18n';
import MapPanel from '../components/MapPanel';
import type { Category, Department, MapPoint, PublicStats } from '../lib/types';

const STEPS = [
  { icon: MessageSquareText, title: 'Describe it', body: 'Talk to the assistant in Kannada, English or Hindi — type or paste your problem.' },
  { icon: Bot, title: 'AI understands', body: 'Language, category, location and priority are extracted; the right department is recommended.' },
  { icon: FileCheck2, title: 'You confirm', body: 'Nothing is registered until you explicitly approve the summary. One question at a time.' },
  { icon: SearchCheck, title: 'Track to resolution', body: 'Get a CCAI ID and a private tracking token. Follow every public update.' },
];

const LANG_SAMPLES = [
  { code: 'ಕನ್ನಡ', text: 'ನನ್ನ ಬೀದಿಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ, ಬೈಕ್ ಬಿದ್ದುಕೊಳ್ಳುತ್ತಿದೆ.' },
  { code: 'English', text: 'There is a huge pothole on my street, bikes are falling.' },
  { code: 'हिंदी', text: 'मेरी गली में बड़ा गड्ढा है, बाइक गिर रही हैं।' },
];

const TRUST = [
  { icon: Lock, title: 'No enumeration', body: 'Tracking returns an identical 404 for a wrong ID or wrong token — you can never probe for other complaints.' },
  { icon: ShieldCheck, title: 'Role-scoped access', body: 'Officers only ever see their own department’s complaints. Enforcement is server-side, not UI-side.' },
  { icon: Sparkles, title: 'Honest AI labeling', body: 'Every response states its real provider — demo engine or cloud LLM. We never fake “AI-powered” claims.' },
  { icon: Timer, title: 'Automatic escalation', body: 'Rules escalate complaints that sit too long, with notifications and a full audit trail.' },
];


export default function Landing() {
  const { t } = useI18n();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);

  useEffect(() => {
    apiGet<PublicStats>('/stats').then(setStats).catch(() => undefined);
    apiGet<{ items: Category[] }>('/categories')
      .then((r) => setCategories(r.items.filter((c) => c.active)))
      .catch(() => undefined);
    apiGet<{ items: Department[] }>('/departments')
      .then((r) => setDepartments(r.items))
      .catch(() => undefined);
    apiGet<{ points: MapPoint[] }>('/map/points', { scope: 'public' })
      .then((r) => setPoints(r.points))
      .catch(() => undefined);
  }, []);

  return (
    <div>
      {/* 1 — Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-civic-950 via-civic-900 to-civic-800 text-white">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-saffron-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-civic-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <Siren size={13} className="text-saffron-400" />
              Karnataka civic grievance platform
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
              {t('hero.tagline')}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-civic-100">{t('hero.sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/chat" className="btn bg-white px-6 py-3 text-base text-civic-800 hover:bg-civic-50">
                {t('hero.ctaChat')} <ArrowRight size={17} />
              </Link>
              <Link
                to="/track"
                className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10"
              >
                {t('hero.ctaTrack')}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-civic-200">
              {['ಕನ್ನಡ', 'English', 'हिंदी'].map((l) => (
                <span key={l} className="flex items-center gap-1.5">
                  <Globe2 size={14} /> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Live stats */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
          {[
            { label: 'Complaints registered', value: stats?.totalComplaints },
            { label: 'Resolved', value: stats?.resolvedComplaints },
            { label: 'Active departments', value: stats?.activeDepartments },
            { label: 'Districts covered', value: stats?.districtsCovered },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-black text-civic-700 sm:text-4xl">
                {s.value ?? '—'}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
        {stats?.lastUpdated && (
          <p className="pb-4 text-center text-xs text-slate-400">
            Figures computed live · last updated{' '}
            {new Date(stats.lastUpdated).toLocaleString()}
          </p>
        )}
      </section>

      {/* 3 — How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="section-title text-center">How it works</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Four steps from problem to resolution — with you in control the whole way.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card relative p-6">
              <span className="absolute right-4 top-4 text-4xl font-black text-slate-100">
                {i + 1}
              </span>
              <s.icon size={26} className="text-civic-600" />
              <h3 className="mt-3 font-bold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — Languages */}
      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-civic-600">
                <Languages size={15} /> Your language
              </span>
              <h2 className="section-title mt-3">Speak to your city in your own language</h2>
              <p className="mt-4 text-slate-600">
                The assistant detects Kannada, English or Hindi automatically and replies in the
                language you used — including the follow-up questions, the confirmation summary
                and every category label.
              </p>
              <Link to="/chat" className="btn-primary mt-6">
                Try it now <ArrowRight size={16} />
              </Link>
            </div>
            <div className="space-y-3">
              {LANG_SAMPLES.map((s) => (
                <div key={s.code} className="card p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-civic-600">
                    {s.code}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5 — AI assistant */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <span className="text-sm font-semibold text-slate-700">
                CivicConnect Assistant
              </span>
              <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-500">
                AI: demo
              </span>
            </div>
            <div className="space-y-3 p-4">
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-civic-600 px-4 py-2 text-sm text-white">
                ನನ್ನ ಏರಿಯಾದಲ್ಲಿ ನೀರಿನ ಸಮಸ್ಯೆ ಇದೆ
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2 text-sm text-slate-800">
                ಖಚಿತವಾಗಿ. ಯಾವ ಜಿಲ್ಲೆಯಲ್ಲಿ ಈ ಸಮಸ್ಯೆ ಇದೆ?
              </div>
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-civic-600 px-4 py-2 text-sm text-white">
                ಮೈಸೂರು
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2 text-sm text-slate-800">
                ಒಂದು ಪ್ರಶ್ನೆ ಒಂದೊಂದಾಗಿ ಕೇಳುತ್ತೇನೆ. ನಿಮ್ಮ ದೂರನ್ನು ನೋಂದಾಯಿಸಲು ನೀವು
                ದೃಢೀಕರಿಸಬೇಕು — ಈಗ ಯಾವುದೂ ನೋಂದಾಯಿಸಲಾಗಿಲ್ಲ.
              </div>
            </div>
          </div>
          <div>
            <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-civic-600">
              <Bot size={15} /> The assistant
            </span>
            <h2 className="section-title mt-3">One question. One turn. Your confirmation.</h2>
            <ul className="mt-5 space-y-3">
              {[
                'Ask exactly one follow-up question per turn — no wall of questions.',
                'Nothing is registered until you press “Yes, register it”.',
                'Low-confidence classifications go to a human triage queue, not a wrong department.',
                'Emergencies interrupt the flow with “call 112” and never claim dispatch.',
                'Responses honestly label the provider: demo engine or cloud LLM.',
              ].map((f) => (
                <li key={f} className="flex gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/chat" className="btn-primary mt-6">
              Open the assistant <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 6 — Categories */}
      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="section-title text-center">15 categories, fully routed</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            From potholes to public health — every category has trilingual labels and an owning
            department.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(categories.length ? categories : []).map((c) => (
              <div
                key={c.key}
                className="card px-3 py-3.5 text-center transition hover:-translate-y-0.5 hover:border-civic-300"
              >
                <p className="text-xs font-bold text-slate-800">{c.label.en}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500" title={c.label.kn}>
                  {c.label.kn}
                </p>
                <p className="truncate text-[11px] text-slate-400" title={c.label.hi}>
                  {c.label.hi}
                </p>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-slate-400">
                Loading categories…
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 7 — Coverage map */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-civic-600">
              <MapPin size={15} /> Coverage
            </span>
            <h2 className="section-title mt-3">Complaints across Karnataka</h2>
            <p className="mt-2 max-w-xl text-slate-600">
              District-level aggregation only — no citizen-identifying data is ever plotted.
            </p>
          </div>
          <div className="flex gap-3 text-xs font-semibold">
            {[
              { c: 'bg-sky-500', l: 'Medium' },
              { c: 'bg-amber-500', l: 'High' },
              { c: 'bg-red-600', l: 'Critical' },
              { c: 'bg-slate-500', l: 'Low' },
            ].map((k) => (
              <span key={k.l} className="flex items-center gap-1.5 text-slate-600">
                <span className={`h-2.5 w-2.5 rounded-full ${k.c}`} /> {k.l}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <MapPanel points={points} height={440} />
        </div>
      </section>

      {/* 8 — Track CTA */}
      <section className="bg-civic-900 py-14 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 sm:px-6">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Have a tracking token?</h2>
            <p className="mt-2 max-w-xl text-civic-200">
              Enter your CCAI complaint ID and private token to see the live status, department
              and every public update.
            </p>
          </div>
          <Link
            to="/track"
            className="btn bg-white px-6 py-3 text-base text-civic-800 hover:bg-civic-50"
          >
            Track a complaint <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* 9 — For departments */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-civic-600">
              <BarChart3 size={15} /> For departments
            </span>
            <h2 className="section-title mt-3">A dashboard that works the queue</h2>
            <p className="mt-4 text-slate-600">
              Officers get a role-scoped queue; admins get analytics, assignments, escalation
              rules and a complete audit log.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                'Recharts analytics',
                'Live Leaflet map',
                'Status workflow',
                'Duplicate linking',
                'Officer management',
                'Escalation rules',
              ].map((f) => (
                <span
                  key={f}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-600"
                >
                  {f}
                </span>
              ))}
            </div>
            <Link to="/login" className="btn-primary mt-6">
              Officer sign in <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: 'Resolution rate', v: stats ? `${Math.round((stats.resolvedComplaints / Math.max(1, stats.totalComplaints)) * 100)}%` : '—' },
              { k: 'Departments live', v: stats?.activeDepartments ?? '—' },
              { k: 'Districts', v: stats?.districtsCovered ?? '—' },
              { k: 'Categories', v: categories.length || '15' },
            ].map((m) => (
              <div key={m.k} className="card p-5 text-center">
                <p className="text-3xl font-black text-civic-700">{m.v}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {m.k}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10 — Trust */}
      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="section-title text-center">Built on honest, secure foundations</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((f) => (
              <div key={f.title} className="card p-6">
                <f.icon size={24} className="text-civic-600" />
                <h3 className="mt-3 font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11 — Department network */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="section-title text-center">The department network</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Municipal corporations, utility boards, PWD, health and transport — {departments.length}{' '}
          active departments receive routed complaints.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {departments.slice(0, 12).map((d) => (
            <div key={d.id} className="card px-4 py-3.5">
              <p className="truncate text-sm font-bold text-slate-800" title={d.name}>
                {d.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {d.code}
                {typeof d.complaintCount === 'number' ? ` · ${d.complaintCount} complaints` : ''}
              </p>
            </div>
          ))}
          {departments.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-slate-400">
              Loading departments…
            </p>
          )}
        </div>
      </section>

      {/* 12 — Final CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-civic-700 to-civic-900 py-16 text-white">
        <div className="absolute -right-10 top-0 h-56 w-56 rounded-full bg-saffron-400/20 blur-2xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-black sm:text-4xl">{t('hero.tagline')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-civic-100">
            Report your first civic issue in under a minute — no account needed.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/chat"
              className="btn bg-white px-6 py-3 text-base text-civic-800 hover:bg-civic-50"
            >
              {t('hero.ctaChat')} <ArrowRight size={17} />
            </Link>
            <Link
              to="/register"
              className="btn border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10"
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
