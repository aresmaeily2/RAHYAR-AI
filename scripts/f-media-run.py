# -*- coding: utf-8 -*-
"""Run f-media-final.py detached (double-fork) so it survives tool-call boundaries."""
import os, sys
if os.fork() > 0:
    sys.exit(0)
os.setsid()
if os.fork() > 0:
    sys.exit(0)
log = open('/home/z/my-project/artifacts/media-run.log', 'ab', 0)
os.dup2(log.fileno(), 1); os.dup2(log.fileno(), 2)
dn = os.open(os.devnull, os.O_RDONLY)
os.dup2(dn, 0)
os.execvp('python3', ['python3', '/home/z/my-project/scripts/f-media-final.py'])
