// bootstrap ظاهر رهیار — پیش از رنگ‌آمیزی اولیه اجرا می‌شود.
// تم و رنگ تأکید ذخیره‌شده را روی <html> اعمال می‌کند تا هیچ فلشی دیده نشود.
// خارجی و استاتیک است تا با script-src 'self' بدون نیاز به nonce کار کند و
// hydration هرگز با آن تداخل نکند (props ایستا).
(function () {
  try {
    var t = localStorage.getItem('rahyar-theme')
    var a = localStorage.getItem('rahyar-accent')
    var s = localStorage.getItem('rahyar-textscale')
    var T = ['ocean', 'forest', 'aurora', 'sunset', 'night', 'minimal', 'sakura', 'autumn', 'rain']
    var A = ['teal', 'blue', 'violet', 'green', 'orange', 'pink', 'gold']
    var S = ['sm', 'md', 'lg', 'xl']
    if (t && T.indexOf(t) > -1) document.documentElement.dataset.theme = t
    if (a && A.indexOf(a) > -1) document.documentElement.dataset.accent = a
    if (s && S.indexOf(s) > -1) document.documentElement.dataset.textscale = s
  } catch (e) {
    /* محیط بدون localStorage — پیش‌فرض */
  }
})()
