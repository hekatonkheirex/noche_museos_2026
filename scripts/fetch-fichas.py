#!/usr/bin/env python3
"""Descarga https://www.nochedemuseos.org.py/museos-info (sitio Wix de la Asociación Noche de los Museos) y extrae las fichas
de los espacios culturales de Asunción -> scripts/fichas.json. Solo biblioteca estándar. Uso: python3 scripts/fetch-fichas.py
El texto está en el HTML inicial (bloques `richTextElement`); cada ficha tiene rótulos fijos ("Dirección:", "Horarios:", ...)."""
import html, json, re, sys, urllib.request
from pathlib import Path

URL = 'https://www.nochedemuseos.org.py/museos-info'
OUT = Path(__file__).resolve().parent / 'fichas.json'

# rótulo del sitio -> clave. Otros "Algo:" que aparecen dentro de las descripciones NO son campos.
LABELS = {
    'categoría': 'categoria', 'subcategoría': 'subcategoria', 'dependencia': 'dependencia', 'ubicación': 'ubicacion',
    'dirección': 'direccion', 'contacto': 'contacto', 'correo': 'correo', 'sitio web': 'web', 'redes sociales': None,
    'facebook': 'facebook', 'instagram': 'instagram', 'twitter': 'twitter', 'youtube': 'youtube',
    'horarios': 'horarios', 'descripción': 'descripcion', 'función principal': 'funcion',
}
LABEL_RE = re.compile(r'^\s*(' + '|'.join(re.escape(k) for k in LABELS) + r')\s*:\s*(.*)$', re.I)


def to_text(block: str) -> str:
    block = re.sub(r'<br[^>]*>', '\n', block)
    block = re.sub(r'</p>', '\n', block)
    block = re.sub(r'<[^>]+>', '', block)
    return html.unescape(block).replace('\xa0', ' ').replace('​', '')


def parse_ficha(text: str) -> dict:
    lines = [re.sub(r'\s+', ' ', ln).strip() for ln in text.split('\n')]
    lines = [ln for ln in lines if ln]
    ficha = {'nombre': lines[0]}
    current = None
    for ln in lines[1:]:
        m = LABEL_RE.match(ln)
        if m:
            current = LABELS[m.group(1).lower()]
            if current:
                ficha[current] = m.group(2).strip()
        elif current:  # línea de continuación (descripciones largas)
            ficha[current] = (ficha[current] + ' ' + ln).strip()
    return {k: v for k, v in ficha.items() if v}


def parse_page(page: str) -> list:
    blocks = re.findall(r'data-testid="richTextElement">(.*?)</div>', page, re.S)
    texts = [to_text(b) for b in blocks]
    return [parse_ficha(t) for t in texts if 'Categoría:' in t]


if __name__ == '__main__':
    req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0 (mapa-rutas-ndm)'})
    page = urllib.request.urlopen(req, timeout=30).read().decode('utf8')
    fichas = parse_page(page)
    if len(fichas) < 30:
        sys.exit(f'Solo {len(fichas)} fichas: ¿cambió la estructura de {URL}?')
    OUT.write_text(json.dumps(fichas, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    print(f'{len(fichas)} fichas -> {OUT}')
