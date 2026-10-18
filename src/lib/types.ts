// ─── انواع مشترک پروژه «رهیار» ───────────────────────────────

/** زبان رابط — فارسی (RTL + شمسی) یا انگلیسی (LTR + میلادی) */
export type AppLang = 'fa' | 'en'

/** حالت نمایش تقویم — شمسی / دوگانه / میلادی */
export type CalendarMode = 'jalali' | 'dual' | 'gregorian'

export interface SubtaskT {
  id: string
  taskId: string
  title: string
  done: boolean
  order: number
}

export type RepeatMode = 'daily' | 'weekly' | null

export interface TaskT {
  id: string
  title: string
  notes: string | null
  priority: number // ۱ فوری | ۲ متوسط | ۳ کم‌اهمیت
  status: 'todo' | 'done'
  tag: string | null
  dueDate: string | null // ISO
  dueTime: string | null // HH:mm
  starred: boolean
  repeat: RepeatMode
  createdAt: string
  completedAt: string | null
  subtasks: SubtaskT[]
}

export interface ReminderT {
  id: string
  taskId: string | null
  message: string
  remindAt: string
  fired: boolean
}

export type ChatAction =
  | { type: 'add_task'; ok: boolean; task?: TaskT; note?: string }
  | { type: 'complete_task'; ok: boolean; task?: TaskT; note?: string }
  | { type: 'start_focus'; ok: boolean; note?: string }
  | { type: 'delete_task'; ok: boolean; task?: TaskT; note?: string }
  | { type: 'update_task'; ok: boolean; task?: TaskT; note?: string }
  | { type: 'star_task'; ok: boolean; task?: TaskT; note?: string }
  | { type: 'snooze_task'; ok: boolean; task?: TaskT; note?: string }
  | { type: 'plan_day'; ok: boolean; plan?: DailyPlan; note?: string }
  | { type: 'remember'; ok: boolean; fact?: string; note?: string }
  | { type: 'forget'; ok: boolean; fact?: string; note?: string }
  | { type: 'add_reminder'; ok: boolean; reminder?: ReminderT; note?: string }
  | { type: 'breakdown_task'; ok: boolean; task?: TaskT; note?: string }
  | { type: 'unknown'; note: string }

export interface ChatMessageT {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions: ChatAction[]
  followups?: string[]
  sources?: SourceT[]
  createdAt: string
}

/** منبع وب برای پاسخ‌های جستجوشده (فقط http/https) */
export interface SourceT {
  title: string
  url: string
  host: string
}

export interface MemoryT {
  id: string
  fact: string
  source: string
  createdAt: string
}

export interface PlanBlock {
  time: string
  title: string
  why?: string
  taskId?: string
}

export interface DailyPlan {
  summary: string
  focus: string
  blocks: PlanBlock[]
  tip: string
}

export type View = 'today' | 'tasks' | 'calendar' | 'chat' | 'plan' | 'finance' | 'settings'

export const REPEAT_LABEL: Record<'daily' | 'weekly', string> = {
  daily: 'هر روز',
  weekly: 'هر هفته',
}
