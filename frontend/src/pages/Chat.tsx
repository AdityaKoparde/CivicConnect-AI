/** Multilingual chatbot UI.
 *  - guest session = httpOnly cookie set by the server on first conversation
 *  - conversation id kept in sessionStorage → reload restores the transcript
 *    (messages are re-fetched from GET /api/chat/conversations/:id)
 *  - registration happens ONLY after the explicit confirm call
 *  - the tracking token is displayed exactly once, after confirmation */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Copy, Check, MessageSquarePlus, Send, ShieldCheck } from 'lucide-react';
import { apiGet, apiPost, ApiError } from '../lib/api';
import { useI18n, type Lang } from '../lib/i18n';
import type { ChatMessage, ChatResponse, ConfirmResponse, Conversation } from '../lib/types';

const CONV_KEY = 'ccai_conv_id';

const LANG_LABELS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'हिंदी' },
];

interface PendingConfirmation {
  summary: string;
}

export default function Chat() {
  const { lang, setLang, t } = useI18n();
  const [convId, setConvId] = useState<string | null>(
    () => sessionStorage.getItem(CONV_KEY),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(sessionStorage.getItem(CONV_KEY)));
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [registered, setRegistered] = useState<ConfirmResponse | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [emergency, setEmergency] = useState<{ isEmergency: boolean; guidance: string | null; callNumber: string } | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** Restore transcript after reload — state lives on the server. */
  useEffect(() => {
    const id = sessionStorage.getItem(CONV_KEY);
    if (!id) return;
    let alive = true;
    apiGet<{ conversation: Conversation; messages: ChatMessage[] }>(`/chat/conversations/${id}`)
      .then((res) => {
        if (!alive) return;
        setMessages(res.messages);
        setConvId(res.conversation.id);
        if (res.conversation.status !== 'ACTIVE') {
          setPending(null);
        }
      })
      .catch(() => {
        sessionStorage.removeItem(CONV_KEY);
        if (alive) setConvId(null);
      })
      .finally(() => {
        if (alive) setRestoring(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy, pending, registered]);

  const startNew = useCallback(() => {
    sessionStorage.removeItem(CONV_KEY);
    setConvId(null);
    setMessages([]);
    setPending(null);
    setRegistered(null);
    setEmergency(null);
    setSuggested([]);
    setProvider(null);
    setError(null);
  }, []);

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || busy) return;
      setError(null);
      setBusy(true);
      setInput('');
      setSuggested([]);
      try {
        let id = convId;
        if (!id) {
          const created = await apiPost<{ conversation: Conversation }>('/chat/conversations', {
            language: lang,
          });
          id = created.conversation.id;
          sessionStorage.setItem(CONV_KEY, id);
          setConvId(id);
        }
        const res = await apiPost<ChatResponse>(`/chat/conversations/${id}/messages`, {
          content: text,
          language: lang,
        });
        setMessages((prev) => [...prev, res.userMessage, res.assistantMessage]);
        setPending(res.needsConfirmation && res.confirmationSummary ? { summary: res.confirmationSummary } : null);
        setSuggested(res.suggestedReplies ?? []);
        setEmergency(res.emergency);
        setProvider(res.aiProvider);
        setRegistered(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Message failed to send. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [convId, busy, lang],
  );

  const confirm = useCallback(
    async (accept: boolean) => {
      if (!convId) return;
      setBusy(true);
      setError(null);
      try {
        const res = await apiPost<ConfirmResponse | { conversation: Conversation }>(
          `/chat/conversations/${convId}/confirm`,
          { confirm: accept },
        );
        if ('trackingToken' in res) {
          setRegistered(res);
          setPending(null);
          setMessages((prev) => [
            ...prev,
            {
              id: `local-${Date.now()}`,
              role: 'assistant',
              content: `${t('chat.registered')} ${res.complaint.complaintId} — ${res.complaint.departmentName}. ${t('chat.tokenOnce')}`,
              language: lang,
              createdAt: new Date().toISOString(),
            },
          ]);
        } else {
          // bot re-opens editing
          setPending(null);
          const follow = await apiPost<ChatResponse>(`/chat/conversations/${convId}/messages`, {
            content: 'I want to edit my complaint details',
            language: lang,
          });
          setMessages((prev) => [...prev, follow.userMessage, follow.assistantMessage]);
          setSuggested(follow.suggestedReplies ?? []);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Confirmation failed. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [convId, lang, t],
  );

  const copyToken = async () => {
    if (!registered) return;
    try {
      await navigator.clipboard.writeText(registered.trackingToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — token stays visible for manual copy */
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 pt-6 sm:px-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-civic-600 text-white">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h1 className="text-base font-bold text-slate-900">{t('chat.title')}</h1>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              {provider && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-500">
                  AI: {provider}
                </span>
              )}
              one question at a time · your language
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Chat language"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            {LANG_LABELS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={startNew} className="btn-secondary !px-3 !py-1.5 !text-xs">
            <MessageSquarePlus size={14} />
            {t('chat.new')}
          </button>
        </div>
      </div>

      {/* emergency banner */}
      {emergency?.isEmergency && (
        <div className="mb-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-800">
            <span className="font-bold">Emergency:</span> please call{' '}
            <span className="font-black">{emergency.callNumber}</span> immediately.
            {emergency.guidance ? ` ${emergency.guidance}` : ''} This app does not dispatch
            emergency services.
          </p>
        </div>
      )}

      {/* transcript */}
      <div className="card flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {restoring && (
          <p className="py-10 text-center text-sm text-slate-400">{t('common.loading')}</p>
        )}
        {!restoring && messages.length === 0 && !busy && (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              ನಮಸ್ಕಾರ! Hello! नमस्ते!
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Describe a civic problem — potholes, water supply, streetlights, garbage — in
              Kannada, English or Hindi. I will ask one question at a time and register your
              complaint only after you confirm.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                'Huge pothole on my street, bikes are falling',
                'ನನ್ನ ಏರಿಯಾದಲ್ಲಿ ನೀರಿನ ಸಮಸ್ಯೆ ಇದೆ',
                'मेरेइलाके में बिजली की समस्या है',
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:border-civic-300 hover:text-civic-700"
                  onClick={() => void send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'rounded-br-md bg-civic-600 text-white'
                    : 'rounded-bl-md bg-slate-100 text-slate-800'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
                {t('chat.loading')}
              </div>
            </div>
          )}
        </div>

        {/* explicit confirmation gate */}
        {pending && !busy && (
          <div className="mt-4 rounded-xl border-2 border-dashed border-civic-300 bg-civic-50/60 p-4">
            <p className="text-sm font-bold text-slate-800">{t('chat.confirmTitle')}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">{pending.summary}</p>
            <p className="mt-2 text-xs text-slate-500">
              Nothing has been registered yet — confirm to create the complaint.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn-primary !py-1.5 !text-xs"
                disabled={busy}
                onClick={() => void confirm(true)}
              >
                {t('chat.confirmYes')}
              </button>
              <button
                type="button"
                className="btn-secondary !py-1.5 !text-xs"
                disabled={busy}
                onClick={() => void confirm(false)}
              >
                {t('chat.confirmNo')}
              </button>
            </div>
          </div>
        )}

        {/* registration result — token shown exactly once */}
        {registered && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">
              ✓ {t('chat.registered')} {registered.complaint.complaintId}
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Routed to <strong>{registered.complaint.departmentName}</strong> (
              {registered.complaint.departmentCode})
            </p>
            <div className="mt-3 rounded-lg bg-white px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tracking token — {t('chat.tokenOnce')}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all font-mono text-sm text-slate-800">
                  {registered.trackingToken}
                </code>
                <button
                  type="button"
                  onClick={() => void copyToken()}
                  className="btn-secondary !px-2.5 !py-1 !text-xs"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? t('chat.copied') : t('chat.copy')}
                </button>
              </div>
            </div>
            <div className="mt-3 flex gap-3 text-sm">
              <Link
                to={`/track?complaintId=${registered.complaint.complaintId}`}
                className="font-medium text-emerald-700 underline"
              >
                Track this complaint →
              </Link>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="mt-3 pb-6">
        {suggested.length > 0 && !pending && (
          <div className="mb-2 flex flex-wrap gap-2">
            {suggested.map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-full border border-civic-200 bg-civic-50 px-3 py-1.5 text-xs font-medium text-civic-700 hover:bg-civic-100"
                onClick={() => void send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            className="input flex-1"
            placeholder={t('chat.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={4000}
            disabled={busy || Boolean(registered)}
          />
          <button
            type="submit"
            disabled={busy || !input.trim() || Boolean(registered)}
            className="btn-primary"
            aria-label={t('chat.send')}
          >
            <Send size={16} />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[11px] text-slate-400">
          Emergencies: call 112. This assistant never claims dispatch or official government
          submission.
        </p>
      </div>
    </div>
  );
}
