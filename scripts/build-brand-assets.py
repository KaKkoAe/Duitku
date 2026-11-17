#!/usr/bin/env python3
"""Bangun aset brand Duitku dari logo sumber (hitam di atas putih).

Memotong mark & wordmark, membuat latar putih jadi transparan
(alpha = 255 - luma, warna diganti tinta), lalu mengekspor:
  assets/brand/logo-mark.png        mark saja, transparan
  assets/brand/logo-wordmark.png    tulisan "Duitku" saja, transparan
  assets/brand/logo-full.png        mark di atas wordmark (untuk splash)
  assets/brand/logo-horizontal.png  mark + wordmark sebaris (untuk header)
  assets/brand/logo-putih.png       versi putih (untuk latar gradasi)
  assets/icon.png                   1024, latar pastel + mark putih
  assets/android-icon-foreground.png / -background.png / -monochrome.png
  assets/favicon.png                48
  assets/splash-icon.png            logo penuh transparan (native splash)

Pakai: python scripts/build-brand-assets.py [path-logo-sumber]
"""
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
BRAND = os.path.join(ASSETS, 'brand')
DEFAULT_SRC = os.path.join(BRAND, 'logo-source.png')

INK = (42, 36, 64)          # #2A2440 — tinta ungu tua
WHITE = (255, 255, 255)
THRESH = 246                # di bawah ini dianggap "ada tinta"


def ink_mask(img):
    """True untuk piksel yang mengandung tinta."""
    g = img.convert('L')
    px = g.load()
    w, h = g.size
    return [[px[x, y] < THRESH for x in range(w)] for y in range(h)]


def bands(mask, min_gap=6, min_h=6):
    """Baris-baris berisi tinta, dikelompokkan jadi pita (mark / wordmark)."""
    rows = [any(r) for r in mask]
    out, start, blank = [], None, 0
    for y, has in enumerate(rows):
        if has:
            if start is None:
                start = y
            blank = 0
        elif start is not None:
            blank += 1
            if blank >= min_gap:
                if y - blank - start + 1 >= min_h:
                    out.append((start, y - blank))
                start, blank = None, 0
    if start is not None and len(rows) - start >= min_h:
        out.append((start, len(rows) - 1))
    return out


def alpha_cut(img, ink=INK):
    """Putih -> transparan, tepi tetap halus (anti-alias terjaga)."""
    g = img.convert('L')
    a = g.point(lambda v: max(0, min(255, 255 - v)))
    out = Image.new('RGBA', img.size, ink + (0,))
    out.putalpha(a)
    return out


def crop_alpha(src_alpha, box, pad=0):
    x0, y0, x1, y1 = box
    w, h = src_alpha.size
    box = (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))
    return src_alpha.crop(box)


def trim(img):
    bbox = img.split()[-1].getbbox()
    return img.crop(bbox) if bbox else img


def fit(img, max_w=None, max_h=None):
    w, h = img.size
    scale = 1.0
    if max_w:
        scale = min(scale, max_w / w)
    if max_h:
        scale = min(scale, max_h / h)
    if scale >= 1:
        return img
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def gradient(size, top, bottom):
    """Gradasi vertikal lembut."""
    w, h = size
    img = Image.new('RGB', (1, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        d.point((0, y), tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img.resize((w, h), Image.BICUBIC)


def recolor(img, color):
    out = Image.new('RGBA', img.size, color + (0,))
    out.putalpha(img.split()[-1])
    return out


def main():
    src_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    os.makedirs(BRAND, exist_ok=True)
    src = Image.open(src_path).convert('RGB')

    mask = ink_mask(src)
    bs = bands(mask)
    if len(bs) < 2:
        raise SystemExit(f'gagal memisahkan mark & wordmark (pita terdeteksi: {len(bs)})')

    # pita pertama = mark, sisanya digabung = wordmark
    mark_band, word_bands = bs[0], bs[1:]

    def x_range(y0, y1):
        xs = [x for y in range(y0, y1 + 1) for x, has in enumerate(mask[y]) if has]
        return min(xs), max(xs)

    mx0, mx1 = x_range(*mark_band)
    wy0, wy1 = word_bands[0][0], word_bands[-1][1]
    wx0, wx1 = x_range(wy0, wy1)

    alpha = alpha_cut(src)
    mark = trim(crop_alpha(alpha, (mx0, mark_band[0], mx1 + 1, mark_band[1] + 1)))
    word = trim(crop_alpha(alpha, (wx0, wy0, wx1 + 1, wy1 + 1)))

    mark512 = fit(mark, max_w=512, max_h=512)
    mark512.save(os.path.join(BRAND, 'logo-mark.png'))
    word_hires = fit(word, max_w=1400)
    word_hires.save(os.path.join(BRAND, 'logo-wordmark.png'))

    # logo lengkap: mark di atas wordmark, jarak proporsional
    gap = round(mark512.height * 0.22)
    full_w = max(mark512.width, word_hires.width)
    full_h = mark512.height + gap + word_hires.height
    full = Image.new('RGBA', (full_w, full_h), (0, 0, 0, 0))
    full.alpha_composite(mark512, ((full_w - mark512.width) // 2, 0))
    full.alpha_composite(word_hires, ((full_w - word_hires.width) // 2, mark512.height + gap))
    full = trim(full)
    fit(full, max_h=900).save(os.path.join(BRAND, 'logo-full.png'))
    recolor(fit(full, max_h=900), WHITE).save(os.path.join(BRAND, 'logo-putih.png'))

    # lockup horizontal untuk header
    h_word = round(word_hires.height * 1.0)
    m_h = round(h_word * 1.95)
    m = fit(mark, max_h=m_h)
    hgap = round(h_word * 0.26)
    hor = Image.new('RGBA', (m.width + hgap + word_hires.width, max(m.height, word_hires.height)), (0, 0, 0, 0))
    hor.alpha_composite(m, (0, (hor.height - m.height) // 2))
    hor.alpha_composite(word_hires, (m.width + hgap, (hor.height - word_hires.height) // 2))
    hor = trim(hor)
    fit(hor, max_w=900).save(os.path.join(BRAND, 'logo-horizontal.png'))
    # versi putih untuk header di mode gelap
    recolor(fit(hor, max_w=900), WHITE).save(os.path.join(BRAND, 'logo-horizontal-putih.png'))

    # ---- ikon aplikasi ----
    pastel_top, pastel_bottom = (168, 148, 255), (120, 214, 255)  # lilac -> sky
    icon = gradient((1024, 1024), pastel_top, pastel_bottom).convert('RGBA')
    white_mark = fit(recolor(mark, WHITE), max_h=640)
    icon.alpha_composite(white_mark, ((1024 - white_mark.width) // 2, (1024 - white_mark.height) // 2))
    icon.convert('RGB').save(os.path.join(ASSETS, 'icon.png'))

    fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    fg_mark = fit(recolor(mark, WHITE), max_h=460)  # dalam safe zone adaptive icon
    fg.alpha_composite(fg_mark, ((1024 - fg_mark.width) // 2, (1024 - fg_mark.height) // 2))
    fg.save(os.path.join(ASSETS, 'android-icon-foreground.png'))

    gradient((1024, 1024), pastel_top, pastel_bottom).save(os.path.join(ASSETS, 'android-icon-background.png'))

    mono = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    mono_mark = fit(recolor(mark, WHITE), max_h=460)
    mono.alpha_composite(mono_mark, ((1024 - mono_mark.width) // 2, (1024 - mono_mark.height) // 2))
    mono.save(os.path.join(ASSETS, 'android-icon-monochrome.png'))

    fav = gradient((96, 96), pastel_top, pastel_bottom).convert('RGBA')
    fav_mark = fit(recolor(mark, WHITE), max_h=52)
    fav.alpha_composite(fav_mark, ((96 - fav_mark.width) // 2, (96 - fav_mark.height) // 2))
    fav.resize((48, 48), Image.LANCZOS).convert('RGB').save(os.path.join(ASSETS, 'favicon.png'))

    fit(full, max_h=1000).save(os.path.join(ASSETS, 'splash-icon.png'))

    for name in ('logo-mark.png', 'logo-wordmark.png', 'logo-full.png',
                 'logo-horizontal.png', 'logo-putih.png'):
        im = Image.open(os.path.join(BRAND, name))
        print(f'{name:24s} {im.size[0]}x{im.size[1]}')
    print('pita terdeteksi:', bs)


if __name__ == '__main__':
    main()
