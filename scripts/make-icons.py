#!/usr/bin/env python3
"""Genera favicon.ico, favicon-32.png y apple-touch-icon.png (M dorada del logo oficial sobre #001E47) en app/public/.
Requiere Pillow. Aísla la M por color (el texto del logo es casi blanco) y se queda con el componente conexo más grande."""
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw

PUB = Path(__file__).resolve().parent.parent / 'app' / 'public'
im = Image.open(PUB / 'ndm-2026-logo.png').convert('RGBA')
W, H = im.size
px = im.load()
CUT = 86  # a la derecha empieza el texto "NOCHE DE LOS MUSEOS"
gold = {(x, y) for y in range(H) for x in range(min(W, CUT))
        if px[x, y][3] > 40 and px[x, y][0] - px[x, y][2] > (30 if x >= 79 else 12) and px[x, y][1] - px[x, y][2] > 6}

best, seen = set(), set()
for start in gold:
    if start in seen: continue
    comp, q = set(), deque([start]); seen.add(start)
    while q:
        x, y = q.popleft(); comp.add((x, y))
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n = (x + dx, y + dy)
                if n in gold and n not in seen: seen.add(n); q.append(n)
    if len(comp) > len(best): best = comp

m = Image.new('RGBA', im.size, (0, 0, 0, 0))
for p in best: m.putpixel(p, px[p])
m = m.crop(m.getbbox())

def icon(size):
    s = size * 4  # supermuestreo
    bg = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(bg).rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=(0, 30, 71, 255))
    k = s * 0.62 / max(m.size)
    mm = m.resize((round(m.width * k), round(m.height * k)), Image.LANCZOS)
    bg.alpha_composite(mm, ((s - mm.width) // 2, (s - mm.height) // 2))
    return bg.resize((size, size), Image.LANCZOS)

icon(180).save(PUB / 'apple-touch-icon.png')
icon(32).save(PUB / 'favicon-32.png')
icon(48).save(PUB / 'favicon.ico', sizes=[(48, 48), (32, 32), (16, 16)])
print('M', m.size, 'px,', len(best), 'píxeles')
