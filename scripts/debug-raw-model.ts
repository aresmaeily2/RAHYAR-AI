// عیب‌یابی: خروجی خام مدل برای فرمان «پنجشنبه» — آیا actions خالی برمی‌گرداند؟
import { buildChatSystemPrompt } from '../src/lib/server-ai'
import { gatewayRun } from '../src/lib/ai/gateway'

const TASKS: any[] = []
const messages = [
  { role: 'system' as const, content: buildChatSystemPrompt(TASKS as any, [], undefined, 'fa') },
  { role: 'user' as const, content: 'لطفاً یک وظیفه با عنوان «جلسهٔ فصلی تیم» برای پنجشنبه ساعت ۱۸ بساز' },
]
const raw = await gatewayRun({ route: 'debug', task: 'chat', userId: 'debug', messages })
console.log('=== RAW MODEL OUTPUT ===')
console.log(raw.text)
console.log('=== END ===')
