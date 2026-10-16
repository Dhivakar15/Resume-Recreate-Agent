'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, RotateCcw, SendHorizontal, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/client/api';
import { useResumesStore } from '@/stores/resumes-store';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Floating AI Resume Assistant — global chat widget mounted by AppShell.
 *
 * Closed: glowing violet/fuchsia bubble button (fixed bottom-right).
 * Open: dark-glass chat panel grounded in the user's most recently updated
 * resume (resumeId is resolved from the resumes store on mount). Replies come
 * from POST /api/ai/assistant via apiFetch; failures surface a toast plus an
 * inline error bubble with a Retry action that resends the last user message.
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  'Improve my summary',
  'What skills am I missing?',
  'Is my resume ATS-friendly?',
  'Generate interview questions',
] as const;

/** Client-side cap for sent history — stays under the API's 24-message limit. */
const MAX_SENT_HISTORY = 12;

const SCROLLBAR_CLASSES = '[scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]';

const ICON_BUTTON_CLASSES =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60';

// ─── Message bubbles ─────────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600/80 to-fuchsia-600/80 px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-lg shadow-violet-950/40"
    >
      <p className="whitespace-pre-line">{content}</p>
    </motion.div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.05] px-3.5 py-2.5 text-sm leading-relaxed text-slate-200"
    >
      <p className="whitespace-pre-line">{content}</p>
    </motion.div>
  );
}

function TypingBubble() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      aria-label="Assistant is typing"
      className="mr-auto flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.05] px-4 py-3"
    >
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-violet-300/90"
          animate={reduced ? undefined : { y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: dot * 0.15 }}
        />
      ))}
    </motion.div>
  );
}

function ErrorBubble({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md border border-rose-400/20 bg-rose-500/[0.08] px-3.5 py-2.5 text-sm leading-relaxed text-rose-200"
    >
      <p>Something went wrong — please try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-rose-300/25 bg-white/[0.05] px-2.5 text-xs font-medium text-rose-100 transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Retry
      </button>
    </motion.div>
  );
}

// ─── Widget ──────────────────────────────────────────────────────────────────

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [awaiting, setAwaiting] = useState(false);
  const [failed, setFailed] = useState(false);

  // Light store subscriptions only — actions/arrays, no deep selectors.
  const resumes = useResumesStore((s) => s.resumes);
  const fetchResumes = useResumesStore((s) => s.fetch);

  const reduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqIdRef = useRef(0);
  const resumeId = resumes[0]?.id;

  // Ground answers in the latest resume: fetch once on mount (fetch(!loaded)).
  useEffect(() => {
    void fetchResumes(!useResumesStore.getState().loaded);
  }, [fetchResumes]);

  // Escape closes the panel while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // AppShell's sidebar / top-bar "AI Assistant" buttons open the panel
  // by dispatching this custom window event.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('rra:assistant:open', onOpen);
    return () => window.removeEventListener('rra:assistant:open', onOpen);
  }, []);

  // Focus the composer when the panel opens.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Auto-scroll to the newest message / typing indicator.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, awaiting, failed, open]);

  async function requestReply(history: ChatMessage[]) {
    const reqId = ++reqIdRef.current;
    setAwaiting(true);
    setFailed(false);
    try {
      const data = await apiFetch<{ reply: string }>('/api/ai/assistant', {
        method: 'POST',
        json: { resumeId: resumeId ?? undefined, messages: history.slice(-MAX_SENT_HISTORY) },
      });
      if (reqIdRef.current !== reqId) return; // chat was cleared mid-flight
      setMessages([...history, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      if (reqIdRef.current !== reqId) return;
      toast.error((e as Error).message || 'The assistant is unavailable right now.');
      setFailed(true);
    } finally {
      setAwaiting(false);
    }
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || awaiting) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    void requestReply(next);
  }

  function clearChat() {
    reqIdRef.current += 1; // invalidate any in-flight reply
    setMessages([]);
    setFailed(false);
    toast.success('Chat cleared');
    inputRef.current?.focus();
  }

  return (
    <>
      {/*
        Floating trigger — kept mounted while open (visually hidden, unfocusable)
        so aria-expanded truthfully reflects the panel state.
      */}
      <motion.span
        aria-hidden={open}
        className="fixed bottom-5 right-5 z-40 block max-sm:bottom-4 max-sm:right-4"
        style={{ transformOrigin: 'bottom right' }}
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
      >
        <motion.button
          type="button"
          aria-label="Open AI assistant"
          aria-expanded={open}
          tabIndex={open ? -1 : 0}
          onClick={() => setOpen(true)}
          whileHover={reduced ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full text-white',
            'bg-gradient-to-br from-violet-600 to-fuchsia-600',
            'shadow-[0_0_30px_-6px_rgba(139,92,246,0.7)] transition-shadow hover:shadow-[0_0_38px_-4px_rgba(139,92,246,0.9)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04050d]',
            open && 'pointer-events-none opacity-0',
          )}
        >
          <motion.span
            aria-hidden
            className="flex"
            animate={reduced ? undefined : { y: [0, -4, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <MessageCircle className="h-6 w-6" />
          </motion.span>
        </motion.button>
      </motion.span>

      <AnimatePresence>
        {open && (
          <motion.div
            key="ai-assistant-panel"
            role="dialog"
            aria-label="AI Resume Assistant"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ transformOrigin: 'bottom right' }}
            className={cn(
              'fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden rounded-2xl',
              'border border-white/[0.1] bg-[#0a0e1f]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl',
              'h-[min(70vh,560px)] w-[min(92vw,380px)]',
              'max-sm:bottom-4 max-sm:left-4 max-sm:right-4 max-sm:w-auto',
            )}
          >
            {/* Violet/fuchsia top glow line */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-500/30 via-fuchsia-400/80 to-violet-500/30"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-10 top-0 h-10 bg-gradient-to-b from-fuchsia-500/10 to-transparent blur-lg"
            />

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_0_18px_-4px_rgba(139,92,246,0.8)]"
              >
                <Sparkles className="h-[18px] w-[18px] text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">AI Resume Assistant</p>
                <p className="truncate text-[11px] text-slate-500">Grounded in your latest resume</p>
              </div>
              <button
                type="button"
                onClick={clearChat}
                aria-label="Clear chat"
                title="Clear chat"
                className={ICON_BUTTON_CLASSES}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                title="Close"
                className={ICON_BUTTON_CLASSES}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-label="Conversation"
              className={cn('flex-1 space-y-3 overflow-y-auto px-4 py-4', SCROLLBAR_CLASSES)}
            >
              {messages.length === 0 && !awaiting && !failed && (
                <div className="pt-1">
                  <p className="text-[13px] leading-relaxed text-slate-400">
                    Hi! I read your latest resume, so I can polish, critique and quiz you on it. Where
                    should we start?
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => send(prompt)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-xs leading-snug text-slate-300 transition-all hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) =>
                message.role === 'user' ? (
                  <UserBubble key={index} content={message.content} />
                ) : (
                  <AssistantBubble key={index} content={message.content} />
                ),
              )}

              {awaiting && <TypingBubble />}
              {failed && !awaiting && <ErrorBubble onRetry={() => void requestReply(messages)} />}
            </div>

            {/* Composer */}
            <form
              className="border-t border-white/[0.07] p-3"
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
            >
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about your resume…"
                  aria-label="Message the AI assistant"
                  enterKeyHint="send"
                  autoComplete="off"
                  maxLength={6000}
                  className="h-11 flex-1 border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600 focus-visible:border-violet-400/40 focus-visible:ring-violet-500/20"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={!input.trim() || awaiting}
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white',
                    'bg-gradient-to-br from-violet-600 to-fuchsia-600',
                    'shadow-[0_0_18px_-6px_rgba(139,92,246,0.8)] transition-all hover:brightness-110',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70',
                    'disabled:pointer-events-none disabled:opacity-40',
                  )}
                >
                  <SendHorizontal className="h-[18px] w-[18px]" aria-hidden />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
