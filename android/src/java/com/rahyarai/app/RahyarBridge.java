package com.rahyarai.app;

import android.webkit.JavascriptInterface;

/**
 * پل JS ↔ بومی برای رابط محلی (appassets).
 *
 * امنیت:
 *  - فقط برای WebView ای ثبت می‌شود که فقط از مبدأ appassets.androidplatform.net
 *    بارگذاری می‌کند (قفل ناوبری در HomeActivity) — صفحات خارجی به آن راه ندارند.
 *  - همهٔ ورودی/خروجی رشتهٔ JSON است؛ منطق واقعی در RahyarCore (تست‌پذیر روی JVM).
 *  - هیچ API اندرویدی حساس، مسیر فایل یا توکنی از این پل در دسترس JS نیست.
 *  - کنش‌های میزبان (اشتراک پشتیبان، ورود سرور اختیاری، مجوز میکروفون، سرویس Wake Word)
 *    هر کدام فقط یک کار مشخص می‌کنند و با HostAction از HomeActivity تزریق می‌شوند.
 *
 * F2-VOICE: مسیرهای صوتی — تشخیص گفتار/TTS در VoiceHelper (سیستم‌عامل)،
 * تحلیل فرمان در VoiceCommandParser (JVM-خالص). صدا هیچ‌گاه ذخیره یا ارسال نمی‌شود.
 */
public final class RahyarBridge {
    private final RahyarCore core;
    /** کنش میزبان: اشتراک‌گذاری متن پشتیبان (بدون هیچ مجوزی — Share Sheet سیستم) */
    private final HostAction shareBackupAction;
    /** کنش میزبان: بازکردن صفحهٔ اختیاری ورود به سرور (LoginActivity) */
    private final HostAction openServerLoginAction;
    /** کنش میزبان: روشن/خاموش کردن سرویس اختیاری Wake Word */
    private final HostAction wakeServiceAction;

    /** کنش کنترل‌شدهٔ میزبان — پیاده‌سازی توسط Activity؛ محدود به یک کار مشخص. */
    public interface HostAction {
        void run(String arg);
    }

    public RahyarBridge(RahyarCore core,
                        HostAction shareBackupAction,
                        HostAction openServerLoginAction) {
        this(core, shareBackupAction, openServerLoginAction, null);
    }

    public RahyarBridge(RahyarCore core,
                        HostAction shareBackupAction,
                        HostAction openServerLoginAction,
                        HostAction wakeServiceAction) {
        this(core, shareBackupAction, openServerLoginAction, wakeServiceAction, null);
    }

    public RahyarBridge(RahyarCore core,
                        HostAction shareBackupAction,
                        HostAction openServerLoginAction,
                        HostAction wakeServiceAction,
                        SmsDelegate smsDelegate) {
        this.core = core;
        this.shareBackupAction = shareBackupAction;
        this.openServerLoginAction = openServerLoginAction;
        this.wakeServiceAction = wakeServiceAction;
        this.smsDelegate = smsDelegate;
    }

    /** F5-مأموریت ۷: واگذاری پیامک بانکی — پیاده‌سازی توسط Activity میزبان */
    public interface SmsDelegate {
        /** وضعیت رضایت/مجوز/تعداد صف — JSON */
        String smsState();
        /** درخواست مجوز RECEIVE_SMS با دیالوگ سیستم (فقط با اقدام کاربر) */
        void requestConsent();
        /** لغو رضایت + پاک‌کردن صف پیش‌نمایش */
        void revokeConsent();
        /** صف پیش‌نمایش پیامک بانکی — JSON */
        String pendingQueue();
    }

    private final SmsDelegate smsDelegate;

    // ─── دادهٔ محلی (منطق در RahyarCore) ───

    @JavascriptInterface
    public String getDoc(String key) {
        return core.getDoc(key);
    }

    @JavascriptInterface
    public String putDoc(String key, String json) {
        return core.putDoc(key, json);
    }

    @JavascriptInterface
    public String deleteDoc(String key) {
        return core.deleteDoc(key);
    }

    @JavascriptInterface
    public String exportAll() {
        return core.exportAll();
    }

    @JavascriptInterface
    public String importAll(String backupJson) {
        return core.importAll(backupJson);
    }

    @JavascriptInterface
    public String meta() {
        return core.meta();
    }

    // ─── کنش‌های میزبان (هرگز داده‌ای برنمی‌گردانند) ───

    /** اشتراک‌گذاری متن پشتیبان با Share Sheet سیستم — بدون مجوز، بدون شبکه اجباری. */
    @JavascriptInterface
    public void shareBackup(String json) {
        if (shareBackupAction != null && json != null && json.length() <= RahyarCore.MAX_IMPORT_BYTES) {
            shareBackupAction.run(json);
        }
    }

    /** بازکردن صفحهٔ اختیاری «ورود به سرور» — تنها مسیر رسیدن به حالت متصل. */
    @JavascriptInterface
    public void openServerLogin() {
        if (openServerLoginAction != null) openServerLoginAction.run("");
    }

    // ─── F2-VOICE: مسیرهای صوتی ───

    /** مجوز میکروفون: granted | denied | need_request */
    @JavascriptInterface
    public String voiceMicState() {
        return voiceDelegate() == null ? "need_request" : voiceDelegate().micState();
    }

    /** درخواست مجوز میکروفون — دیالوگ سیستمی فقط با اقدام کاربر */
    @JavascriptInterface
    public void requestMicPermission() {
        if (voiceDelegate() != null) voiceDelegate().requestMic();
    }

    /** آیا سرویس تشخیص گفتار روی دستگاه هست؟ true|false */
    @JavascriptInterface
    public String voiceAvailable() {
        return voiceDelegate() == null ? "false" : voiceDelegate().recognitionAvailable() ? "true" : "false";
    }

    /** شروع شنود — lang به شکل fa-IR یا en-US */
    @JavascriptInterface
    public void voiceStart(String langBcp47) {
        if (voiceDelegate() != null) voiceDelegate().startListening(langBcp47);
    }

    /** توقف شنود */
    @JavascriptInterface
    public void voiceStop() {
        if (voiceDelegate() != null) voiceDelegate().stopListening();
    }

    /** خواندن پاسخ با TTS سیستم */
    @JavascriptInterface
    public void ttsSpeak(String text, String langBcp47) {
        if (voiceDelegate() != null) voiceDelegate().speak(text == null ? "" : text, langBcp47);
    }

    /** قطع خواندن */
    @JavascriptInterface
    public void ttsStop() {
        if (voiceDelegate() != null) voiceDelegate().stopSpeaking();
    }

    /** تحلیل فرمان صوتی → کنش JSON (منطق JVM-خالص در VoiceCommandParser) */
    @JavascriptInterface
    public String parseVoiceCommand(String text, String lang) {
        return VoiceCommandParser.parse(text, lang).toString();
    }

    /** سرویس اختیاری Wake Word — on=true با اطلاع‌رسانی و اعلان ماندگار */
    @JavascriptInterface
    public void setWakeService(boolean on) {
        if (wakeServiceAction != null) wakeServiceAction.run(on ? "on" : "off");
    }

    // ─── F5-مأموریت ۷: پیامک بانکی (رضایت + صف پیش‌نمایش) ───

    /** وضعیت رضایت پیامک بانکی + تعداد صف — JSON (بدون متن پیامک‌ها) */
    @JavascriptInterface
    public String smsState() {
        return smsDelegate == null ? "{\"consent\":false,\"permission\":\"unavailable\",\"pending\":0,\"supported\":false}" : smsDelegate.smsState();
    }

    /** درخواست رضایت = دیالوگ مجوز سیستم RECEIVE_SMS — فقط با اقدام کاربر */
    @JavascriptInterface
    public void smsRequestConsent() {
        if (smsDelegate != null) smsDelegate.requestConsent();
    }

    /** لغو رضایت — پردازش پیامک بلافاصله متوقف و صف پیش‌نمایش پاک می‌شود */
    @JavascriptInterface
    public void smsRevokeConsent() {
        if (smsDelegate != null) smsDelegate.revokeConsent();
    }

    /** صف پیش‌نمایش پیامک بانکی — JSON (مبلغ/نوع/بانک/متن خام برای بازبینی کاربر) */
    @JavascriptInterface
    public String smsPending() {
        return smsDelegate == null ? "[]" : smsDelegate.pendingQueue();
    }

    // ─── داخلی ───

    /** منبع صوت — یا در HomeActivity ست شده یا غایب (حالت تست/بدون صوت) */
    private VoiceDelegate voiceDelegate() {
        return voiceDelegateRef;
    }

    private volatile VoiceDelegate voiceDelegateRef;

    /** ثبت منبع صوت — از HomeActivity پس از ساخت WebView فراخوانی می‌شود */
    public void attachVoiceDelegate(VoiceDelegate d) {
        this.voiceDelegateRef = d;
    }

    /** قرارداد صوت — VoiceHelper این را پیاده می‌کند (جداکردن از WebView) */
    public interface VoiceDelegate {
        String micState();
        void requestMic();
        boolean recognitionAvailable();
        void startListening(String langBcp47);
        void stopListening();
        void speak(String text, String langBcp47);
        void stopSpeaking();
    }
}
