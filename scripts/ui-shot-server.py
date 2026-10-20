#!/usr/bin/env python3
# سرور تصویربرداری UI — همان فایل‌هایی که داخل APK بسته می‌شوند را سرو می‌کند
# با تزریق «پل mock» پیش از اسکریپت‌ها تا صفحات با دادهٔ نمونه رندر شوند.
# توجه: این فقط برای تصویربرداری است؛ در APK واقعی RahyarNative پل بومی است.
import http.server, socketserver, os, sys, json

WWW = "/home/z/my-project/android/src/www"
PORT = 8791

MOCK = """<script>
window.__MOCK_NOTE = 'rendered with mocked native bridge + sample data';
window.RahyarNative = {
  getDoc: function(k){
    if(k==='profile') return JSON.stringify({name:'مالک', lang:'fa', theme:'auto'});
    if(k==='tasks') return JSON.stringify([
      {id:'t1', title:'تماس با پشتیبانی بانک', note:'دربارهٔ کارمزد تراکنش مرداد', priority:'high', status:'open', createdAt:'2026-10-20T09:30:00Z', doneAt:null},
      {id:'t2', title:'خرید هدیه تولد سارا', note:'', priority:'med', status:'open', createdAt:'2026-10-19T15:00:00Z', doneAt:null},
      {id:'t3', title:'تمدید بیمهٔ خودرو', note:'تا پایان ماه', priority:'low', status:'open', createdAt:'2026-10-18T11:00:00Z', doneAt:null},
      {id:'t4', title:'پرداخت قبض برق', note:'', priority:'med', status:'done', createdAt:'2026-10-17T08:00:00Z', doneAt:'2026-10-18T10:12:00Z'}
    ]);
    if(k==='reminders') return JSON.stringify([
      {id:'r1', title:'جلسهٔ دکتر', at:'2026-10-22T16:30:00Z', repeat:'none', createdAt:'2026-10-19T09:00:00Z'},
      {id:'r2', title:'قرص شبانه', at:'2026-10-21T20:00:00Z', repeat:'daily', createdAt:'2026-10-19T09:00:00Z'}
    ]);
    return '';
  },
  putDoc: function(k,v){ return '{"ok":true}'; },
  deleteDoc: function(k){ return '{"ok":true}'; },
  exportAll: function(){ return '{}'; },
  importAll: function(s){ return '{"ok":false}'; },
  meta: function(){ return JSON.stringify({app:'RahyAr', packageId:'com.rahyarai.app', versionName:'1.2.0', versionCode:12, mode:'local'}); },
  shareBackup: function(s){}, openServerLogin: function(){}
};
</script>"""

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WWW, **kw)
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path.endswith('.html'):
            p = os.path.join(WWW, self.path.lstrip('/').split('?')[0] or 'index.html')
            if not os.path.exists(p): p = os.path.join(WWW, 'index.html')
            body = open(p, encoding='utf-8').read()
            body = body.replace('<head>', '<head>' + MOCK, 1)
            data = body.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', PORT), H) as s:
    print('serving on', PORT, flush=True)
    s.serve_forever()
