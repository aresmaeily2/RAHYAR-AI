#!/usr/bin/env python3
# dex-defs.py v2 — کلاس‌های تعریف‌شدهٔ دو dex + تفاضل دقیق (MUTF-8-safe)
import struct, sys, collections

def classes(path):
    d = open(path, 'rb').read()
    u32 = lambda o: struct.unpack_from('<I', d, o)[0]
    def uleb(p):
        r = 0; s = 0
        while True:
            b = d[p]; p += 1
            r |= (b & 0x7f) << s
            if not b & 0x80: break
            s += 7
        return r, p
    strs = []
    for i in range(u32(0x38)):
        so = u32(u32(0x3c) + i * 4)
        _, p = uleb(so)
        e = d.index(b'\x00', p)
        strs.append(d[p:e].decode('utf8', 'replace'))  # MUTF-8 approx
    types = [strs[u32(u32(0x44) + i * 4)] for i in range(u32(0x40))]
    out = [types[u32(u32(0x64) + i * 32)] for i in range(u32(0x60))]
    return out

old = classes(sys.argv[1])
new = classes(sys.argv[2])
print('OLD defined:', len(old), ' NEW defined:', len(new))
print('OLD AssetsPathHandler defined:', 'Landroidx/webkit/WebViewAssetLoader$AssetsPathHandler;' in old)
print('NEW AssetsPathHandler defined:', 'Landroidx/webkit/WebViewAssetLoader$AssetsPathHandler;' in new)
missing = set(new) - set(old)
by = collections.Counter(x.split('/')[1] for x in missing)
print('in NEW but missing from OLD, by top-level package:', dict(by))
webmiss = sorted(x for x in missing if 'webkit' in x)
print('missing webkit classes (count):', len(webmiss))
for w in webmiss[:10]: print('   ', w)
