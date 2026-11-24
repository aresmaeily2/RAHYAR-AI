// ─── دفاع در برابر تزریق پرامپت غیرمستقیم (SEC-02 / OWASP LLM01 / F-12) ──
// خنثی‌سازی هرگونه تگ خروجی/ورودی <user_data> یا </user_data> (با هر فاصله یا بزرگ/کوچک)
// پیش از تزریق داده‌های نامطمئن کاربر، حافظه، وظایف و نتایج جست‌وجوی وب به پرامپت سیستم.

const USER_DATA_TAG_RE = /<\s*\/?\s*user_data(?:\s+[^>]*)?\s*>/gi
const SYSTEM_ROLE_TAG_RE = /<\s*\/?\s*(?:system|assistant|tool_call|instructions?)(?:\s+[^>]*)?\s*>/gi

export function defuseUserWall(input: string): string {
  if (!input) return ''
  return input
    .replace(USER_DATA_TAG_RE, (m) => m.replace(/</g, '[').replace(/>/g, ']'))
    .replace(SYSTEM_ROLE_TAG_RE, (m) => m.replace(/</g, '[').replace(/>/g, ']'))
}
