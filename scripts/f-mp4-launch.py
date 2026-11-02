# -*- coding: utf-8 -*-
"""Run f-mp4-runner.py detached (double-fork)."""
import os, sys
if os.fork() > 0:
    sys.exit(0)
os.setsid()
if os.fork() > 0:
    sys.exit(0)
dn = os.open(os.devnull, os.O_RDONLY)
os.dup2(dn, 0)
os.execvp('python3', ['python3', '/home/z/my-project/scripts/f-mp4-runner.py'])
