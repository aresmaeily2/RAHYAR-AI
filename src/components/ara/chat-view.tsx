'use client'

// ─── نمای چت رهیار ۳.۰ — استریم + حافظه + وب‌گردی + صوت + مدیریت گفتگو ──

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AudioLines,
  Bell,
  Brain,
  CalendarDays,
  CalendarSearch,
  Check,
  Clock,
  Copy,
  Download,
  Eraser,
  Globe,
  ListTree,
  Mic,
  Plus,
  PlusCircle,
  RefreshCcw,
  Search,
  SendHorizonal,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { useAra } from '@/lib/store'
import type { ChatAction, ChatMessageT, SourceT } from '@/lib/types'
import { ActionChips } from './chat-action-chips'
import { MemorySheet } from './chat-memory-sheet'
import { AiOrb, VoiceWave } from './ai-orb'
import { listen, speechInputSupported } from '@/lib/voice/speech'
import { useI18n } from '@/i18n/store'
import { formatNum, langBcp47 } from '@/i18n/core'
import { ambient } from '@/lib/ambient/engine'
import { useAmbient } from '@/lib/ambient/hooks'
import type { AmbientOrbState } from '@/lib/ambient/types'
import { feedback } from '@/lib/feedback'

// متن پیشنهادها دوزبانه — کلید فارسی، ترجمه در i18n/en.ts
const SUGGESTIONS = [
  { icon: CalendarDays, text: 'برنامه امروزم رو بچین' },
  { icon: Plus, text: 'یه کار مهم اضافه کن: جلسه با تیم فروش فردا ساعت ۱۰' },
  { icon: Brain, text: 'اینو یادت باشه: صبح‌ها از ۸ شروع می‌کنم' },
  { icon: Globe, text: 'آخرین اخبار هوش مصنوعی چیه؟' },
  { icon: Clock, text: 'یادم بنداز امشب ساعت ۲۱ قرص بخورم' },
  { icon: ListTree, text: 'کار بزرگ «نوشتن پایان‌نامه» رو برام تجزیه کن' },
] as const

/** گرید قابلیت‌ها در حالت خالی — آموزش ضمنی (پاریتی با ChatGPT) */
const CAPABILITIES = [
  { icon: PlusCircle, title: 'ثبت کار با یک جمله', sample: 'فردا ساعت ۹ تماس با دکتر اضافه کن' },
  { icon: Bell, title: 'یادآوری هوشمند', sample: 'یادم بنداز فردا صبح زنگ بزنم به بانک' },
  { icon: CalendarSearch, title: 'برنامه‌ریزی روز', sample: 'برنامه امروزم رو بچین' },
  { icon: ListTree, title: 'تجزیه کار بزرگ', sample: 'کار «طراحی سایت» رو تجزیه کن' },
  { icon: Globe, title: 'جستجوی وب با منبع', sample: 'قیمت دلار امروز چند؟' },
  { icon: Brain, title: 'حافظه بلندمدت', sample: 'یادت باشه من گیته خور نیستم' },
]

/** استخراج تدریجی مقدار reply از JSON نیمه‌کاره‌ی در حال استریم */
function extractPartialReply(raw: string): string {
  const i = raw.indexOf('"reply"')
  if (i === -1) return ''
  let j = raw.indexOf('"', i + 7)
  if (j === -1) return ''
  j = raw.indexOf(':', j + 1)
  if (j === -1) return ''
  j = raw.indexOf('"', j + 1)
  if (j === -1) return ''
  let out = ''
  let k = j + 1
  while (k < raw.length) {
    const c = raw[k]
    if (c === '\\' && k + 1 < raw.length) {
      const n = raw[k + 1]
      if (n === 'n') out += '\n'
      else if (n === 't') out += '\t'
      else if (n === 'u') {
        const hex = raw.slice(k + 2, k + 6)
        if (hex.length === 4) {
          out += String.fromCharCode(parseInt(hex, 16))
          k += 6
          continue
        }
        out += n
      } else out += n
      k += 2
      continue
    }
    if (c === '"') break
    out += c
    k++
  }
  return out
}

interface StreamingMsg {
  id: string
  raw: string
  reply: string
}

function formatTime(iso: string, lang: 'fa' | 'en'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'fa-IR', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso),
    )
  } catch {
    return ''
  }
}

/** متن تمیز برای خواندن صوتی — حذف مارک‌داون و لینک */
function speechText(md: string): string {
  return md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
}

function SourceCard({ sources }: { sources: SourceT[] }) {
  if (sources.length === 0) return null
  return (
    <div className="glass-chip mt-1.5 rounded-xl px-3 py-2">
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
        <Globe className="h-3 w-3" />
        منابع وب
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="max-w-[220px] truncate rounded-full bg-background/70 px-2.5 py-1 text-[10px] text-muted-foreground ring-1 ring-border transition-colors hover:text-primary-text"
            title={s.title}
          >
            {s.host || s.title}
          </a>
        ))}
      </div>
    </div>
  )
}

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessageT[]>([])
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'streaming'>('idle')
  const [streaming, setStreaming] = useState<StreamingMsg | null>(null)
  const [listening, setListening] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  // حال زنده دستیار — تنها منبع حقیقت: AmbientEngine
  const orbState = useAmbient().orb
  const upsertTask = useAra((s) => s.upsertTask)
  const removeTask = useAra((s) => s.removeTask)
  const setView = useAra((s) => s.setView)
  const setChatPlan = useAra((s) => s.setChatPlan)
  const setFocusTaskId = useAra((s) => s.setFocusTaskId)
  const { lang, voiceReplies, t } = useI18n()
  const voiceOriginRef = useRef(false) // آخرین پیام با صدا فرستاده شد؟
  const langRef = useRef(lang)
  langRef.current = lang
  const bottomRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<unknown>(null)
  const abortRef = useRef<AbortController | null>(null)
  const stoppedRef = useRef(false)

  useEffect(() => {
    let alive = true
    fetch('/api/chat')
      .then((r) => r.json())
      .then((d) => {
        if (alive && d.messages) setMessages(d.messages)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming, phase])

  // اعلام وضعیت معنایی دستیار به AmbientEngine — صفحه افکتی نمی‌سازد،
  // فقط «قصد» را اعلام می‌کند؛ رفتار بصری مال Engine است
  useEffect(() => {
    const orb: AmbientOrbState = listening
      ? 'listening'
      : speakingId
        ? 'speaking'
        : phase === 'waiting'
          ? 'thinking'
          : phase === 'streaming'
            ? 'streaming'
            : 'idle'
    ambient.setOrb(orb)
    return () => ambient.setOrb('idle')
  }, [listening, speakingId, phase])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      try {
        window.speechSynthesis?.cancel()
      } catch {
        /* بی‌اهمیت */
      }
    }
  }, [])

  /** خروجی صوتی فارسی — Web Speech Synthesis */
  function speak(text: string, id: string) {
    try {
      const synth = window.speechSynthesis
      if (!synth) {
        toast.error(t('مرورگر تو از خروجی صوتی پشتیبانی نمی‌کند'))
        return
      }
      if (speakingId === id) {
        synth.cancel()
        setSpeakingId(null)
        return
      }
      synth.cancel()
      const u = new SpeechSynthesisUtterance(speechText(text))
      u.lang = langBcp47(langRef.current)
      u.rate = 1.02
      const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(langRef.current))
      if (voice) u.voice = voice
      u.onend = () => setSpeakingId(null)
      u.onerror = () => setSpeakingId(null)
      setSpeakingId(id)
      synth.speak(u)
    } catch {
      setSpeakingId(null)
    }
  }

  function syncActions(actions: ChatAction[]) {
    for (const a of actions) {
      if (
        (a.type === 'add_task' ||
          a.type === 'complete_task' ||
          a.type === 'update_task' ||
          a.type === 'breakdown_task' ||
          a.type === 'star_task' ||
          a.type === 'snooze_task') &&
        a.task
      ) {
        upsertTask(a.task)
      } else if (a.type === 'delete_task' && a.ok && a.task) {
        removeTask(a.task.id)
      } else if (a.type === 'start_focus' && a.ok) {
        // تایمر پومودورو باز می‌شود — نیت صوتی «شروع تمرکز»
        setFocusTaskId('__session__')
      } else if (a.type === 'plan_day' && a.ok && a.plan) {
        setChatPlan(a.plan)
        setView('plan')
        toast.success('برنامه امروز چیده شد — در نمای برنامه ببین')
      } else if (a.type === 'remember' && a.ok) {
        toast('چیزی جدید درباره‌ات یاد گرفتم', { icon: <Brain className="h-4 w-4 text-primary" /> })
      }
    }
  }

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || phase !== 'idle') return
    setInput('')
    setPhase('waiting')
    stoppedRef.current = false
    feedback('tap', 'light')

    const tempUserId = `temp-u-${Date.now()}`
    setMessages((m) => [
      ...m,
      { id: tempUserId, role: 'user', content, actions: [], createdAt: new Date().toISOString() },
    ])

    const streamId = `temp-a-${Date.now()}`
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) throw new Error('خطا')

      setPhase('streaming')
      setStreaming({ id: streamId, raw: '', reply: '' })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let rawAll = ''
      let finalReply = ''
      let finalActions: ChatAction[] = []
      let finalFollowups: string[] = []
      let finalSources: SourceT[] = []
      let finalId = ''

      const processEvent = (block: string) => {
        const lines = block.split('\n')
        const evLine = lines.find((l) => l.startsWith('event: '))
        const dataLine = lines.find((l) => l.startsWith('data: '))
        if (!dataLine) return
        const ev = evLine?.slice(7).trim() ?? 'message'
        const data = JSON.parse(dataLine.slice(6))
        if (ev === 'delta' && data.text) {
          rawAll += data.text
          const partial = extractPartialReply(rawAll)
          setStreaming({ id: streamId, raw: rawAll, reply: partial })
        } else if (ev === 'done') {
          finalReply = data.reply ?? ''
          finalActions = (data.actions ?? []) as ChatAction[]
          finalFollowups = (data.followups ?? []) as string[]
          finalSources = (data.sources ?? []) as SourceT[]
          finalId = data.assistantId ?? ''
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const blocks = buf.split('\n\n')
        buf = blocks.pop() ?? ''
        for (const b of blocks) processEvent(b)
      }
      if (buf.trim()) processEvent(buf)

      // جایگزینی پیام موقت کاربر + افزودن پاسخ نهایی
      const finalMsg: ChatMessageT = {
        id: finalId || `a-${Date.now()}`,
        role: 'assistant',
        content: finalReply || extractPartialReply(rawAll) || '…',
        actions: finalActions,
        followups: finalFollowups,
        sources: finalSources,
        createdAt: new Date().toISOString(),
      }
      setMessages((m) =>
        m
          .map((x) => (x.id === tempUserId ? { ...x, id: `u-${finalId || Date.now()}` } : x))
          .concat(finalMsg),
      )
      syncActions(finalActions)
      if ((autoSpeak || (voiceReplies && voiceOriginRef.current)) && finalMsg.content) {
        speak(finalMsg.content, finalMsg.id)
      }
      voiceOriginRef.current = false
    } catch (e) {
      if (stoppedRef.current) {
        // توقف عمدی توسط کاربر — پیام‌های موقت حذف نمی‌شوند
        setMessages((m) => m.filter((x) => x.id !== tempUserId))
        toast(t('تولید پاسخ متوقف شد'))
      } else {
        toast.error(t('ارسال پیام ناموفق بود'))
        setMessages((m) => m.filter((x) => x.id !== tempUserId))
      }
    } finally {
      setStreaming(null)
      setPhase('idle')
      abortRef.current = null
    }
  }

  function stopGeneration() {
    stoppedRef.current = true
    abortRef.current?.abort()
  }

  async function regenerate() {
    if (phase !== 'idle') return
    // آخرین پیام کاربر را پیدا و دوباره بفرست
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUser) return
    // حذف آخرین پاسخ دستیار
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    setMessages((m) => (lastAssistant ? m.filter((x) => x.id !== lastAssistant.id) : m))
    await send(lastUser.content)
  }

  async function clearChat() {
    if (phase !== 'idle') return
    try {
      const res = await fetch('/api/chat', { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error()
      setMessages(d.messages)
      toast.success(t('گفتگو از نو شروع شد'))
    } catch {
      toast.error(t('پاک‌سازی ناموفق بود'))
    }
  }

  // تأیید دومرحله‌ای عملیات مخرب (مأموریت B10): پاک‌سازی کل گفتگو با یک کلیک اتفاقی ممکن نباشد
  const [confirmClear, setConfirmClear] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleClearClick() {
    if (phase !== 'idle') return
    if (!confirmClear) {
      setConfirmClear(true)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmClear(false), 4000)
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    setConfirmClear(false)
    void clearChat()
  }

  function exportChat() {
    if (messages.length === 0) return
    const fa = lang === 'fa'
    const lines = [
      fa ? '# گفتگو با رهیار' : '# Conversation with Rahyar',
      '',
      fa ? `تاریخ خروجی: ${new Date().toLocaleDateString('fa-IR')}` : `Exported: ${new Date().toLocaleDateString('en-US')}`,
      '',
      ...messages.map((m) => `## ${m.role === 'user' ? (fa ? 'تو' : 'You') : (fa ? 'رهیار' : 'Rahyar')} — ${formatTime(m.createdAt, lang)}\n\n${m.content}\n`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ara-chat-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('گفتگو دانلود شد')
  }

  function toggleVoice() {
    // ورودی صوتی محلی مرورگر (Web Speech API) — صدا هرگز جایی ارسال نمی‌شود.
    // زبان شنود از زبان رابط می‌آید (fa-IR / en-US).
    if (!speechInputSupported()) {
      toast.error('مرورگر تو از ورودی صوتی پشتیبانی نمی‌کند')
      return
    }
    if (listening) {
      const rec = recRef.current as { stop: () => void } | null
      rec?.stop()
      setListening(false)
      return
    }
    const session = listen({
      lang: langRef.current,
      onPartial: (txt) => setInput(txt),
      onFinal: (txt) => {
        setInput(txt)
        voiceOriginRef.current = true // پاسخ به این پیام خوانده شود
      },
      onEnd: () => setListening(false),
      onError: (code) => {
        setListening(false)
        if (code) toast.error(`voice: ${code}`)
      },
    })
    if (!session) {
      toast.error('مرورگر تو از ورودی صوتی پشتیبانی نمی‌کند')
      return
    }
    recRef.current = session
    setListening(true)
    toast(langRef.current === 'fa' ? 'گوش می‌دهم... فارسی حرف بزن' : 'Listening… speak now', {
      icon: <Mic className="h-4 w-4 text-primary" />,
    })
  }

  async function copyMsg(m: ChatMessageT) {
    try {
      await navigator.clipboard.writeText(m.content)
      setCopiedId(m.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      toast.error('کپی ناموفق بود')
    }
  }

  const empty = messages.length <= 1 && !streaming && phase === 'idle'

  // فیلتر جستجوی گفتگو
  const visibleMessages = useMemo(() => {
    const q = query.trim()
    if (!searchOpen || !q) return messages
    return messages.filter((m) => m.content.includes(q))
  }, [messages, query, searchOpen])

  // آخرین پیام دستیار برای پیشنهادهای دنباله‌دار
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant') return messages[i].id
    return null
  }, [messages])

  const iconBtn = 'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40'

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-0 flex-col md:h-[calc(100dvh-8.5rem)]">
      {/* هدر — اورب دستیار + وضعیت زنده */}
      <div className="flex items-center gap-3 px-1 pb-3">
        <AiOrb size={40} state={orbState} />
        <div className="flex-1">
          <p className="font-heading text-sm font-bold">رهیار</p>
          <p
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {orbState === 'idle' ? (
              t('همیشه در دسترس')
            ) : (
              <>
                <span className="ara-live-dot h-1.5 w-1.5 rounded-full bg-primary" />
                {orbState === 'listening'
                  ? t('گوش می‌دهم...')
                  : orbState === 'thinking'
                    ? t('در حال فکر کردن…')
                    : orbState === 'streaming'
                      ? t('در حال نوشتن…')
                      : t('در حال خواندن پاسخ…')}
              </>
            )}
          </p>
        </div>
        {phase === 'streaming' && <VoiceWave active className="shrink-0" />}

        {/* خروجی صوتی خودکار */}
        <button
          onClick={() => {
            setAutoSpeak((v) => !v)
            if (autoSpeak) {
              window.speechSynthesis?.cancel()
              setSpeakingId(null)
            }
          }}
          disabled={phase !== 'idle'}
          aria-label={autoSpeak ? 'قطع خواندن خودکار' : 'خواندن خودکار پاسخ‌ها'}
          title={autoSpeak ? 'خواندن خودکار: روشن' : 'خواندن خودکار پاسخ‌ها'}
          className={cn(iconBtn, autoSpeak && 'bg-primary/10 text-primary hover:text-primary')}
        >
          {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        {/* جستجوی گفتگو */}
        <button
          onClick={() => {
            setSearchOpen((v) => !v)
            setQuery('')
          }}
          aria-label="جستجو در گفتگو"
          title="جستجو در گفتگو"
          className={cn(iconBtn, searchOpen && 'bg-primary/10 text-primary hover:text-primary')}
        >
          <Search className="h-4 w-4" />
        </button>
        {/* حافظه */}
        <button
          onClick={() => setMemoryOpen(true)}
          aria-label="حافظه دستیار"
          title="حافظه من"
          className={iconBtn}
        >
          <Brain className="h-4 w-4" />
        </button>
        {/* خروجی گفتگو */}
        <button
          onClick={exportChat}
          disabled={messages.length < 2}
          aria-label="دانلود گفتگو"
          title="خروجی گفتگو (مارک‌داون)"
          className={iconBtn}
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={regenerate}
          disabled={phase !== 'idle' || messages.length < 2}
          aria-label="تولید دوباره پاسخ"
          title="تولید دوباره پاسخ"
          className={iconBtn}
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
        <button
          onClick={handleClearClick}
          disabled={phase !== 'idle'}
          aria-label={confirmClear ? 'تأیید پاک‌سازی کل گفتگو' : 'شروع گفتگوی جدید — دو بار برای تأیید'}
          title={confirmClear ? 'برای تأیید پاک‌سازی دوباره کلیک کن' : 'شروع گفتگوی جدید'}
          className={cn(
            iconBtn,
            confirmClear && 'bg-destructive/15 text-destructive ring-1 ring-destructive/40',
          )}
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      {/* نوار جستجو */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('در این گفتگو جستجو کن...')}
                autoFocus
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
                aria-label={t('جستجوی پیام‌ها')}
              />
              {query && <span className="text-[10px] text-muted-foreground">{formatNum(visibleMessages.length, lang)} {t('پیام')}</span>}
              <button onClick={() => setQuery('')} aria-label={t('پاک‌کردن جستجو')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* پیام‌ها */}
      <div className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1 py-2">
        <AnimatePresence initial={false}>
          {visibleMessages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={cn('group flex', m.role === 'user' ? 'justify-start' : 'justify-end')}
            >
              <div className={cn('max-w-[86%] space-y-1.5', m.role === 'user' ? 'order-2' : 'order-1')}>
                {m.role === 'user' ? (
                  <div className="ara-bubble-user rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-7">
                    {m.content}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="ara-md text-sm leading-7 text-foreground/95">
                      <ReactMarkdown
                        components={{
                          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    <ActionChips message={m} />
                    <SourceCard sources={m.sources ?? []} />
                    {/* پیشنهادهای دنباله‌دار — فقط آخرین پاسخ */}
                    {m.id === lastAssistantId && phase === 'idle' && (m.followups?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {m.followups!.map((f) => (
                          <button
                            key={f}
                            onClick={() => send(f)}
                            className="rounded-full border border-dashed bg-card px-3 py-1.5 text-[11px] text-muted-foreground transition-all hover:border-primary/50 hover:text-primary"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* متادیتا */}
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground/60 opacity-60 transition-opacity md:opacity-0 md:group-hover:opacity-100',
                    m.role === 'user' && 'justify-end',
                  )}
                >
                  <span>{formatTime(m.createdAt, lang)}</span>
                  {m.role === 'assistant' && (
                    <>
                      <button
                        onClick={() => speak(m.content, m.id)}
                        aria-label={speakingId === m.id ? 'توقف خواندن' : 'خواندن صوتی پاسخ'}
                        className={cn(
                          'flex items-center gap-0.5 rounded px-1 py-0.5 hover:text-foreground',
                          speakingId === m.id && 'text-primary',
                        )}
                      >
                        <Volume2 className="h-3 w-3" />
                        {speakingId === m.id ? t('توقف') : t('پخش')}
                      </button>
                      <button
                        onClick={() => copyMsg(m)}
                        aria-label="کپی پاسخ"
                        className="flex items-center gap-0.5 rounded px-1 py-0.5 hover:text-foreground"
                      >
                        {copiedId === m.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                        {copiedId === m.id ? t('کپی شد') : t('کپی')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* استریم زنده + دکمه توقف */}
        {streaming && (streaming.reply || phase === 'waiting') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
            <div className="max-w-[86%] order-1 w-full" aria-live="polite" aria-relevant="additions text">
              {phase === 'streaming' && streaming.reply ? (
                <div className="ara-md ara-stream-cursor text-sm leading-7 text-foreground/95">
                  <ReactMarkdown>{streaming.reply}</ReactMarkdown>
                </div>
              ) : (
                <div className="glass-chip inline-flex items-center gap-2 rounded-2xl rounded-br-md px-4 py-3">
                  <AiOrb size={20} state="thinking" />
                  <span className="ara-typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <span className="ara-typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <span className="ara-typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                </div>
              )}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* حالت خالی — معرفی دستیار با اورب + گرید قابلیت‌ها */}
      {empty && (
        <div className="pointer-events-none absolute inset-x-0 top-[26%] z-10 flex flex-col items-center gap-5 px-6">
          <AiOrb size={64} state="idle" />
          <div className="text-center">
            <p className="font-heading text-base font-bold">{t('سلام! من رهیارم')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('از کجا شروع کنیم؟ یکی را انتخاب کن یا آزاد بنویس')}</p>
          </div>
          <div className="pointer-events-auto grid w-full max-w-md grid-cols-2 gap-2">
            {CAPABILITIES.map((c) => (
              <button
                key={c.title}
                onClick={() => send(t(c.sample))}
                className="glass-chip ara-press flex items-center gap-2 rounded-xl px-3 py-2.5 text-right text-[11px] leading-5 text-muted-foreground transition-all hover:text-primary-text"
              >
                <c.icon className="h-4 w-4 shrink-0 text-primary/80" />
                <span className="flex-1">{t(c.title)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ورودی — میله شیشه‌ای شناور */}
      <div className="pb-1 pt-2">
        <div
          className={cn(
            'glass-card flex items-end gap-1.5 rounded-3xl p-2 transition-all',
            'focus-within:border-primary/40 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_7%,transparent),var(--shadow-soft)]',
          )}
        >
          <button
            onClick={toggleVoice}
            disabled={phase !== 'idle'}
            aria-label="ورودی صوتی"
            title="ورودی صوتی فارسی"
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all',
              listening
                ? 'bg-destructive/10 text-destructive'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            {listening ? <AudioLines className="h-4.5 w-4.5 animate-pulse" /> : <Mic className="h-4.5 w-4.5" />}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={listening ? t('گوش می‌دهم...') : t('با رهیار حرف بزن... (Enter برای ارسال)')}
            rows={1}
            maxLength={2000}
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-1.5 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground/60"
            aria-label={t('پیام به دستیار')}
          />
          {phase !== 'idle' ? (
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              onClick={stopGeneration}
              aria-label="توقف تولید پاسخ"
              title="توقف تولید"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background transition-all hover:opacity-85"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              onClick={() => send()}
              disabled={!input.trim()}
              aria-label="ارسال پیام"
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all',
                input.trim()
                  ? 'ara-float ara-float-primary'
                  : 'text-muted-foreground/40',
              )}
            >
              <SendHorizonal className="h-4.5 w-4.5 -scale-x-100" />
            </motion.button>
          )}
        </div>

        {/* چیپ‌های پیشنهادی — همیشه در دسترس */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.text}
              onClick={() => send(s.text)}
              disabled={phase !== 'idle'}
              className="glass-chip ara-press shrink-0 rounded-full px-3 py-1.5 text-[11px] text-muted-foreground transition-all hover:text-primary-text disabled:opacity-50"
            >
              <s.icon className="ml-1 inline h-3.5 w-3.5 -translate-y-px" />
              {(t(s.text)).length > 34 ? t(s.text).slice(0, 34) + '…' : t(s.text)}
            </button>
          ))}
        </div>
      </div>

      <MemorySheet open={memoryOpen} onClose={() => setMemoryOpen(false)} />
    </div>
  )
}
