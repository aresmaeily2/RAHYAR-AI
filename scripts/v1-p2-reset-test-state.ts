// V1-P2 — بازنشانی وضعیت آزمون (baseline قطعی بین اجراها)
// DB مأموریت در ابتدای بخش ۲ خالی بود؛ همهٔ ردیف‌ها مالِ اجراهای آزمون همین مأموریت‌اند.
// کاربرها (owner/testuser2) حفظ می‌شوند — فقط دادهٔ مکالمه/یادآور/کار/لاگ پاک می‌شود.
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const keepUsers = await db.user.findMany({ select: { id: true } })
const userIds = keepUsers.map((u) => u.id)
const delR = await db.reminder.deleteMany({})
const delT = await db.task.deleteMany({})
const delC = await db.chatMessage.deleteMany({})
const delA = await db.actionLog.deleteMany({})
// V1-P2 (یافتهٔ اجرای P): حساب‌های مالی و تراکنش‌ها هم پاک شوند — حساب به‌جامانده باعث
// «پیشنهادِ چندحسابی» و pending معلق می‌شود که لغوِ سناریوی بعدی را می‌رباید
const delTx = await db.financeTransaction.deleteMany({})
const delAcc = await db.financeAccount.deleteMany({})
const delPend = await db.setting.deleteMany({ where: { key: { contains: 'pending' } } })
console.log(JSON.stringify({ ok: true, keptUsers: userIds.length, reminders: delR.count, tasks: delT.count, chat: delC.count, actionLogs: delA.count, transactions: delTx.count, financeAccounts: delAcc.count, pendings: delPend.count }))
await db.$disconnect()
