package com.rahyarai.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.AnimatorSet;
import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PathMeasure;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.provider.Settings;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.LinearInterpolator;
import android.view.animation.OvershootInterpolator;

/**
 * اسپلش بومی رهیار — پیاده‌سازی واقعی با Canvas + ValueAnimator (بدون WebView،
 * بدون HTML نمایشی، بدون کتابخانهٔ بیرونی).
 *
 * زمان‌بندی طراحی (راهنما؛ هیچ تأخیر اجباری برای ورود به اپ ایجاد نمی‌کند —
 * محتوای اصلی همزمان پشت این لایه آماده می‌شود):
 *   0.00s  هالهٔ نور + ورود نشان با بزرگ‌شدن کنترل‌شده
 *   0.35s  رسم بخش اصلی R (میله + کاسه)
 *   0.95s  رسم پای R
 *   1.25s  ورود ظریف جرقه
 *   1.50s  ورود نام «rahyar AI»
 *   1.80s  شعار فارسی
 *   ~2.4s  پایان خودکار → محو نرم و بازگشت به رابط
 *
 * دسترس‌پذیری:
 *  - کاهش حرکت سیستم (ANIMATOR_DURATION_SCALE=0 یا گزینهٔ توسعه‌دهنده) →
 *    نشان و نام بلافاصله و ثابت نمایش داده می‌شوند (بدون انیمیشن).
 *  - لمس در هر لحظه = ردشدن از اسپلش.
 *  - پس از اولین اجرا در هر نشست، اسپلش تکرار بی‌دلیل ندارد
 *    (نمایش فقط در شروع سرد HomeActivity؛ بازگشت به اپ بدون اسپلش).
 */
public final class SplashView extends View {

    /** شنوندهٔ پایان اسپلش */
    public interface Listener { void onSplashFinished(); }

    // ── هندسه در فضای ۱۰۰×۱۰۰ نشان ──
    private static final float BADGE_SIZE_DP = 116f;
    private static final long T_MAIN = 350L, D_MAIN = 600L;
    private static final long T_LEG = 950L, D_LEG = 300L;
    private static final long T_SPARK = 1250L, D_SPARK = 250L;
    private static final long T_NAME = 1500L, D_NAME = 250L;
    private static final long T_TAG = 1800L, D_TAG = 250L;
    private static final long T_END = 2400L;

    // رنگ‌های برند (واریانت B — گرادیان بنفش/صورتی/فیروزه‌ای)
    private static final int C_VIOLET = 0xFF7C5CFF;
    private static final int C_PINK = 0xFFF062A4;
    private static final int C_TEAL = 0xFF2FD8C8;

    private final Paint halo = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint badge = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint spark = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint nameP = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint tagP = new Paint(Paint.ANTI_ALIAS_FLAG);

    private final Path mainPath = new Path();
    private final Path legPath = new Path();
    private final PathMeasure mainMeasure = new PathMeasure(mainPath, false);
    private final PathMeasure legMeasure = new PathMeasure(legPath, false);
    private final Path dst = new Path();
    private final RectF badgeRect = new RectF();

    private float haloAlpha = 0f;      // 0..1
    private float badgeScale = 0.86f;  // 0.86..1
    private float badgeAlpha = 0f;
    private float mainReveal = 0f;     // 0..1
    private float legReveal = 0f;      // 0..1
    private float sparkAlpha = 0f;     // 0..1
    private float sparkScale = 0f;     // 0..1
    private float nameAlpha = 0f;
    private float tagAlpha = 0f;
    private float exitAlpha = 1f;      // محو نهایی کل لایه

    private AnimatorSet anim;
    private Listener listener;
    private boolean finished;
    private final boolean reducedMotion;

    public SplashView(Context c) {
        super(c);
        // کاهش حرکت سیستم → نمایش ثابت و سریع
        float scale = 1f;
        try {
            scale = Settings.Global.getFloat(c.getContentResolver(),
                    Settings.Global.ANIMATOR_DURATION_SCALE, 1f);
        } catch (Exception ignored) {}
        reducedMotion = scale == 0f;

        halo.setStyle(Paint.Style.FILL);
        badge.setStyle(Paint.Style.FILL);
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeCap(Paint.Cap.ROUND);
        stroke.setStrokeJoin(Paint.Join.ROUND);
        spark.setStyle(Paint.Style.FILL);
        nameP.setColor(Color.WHITE);
        nameP.setTextAlign(Paint.Align.CENTER);
        nameP.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        tagP.setColor(0xCCFFFFFF);
        tagP.setTextAlign(Paint.Align.CENTER);
        tagP.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));

        // مسیر R — میله+کاسه (یک مسیر پیوسته) و پای R (مسیر دوم) در فضای ۱۰۰×۱۰۰
        mainPath.moveTo(30, 24);
        mainPath.lineTo(47, 24);
        mainPath.addArc(31.5f, 24, 62.5f, 55, -90, 180);
        mainPath.lineTo(30, 55);
        mainPath.lineTo(30, 80);
        legPath.moveTo(47, 55);
        legPath.lineTo(66, 80);
        mainMeasure.setPath(mainPath, false);
        legMeasure.setPath(legPath, false);

        if (reducedMotion) {
            haloAlpha = 0.55f; badgeScale = 1f; badgeAlpha = 1f;
            mainReveal = 1f; legReveal = 1f; sparkAlpha = 1f; sparkScale = 1f;
            nameAlpha = 1f; tagAlpha = 1f;
        }

        // پس‌زمینهٔ عمیق برند — بدون فلش سفید در شروع سرد
        setBackgroundColor(0xFF0B1020);

        setClickable(true);
        setOnClickListener(new OnClickListener() {
            @Override public void onClick(View v) { finishSplash(); }
        });
    }

    public void setListener(Listener l) { listener = l; }

    /** شروع توالی انیمیشن — پس از اتصال به پنجره (با اندازهٔ واقعی) */
    @Override protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (reducedMotion) {
            // نمایش ثابت کوتاه — بدون انیمیشن، سپس خروج
            postDelayed(new Runnable() {
                @Override public void run() { finishSplash(); }
            }, 650);
            return;
        }
        startSequence();
    }

    private void startSequence() {
        AnimatorSet s = new AnimatorSet();

        ValueAnimator a1 = ValueAnimator.ofFloat(0, 1).setDuration(400);
        a1.setInterpolator(new DecelerateInterpolator());
        a1.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override public void onAnimationUpdate(ValueAnimator a) {
                float v = (float) a.getAnimatedValue();
                haloAlpha = 0.55f * v;
                badgeAlpha = v;
                badgeScale = 0.86f + 0.14f * v;
                invalidate();
            }
        });

        ValueAnimator a2 = ValueAnimator.ofFloat(0, 1).setDuration(D_MAIN);
        a2.setStartDelay(T_MAIN);
        a2.setInterpolator(new LinearInterpolator());
        a2.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override public void onAnimationUpdate(ValueAnimator a) {
                mainReveal = (float) a.getAnimatedValue();
                invalidate();
            }
        });

        ValueAnimator a3 = ValueAnimator.ofFloat(0, 1).setDuration(D_LEG);
        a3.setStartDelay(T_LEG);
        a3.setInterpolator(new LinearInterpolator());
        a3.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override public void onAnimationUpdate(ValueAnimator a) {
                legReveal = (float) a.getAnimatedValue();
                invalidate();
            }
        });

        ValueAnimator a4 = ValueAnimator.ofFloat(0, 1).setDuration(D_SPARK);
        a4.setStartDelay(T_SPARK);
        a4.setInterpolator(new OvershootInterpolator(1.6f));
        a4.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override public void onAnimationUpdate(ValueAnimator a) {
                float v = (float) a.getAnimatedValue();
                sparkAlpha = Math.min(1f, v * 1.4f);
                sparkScale = v;
                invalidate();
            }
        });

        ValueAnimator a5 = ValueAnimator.ofFloat(0, 1).setDuration(D_NAME);
        a5.setStartDelay(T_NAME);
        a5.setInterpolator(new DecelerateInterpolator());
        a5.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override public void onAnimationUpdate(ValueAnimator a) {
                nameAlpha = (float) a.getAnimatedValue();
                invalidate();
            }
        });

        ValueAnimator a6 = ValueAnimator.ofFloat(0, 1).setDuration(D_TAG);
        a6.setStartDelay(T_TAG);
        a6.setInterpolator(new DecelerateInterpolator());
        a6.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override public void onAnimationUpdate(ValueAnimator a) {
                tagAlpha = (float) a.getAnimatedValue();
                invalidate();
            }
        });

        // همهٔ انیماتورها با تأخیر مطلق روی یک خط‌زمانی واحد — دقیقاً مطابق جدول طراحی
        s.playTogether(a1, a2, a3, a4, a5, a6);
        s.start();
        anim = s;

        postDelayed(new Runnable() {
            @Override public void run() { finishSplash(); }
        }, T_END);
    }

    private void finishSplash() {
        if (finished) return;
        finished = true;
        if (anim != null) anim.cancel();
        // محو نرم ۲۵۰ms سپس حذف لایه
        ValueAnimator out = ValueAnimator.ofFloat(1, 0).setDuration(250);
        out.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override public void onAnimationUpdate(ValueAnimator a) {
                exitAlpha = (float) a.getAnimatedValue();
                invalidate();
            }
        });
        out.addListener(new AnimatorListenerAdapter() {
            @Override public void onAnimationEnd(Animator a) {
                if (listener != null) listener.onSplashFinished();
            }
        });
        out.start();
    }

    @Override protected void onDraw(Canvas canvas) {
        float cx = getWidth() / 2f;
        int cy = getHeight();
        float blockH = dp(BADGE_SIZE_DP) + dp(84);
        float top = cy / 2f - blockH / 2f;
        float badgeCx = cx;
        float badgeCy = top + dp(BADGE_SIZE_DP) / 2f;

        // هالهٔ نور — ملایم و کم‌رنگ
        if (haloAlpha > 0) {
            float r = dp(BADGE_SIZE_DP) * 1.35f;
            halo.setShader(new RadialGradient(badgeCx, badgeCy, r,
                    new int[]{0x667C5CFF, 0x22F062A4, 0x00000000},
                    new float[]{0f, 0.55f, 1f}, Shader.TileMode.CLAMP));
            int a = canvas.save();
            canvas.scale(badgeScale, badgeScale, badgeCx, badgeCy);
            halo.setAlpha((int) (haloAlpha * exitAlpha * 255));
            canvas.drawCircle(badgeCx, badgeCy, r, halo);
            canvas.restoreToCount(a);
        }

        // نشان — مربع گوشه‌گرد با گرادیان برند
        if (badgeAlpha > 0) {
            float half = dp(BADGE_SIZE_DP) / 2f;
            badgeRect.set(badgeCx - half, badgeCy - half, badgeCx + half, badgeCy + half);
            badge.setShader(new LinearGradient(
                    badgeRect.left, badgeRect.top, badgeRect.right, badgeRect.bottom,
                    new int[]{C_VIOLET, C_PINK, C_TEAL},
                    new float[]{0f, 0.55f, 1f}, Shader.TileMode.CLAMP));
            int a = canvas.save();
            canvas.scale(badgeScale, badgeScale, badgeCx, badgeCy);
            badge.setAlpha((int) (badgeAlpha * exitAlpha * 255));
            canvas.drawRoundRect(badgeRect, half * 0.44f, half * 0.44f, badge);
            // رسم R — با PathMeasure (افکت «کشیده‌شدن» خط)
            drawR(canvas, badgeCx, badgeCy, half);
            canvas.restoreToCount(a);
        }

        // جرقه — ستارهٔ چهارپر کوچک در گوشهٔ بالا-راست نشان
        if (sparkAlpha > 0) {
            float sx = badgeCx + dp(BADGE_SIZE_DP) * 0.52f;
            float sy = badgeCy - dp(BADGE_SIZE_DP) * 0.52f;
            float sr = dp(9) * sparkScale;
            spark.setColor(C_TEAL);
            spark.setAlpha((int) (sparkAlpha * exitAlpha * 255));
            canvas.save();
            canvas.translate(sx, sy);
            canvas.drawCircle(0, 0, sr, spark);
            spark.setColor(0xFFFFFFFF);
            spark.setAlpha((int) (sparkAlpha * exitAlpha * 160));
            canvas.drawCircle(0, 0, sr * 0.45f, spark);
            canvas.restore();
        }

        // نام برند
        if (nameAlpha > 0) {
            nameP.setTextSize(dp(21));
            nameP.setAlpha((int) (nameAlpha * exitAlpha * 255));
            canvas.drawText("rahyar AI", cx, top + dp(BADGE_SIZE_DP) + dp(34), nameP);
        }
        // شعار فارسی
        if (tagAlpha > 0) {
            tagP.setTextSize(dp(12.5f));
            tagP.setAlpha((int) (tagAlpha * exitAlpha * 255));
            canvas.drawText("دستیار هوشمند شخصی — مستقل و محلی",
                    cx, top + dp(BADGE_SIZE_DP) + dp(58), tagP);
        }

    }

    private void drawR(Canvas canvas, float cx, float cy, float half) {
        float size = half * 2f;
        float scale = (size / 100f) * 0.72f; // R در ۷۲٪ فضای نشان
        float ox = cx - 50f * scale, oy = cy - 50f * scale;
        stroke.setColor(Color.WHITE);
        stroke.setStrokeWidth(9f * scale);
        stroke.setAlpha((int) (badgeAlpha * exitAlpha * 255));

        dst.reset();
        if (mainReveal > 0) {
            mainMeasure.getSegment(0, mainMeasure.getLength() * mainReveal, dst, true);
            canvas.save();
            canvas.translate(ox, oy);
            canvas.scale(scale, scale);
            canvas.drawPath(dst, stroke);
            canvas.restore();
        }
        if (legReveal > 0) {
            dst.reset();
            legMeasure.getSegment(0, legMeasure.getLength() * legReveal, dst, true);
            canvas.save();
            canvas.translate(ox, oy);
            canvas.scale(scale, scale);
            canvas.drawPath(dst, stroke);
            canvas.restore();
        }
    }

    @Override protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        if (anim != null) anim.cancel();
    }

    private float dp(float v) { return v * getResources().getDisplayMetrics().density; }
}
