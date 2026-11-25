package ai.rahyar.android

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import ai.rahyar.android.core.*

object ReminderAlarmScheduler {
    const val CHANNEL_ID = "rahyar_reminders"

    fun ensureChannel(ctx: Context) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "RahyAr Reminders", NotificationManager.IMPORTANCE_HIGH)
        )
    }

    fun schedule(ctx: Context, reminderId: Int, triggerAtMillis: Long, title: String) {
        ensureChannel(ctx)
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(ctx, ReminderAlarmReceiver::class.java).putExtra("title", title)
        val pi = PendingIntent.getBroadcast(
            ctx, reminderId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            // fallback ایمن در صورت نبود مجوز SCHEDULE_EXACT_ALARM
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
        }
    }
}

class ReminderAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        ReminderAlarmScheduler.ensureChannel(context)
        val title = intent.getStringExtra("title") ?: "یادآور رهیار"
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notif = android.app.Notification.Builder(context, ReminderAlarmScheduler.CHANNEL_ID)
            .setContentTitle("رهیار AI")
            .setContentText(title)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setAutoCancel(true)
            .build()
        nm.notify((System.currentTimeMillis() % 100000).toInt(), notif)
    }
}

class BootRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        // باززمان‌بندی یادآورهای ذخیره‌شده در Room پس از BOOT_COMPLETED یا TIMEZONE_CHANGED
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_TIMEZONE_CHANGED) {
            ReminderAlarmScheduler.ensureChannel(context)
        }
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var isFa by remember { mutableStateOf(true) }
            var selectedTab by remember { mutableIntStateOf(0) }
            val dir = if (isFa) LayoutDirection.Rtl else LayoutDirection.Ltr
            CompositionLocalProvider(LocalLayoutDirection provides dir) {
                MaterialTheme(colorScheme = darkColorScheme()) {
                    Scaffold(
                        topBar = {
                            Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(if (isFa) "رهیار AI (Native)" else "RahyAr AI (Native)", style = MaterialTheme.typography.titleMedium)
                                TextButton(onClick = { isFa = !isFa }) { Text(if (isFa) "EN" else "فارسی") }
                            }
                        }
                    ) { pad ->
                        Column(Modifier.padding(pad).padding(12.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                FilterChip(selected = selectedTab == 0, onClick = { selectedTab = 0 }, label = { Text("Proto B") })
                                FilterChip(selected = selectedTab == 1, onClick = { selectedTab = 1 }, label = { Text("Proto C") })
                                FilterChip(selected = selectedTab == 2, onClick = { selectedTab = 2 }, label = { Text("Proto A") })
                            }
                            Spacer(Modifier.height(12.dp))
                            when (selectedTab) {
                                0 -> {
                                    val todayCell = JalaliCalendar.formatCell(2026, 11, 25, isFa)
                                    Text(if (isFa) "تقویم دوگانه: ${todayCell.primary} (${todayCell.secondary})" else "Gregorian: ${todayCell.primary} (${todayCell.iso})")
                                }
                                1 -> Text(if (isFa) "دفتر مالی Int64 + صف تأیید CSV" else "Int64 Finance Ledger + CSV Approval Queue")
                                2 -> Text(if (isFa) "دستیار صوتی Push-to-Talk + مجوز L0–L3 + Kill-Switch" else "Voice Push-to-Talk + L0–L3 Governance + Kill-Switch")
                            }
                        }
                    }
                }
            }
        }
    }
}
