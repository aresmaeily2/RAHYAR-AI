# -*- coding: utf-8 -*-
"""RahyAr production daemon — double-fork so it survives across tool calls.
Env: NODE_ENV=production, RAHYAR_DOWNLOAD_DIR anchored to download/ (standalone chdir bug fix)."""
import os, sys, time, shutil, subprocess

LOG = '/home/z/my-project/artifacts/daemon.log'

def daemonize():
    if os.fork() > 0:
        sys.exit(0)
    os.setsid()
    if os.fork() > 0:
        sys.exit(0)
    log = open(LOG, 'ab', 0)
    dn = os.open(os.devnull, os.O_RDONLY)
    os.dup2(dn, 0); os.dup2(log.fileno(), 1); os.dup2(log.fileno(), 2)

daemonize()
os.chdir('/home/z/my-project')
env = dict(os.environ)
env['NODE_ENV'] = 'production'
env['RAHYAR_DOWNLOAD_DIR'] = '/home/z/my-project/download'
env.setdefault('PORT', '3000')
bun = shutil.which('bun') or '/usr/local/bin/bun'
time.sleep(0.3)
os.execve(bun, [bun, '.next/standalone/server.js'], env)
