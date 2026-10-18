// ─── نقل‌قول روزانه — قطعی، محلی، دوزبانه، بدون هزینه مدل ──────
// چرخش بر اساس روز سال؛ همه کاربران یک روز، همان نقل‌قول را می‌بینند.
// هر نقل‌قول نسخه فارسی و انگلیسی دارد — زبان رابط تعیین‌کننده است.

export interface Quote {
  text: string
  author: string
}

interface BilingualQuote {
  fa: Quote
  en: Quote
}

const QUOTES: BilingualQuote[] = [
  {
    fa: { text: 'کاری که امروز را می‌سازد، انتخاب بعدی توست؛ نه اتفاق دیروز.', author: 'رهیار' },
    en: { text: 'What builds today is your next choice — not yesterday’s accident.', author: 'Rahyar' },
  },
  {
    fa: { text: 'تمرکز یعنی گفتن «نه» به صدها ایده خوب، به خاطر یک کار عالی.', author: 'استیو جابز' },
    en: { text: 'Focus means saying “no” to a hundred good ideas for one great task.', author: 'Steve Jobs' },
  },
  {
    fa: { text: 'مسیر هزارفرسنگی از یک قدم آغاز می‌شود.', author: 'لائو تسه' },
    en: { text: 'A thousand-mile journey begins with a single step.', author: 'Lao Tzu' },
  },
  {
    fa: { text: 'آنچه اندازه‌گیری می‌شود، بهتر می‌شود؛ آنچه ثبت می‌شود، ادامه پیدا می‌کند.', author: 'پیتر دراکر' },
    en: { text: 'What gets measured gets better; what gets written down keeps going.', author: 'Peter Drucker' },
  },
  {
    fa: { text: 'کمتر ولی بهتر — اصل مرتب‌کردن ذهن و میز کار.', author: 'دیتر رامز' },
    en: { text: 'Less, but better — the principle of a tidy mind and desk.', author: 'Dieter Rams' },
  },
  {
    fa: { text: 'آرام باش، پیوسته باش؛ رودخانه با عجله نمی‌رسد ولی همیشه می‌رسد.', author: 'ضرب‌المثل' },
    en: { text: 'Be calm, be steady; the river is never in a hurry, yet it always arrives.', author: 'Proverb' },
  },
  {
    fa: { text: 'بزرگ‌ترین هدررفت زندگی، آماده‌ماندنِ همیشگی برای شروعِ دیرتر است.', author: 'پائولو کوئیلو' },
    en: { text: 'Life’s greatest waste is being forever ready to start later.', author: 'Paulo Coelho' },
  },
  {
    fa: { text: 'هر روزِ مرتب، هفته‌ای مرتب می‌سازد؛ هر هفته‌ی مرتب، سرنوشت.', author: 'رهیار' },
    en: { text: 'An ordered day builds an ordered week; an ordered week builds destiny.', author: 'Rahyar' },
  },
  {
    fa: { text: 'ذهنِ آرام، قوی‌ترین ابزار بهره‌وری است.', author: 'جیمز کلیر' },
    en: { text: 'A calm mind is the strongest productivity tool.', author: 'James Clear' },
  },
  {
    fa: { text: 'سختیِ نظم، از پشیمانیِ بی‌نظمی کمتر است.', author: 'حکیم ثنایی' },
    en: { text: 'The pain of discipline weighs less than the regret of chaos.', author: 'Sanai' },
  },
  {
    fa: { text: 'یک کار تمام‌شده کوچک، از ده نقشه‌ی نیمه‌کاره بزرگ‌تر است.', author: 'مارک توین' },
    en: { text: 'One small finished task beats ten grand half-plans.', author: 'Mark Twain' },
  },
  {
    fa: { text: 'امروز تنها روزی است که واقعاً در اختیار داری.', author: 'دیل کارنگی' },
    en: { text: 'Today is the only day you truly own.', author: 'Dale Carnegie' },
  },
  {
    fa: { text: 'اگر خسته‌ای، استراحت کن؛ اما تسلیم نشو.', author: 'بنکسی' },
    en: { text: 'If you are tired, rest — but never give up.', author: 'Banksy' },
  },
  {
    fa: { text: 'کیفیت هرگز تصادفی نیست؛ نتیجه‌ی تلاش هوشمندانه و عادت است.', author: 'جان راسکین' },
    en: { text: 'Quality is never an accident; it is the result of intelligent effort and habit.', author: 'John Ruskin' },
  },
]

/** نقل‌قول امروز — پایدار در طول یک شبانه‌روز تهران؛ دوزبانه */
export function quoteOfDay(lang: 'fa' | 'en' = 'fa'): Quote {
  const now = new Date()
  // روز سال تهران-محور — تغییر در نیمه‌شب به وقت ایران
  const tehran = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }))
  const start = new Date(tehran.getFullYear(), 0, 0)
  const day = Math.floor((tehran.getTime() - start.getTime()) / 86400000)
  const q = QUOTES[day % QUOTES.length]
  return lang === 'en' ? q.en : q.fa
}
