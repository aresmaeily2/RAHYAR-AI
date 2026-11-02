# -*- coding: utf-8 -*-
"""Run f-upload-public.sh detached (double-fork) — big uploads outlive tool calls."""
import os, sys
if os.fork() > 0:
    sys.exit(0)
os.setsid()
if os.fork() > 0:
    sys.exit(0)
log = open('/home/z/my-project/artifacts/upload-run.log', 'ab', 0)
os.dup2(log.fileno(), 1); os.dup2(log.fileno(), 2)
dn = os.open(os.devnull, os.O_RDONLY)
os.dup2(dn, 0)
os.execvp('bash', ['bash', '/home/z/my-project/scripts/f-upload-public.sh'])
