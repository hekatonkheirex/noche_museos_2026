#!/usr/bin/env python3
"""Genera favicon.ico, favicon-32.png, apple-touch-icon.png, icon-192/512.png, icon-maskable-512.png (M dorada del logo oficial sobre #001E47)
y og.png (tarjeta social 1200x630 con el logo) en app/public/. Textos de la tarjeta: variables OG_TITLE y OG_SUBTITLE.
Requiere Pillow. Aísla la M por color (el texto del logo es casi blanco) y se queda con el componente conexo más grande."""
import os
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

def maskable(size):  # fondo a sangre y M dentro de la zona segura (80 %) para que Android pueda recortar en círculo o cuadrado redondeado
    bg = Image.new('RGBA', (size * 4, size * 4), (0, 0, 0, 255)); ImageDraw.Draw(bg).rectangle((0, 0, size * 4, size * 4), fill=(0, 30, 71, 255))
    k = size * 4 * 0.5 / max(m.size); mm = m.resize((round(m.width * k), round(m.height * k)), Image.LANCZOS)
    bg.alpha_composite(mm, ((size * 4 - mm.width) // 2, (size * 4 - mm.height) // 2))
    return bg.resize((size, size), Image.LANCZOS)

def og():  # tarjeta para WhatsApp / Instagram / X: logo completo (de 195 px, ampliado) y texto en Montserrat si está instalada
    from PIL import ImageFont
    W, H = 1200, 630
    img = Image.new('RGBA', (W, H), (0, 30, 71, 255))
    logo = im.crop(im.getbbox()); k = 640 / logo.width
    logo = logo.resize((640, round(logo.height * k)), Image.LANCZOS)
    img.alpha_composite(logo, ((W - logo.width) // 2, 92))
    def font(name, size):
        for d in (Path.home() / '.local/share/fonts/Montserrat', Path('/usr/share/fonts/TTF'), Path('/usr/share/fonts/truetype/montserrat')):
            if (d / name).exists(): return ImageFont.truetype(str(d / name), size)
        return ImageFont.load_default(size)
    d = ImageDraw.Draw(img)
    for text, f, y, col in ((os.environ.get('OG_TITLE', 'Mapa de rutas'), font('Montserrat-Bold.ttf', 56), 412, (255, 255, 255)), (os.environ.get('OG_SUBTITLE', 'Sábado 7 de noviembre · 18 h · Asunción'), font('Montserrat-Regular.ttf', 34), 492, (102, 168, 216))):
        d.text(((W - d.textlength(text, font=f)) / 2, y), text, font=f, fill=col)
    return img.convert('RGB')

icon(180).save(PUB / 'apple-touch-icon.png')
icon(192).save(PUB / 'icon-192.png'); icon(512).save(PUB / 'icon-512.png'); maskable(512).save(PUB / 'icon-maskable-512.png')
og().save(PUB / 'og.png', optimize=True)
icon(32).save(PUB / 'favicon-32.png')
icon(48).save(PUB / 'favicon.ico', sizes=[(48, 48), (32, 32), (16, 16)])
print('M', m.size, 'px,', len(best), 'píxeles')
