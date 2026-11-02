# -*- coding: utf-8 -*-
"""Fault-tolerant mp4 transcode of the Playwright webm.
The recorded webm hangs on decode somewhere near the tail (SIGTERM-immune hang),
so try progressively shorter cuts; first success wins. Runs detached."""
import os, subprocess, sys

SRC_GLOB = '/home/z/my-project/artifacts/media/final/video'
OUT = '/home/z/my-project/artifacts/media/final/rahyar-final-walkthrough.mp4'
MARK = '/home/z/my-project/artifacts/media/final/.mp4-done'
LOG = '/home/z/my-project/artifacts/mp4-run.log'

import glob
SRC = sorted(glob.glob(SRC_GLOB + '/*.webm'))[0]

log = open(LOG, 'ab', 0)
def P(*a):
    log.write((' '.join(str(x) for x in a) + '\n').encode())

for dur in (600, 540, 480, 420, 360, 300, 240, 180):
    tmp = f'/tmp/walk-{dur}.mp4'
    if os.path.exists(tmp):
        os.remove(tmp)
    cmd = ['ffmpeg', '-y', '-v', 'error', '-i', SRC,
           '-vf', 'scale=640:360,fps=12', '-t', str(dur),
           '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30',
           '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp]
    P(f'try -t {dur} ...')
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
        if r.returncode == 0 and os.path.exists(tmp) and os.path.getsize(tmp) > 100_000:
            os.replace(tmp, OUT)
            P(f'SUCCESS at -t {dur}: {os.path.getsize(OUT)} bytes')
            open(MARK, 'w').write(str(dur))
            sys.exit(0)
        P(f'fail rc={r.returncode} err={r.stderr[-200:]}')
    except subprocess.TimeoutExpired:
        P(f'timeout at -t {dur}')
        try:
            subprocess.run(['pkill', '-9', 'ffmpeg'], capture_output=True)
        except Exception:
            pass
P('ALL DURATIONS FAILED')
sys.exit(1)
