// تست قالب استریم z-ai — بررسی سازگاری SSE با فرمت OpenAI
import ZAI from 'z-ai-web-dev-sdk'

const zai = await ZAI.create()
const body = await zai.chat.completions.create({
  messages: [
    { role: 'system', content: 'پاسخ‌های کوتاه فارسی بده.' },
    { role: 'user', content: 'سلام، خودت را در یک جمله معرفی کن' },
  ],
  stream: true,
  thinking: { type: 'disabled' },
})
console.log('type:', body?.constructor?.name)
const reader = body.getReader()
const dec = new TextDecoder()
let n = 0
while (n < 8) {
  const { done, value } = await reader.read()
  if (done) break
  const s = dec.decode(value, { stream: true })
  console.log('CHUNK:', JSON.stringify(s.slice(0, 300)))
  n++
}
