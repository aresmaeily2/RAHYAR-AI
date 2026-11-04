#!/usr/bin/env python3
"""F2-DETACH — double-fork launcher (survives sandbox tool-call recycling).
Usage: python3 scripts/f2-detach.py <logfile> <command> [args...]"""
import os, sys

def main():
    log = open(sys.argv[1], 'ab', 0)
    if os.fork() > 0:
        sys.exit(0)
    os.setsid()
    if os.fork() > 0:
        sys.exit(0)
    os.dup2(log.fileno(), 1)
    os.dup2(log.fileno(), 2)
    dn = os.open(os.devnull, os.O_RDONLY)
    os.dup2(dn, 0)
    log.close()
    os.execvp(sys.argv[2], sys.argv[2:])

main()
