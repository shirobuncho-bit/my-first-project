"""元イラスト (assets/hero-original.png) から主人公のパーツ画像を作り、
index.html の // @sprites-begin ～ // @sprites-end の間に data URI として埋め込む。

使い方:  python3 game/tools/make_sprites.py
必要:    pip install pillow numpy scipy
"""
import base64
import io
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'hero-original.png'
HTML = ROOT / 'index.html'
OUT_SCALE = 0.25          # 書き出し解像度 (元画像比)
YELLOW = (255, 197, 13)

img = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
Hh, Ww, _ = img.shape
r, g, b = img[..., 0], img[..., 1], img[..., 2]
lum = (r + g + b) / 3
yel = (r > 200) & (g > 150) & (b < 90)

# ---- キャラ全体のマスク (黄色 + すぐ外側の黒フチ) ----
lab, n = nd.label(yel)
sizes = nd.sum(yel, lab, range(1, n + 1))
keep = [i + 1 for i, s in enumerate(sizes) if s > 2000]
yel = np.isin(lab, keep)
lab, n = nd.label(yel)
near = nd.binary_dilation(yel, iterations=34)
core = (yel | (lum < 30)) & near
core = nd.binary_fill_holes(core)
core = nd.binary_opening(core, iterations=2)
lab_c, nc = nd.label(core)                       # 一番大きい塊だけ残す
core = lab_c == (np.argmax(nd.sum(core, lab_c, range(1, nc + 1))) + 1)

# ---- 部位 ----
objs = nd.find_objects(lab)
areas = [(lab[o] == i + 1).sum() for i, o in enumerate(objs)]
body_id = max(range(n), key=lambda i: objs[i][0].stop) + 1      # 一番下まである塊 = 体
# 各ピクセルを最寄りの黄色領域に割り当てる
_, (iy, ix) = nd.distance_transform_edt(~yel, return_indices=True)
nearest = lab[iy, ix]
is_body = core & (nearest == body_id)
is_head = core & ~is_body

YY, XX = np.mgrid[0:Hh, 0:Ww]
body_ys = np.where(is_body.any(1))[0]
feet_y = body_ys.max() + 1
body_yel = lab == body_id
cx = int(round(np.where(body_yel[1100])[0].mean()))            # 胴の中心 x

# 腕: 胴の外側の黒フチより外側 (肩から斜めの線で切る)
def line_l(y): return 309 - (y - 920) * 0.22
def line_r(y): return 702 + (y - 960) * 0.25
arm_band = (YY >= 868) & (YY <= 1110)
armL = is_body & arm_band & (XX < line_l(YY))
armR = is_body & arm_band & (XX > line_r(YY))
# 回転したときに隙間が出ないよう、胴の下に潜り込む「のりしろ」
armL_x = armL | (is_body & (YY >= 868) & (YY <= 1010) & (XX < line_l(YY) + 34))
armR_x = armR | (is_body & (YY >= 868) & (YY <= 1010) & (XX > line_r(YY) - 34))

# 足: 股の下で左右に分割
CUT = 1220
legL = is_body & (YY >= CUT - 34) & (XX < cx)
legR = is_body & (YY >= CUT - 34) & (XX >= cx)
# 肩の上側の黒フチは胴に残す (腕を回しても肩の線が切れない)
torso = is_body & ~((armL | armR) & (YY >= 900)) & (YY < CUT)

# ---- 顔 (目と口) ----
head_yel = np.zeros_like(yel)
head_id = max(range(n), key=lambda i: areas[i] if i + 1 != body_id else 0) + 1
head_yel = lab == head_id
inside = nd.binary_fill_holes(head_yel) & ~head_yel
fl, fn = nd.label(nd.binary_dilation(inside, iterations=2) & (lum < 120))
feats = sorted([o for o in nd.find_objects(fl)], key=lambda o: (o[0].start, o[1].start))
feat_masks = [(fl == i + 1) for i in range(fn)]
mouth_i = max(range(fn), key=lambda i: feats[i][1].stop - feats[i][1].start)
eyes_i = [i for i in range(fn) if i != mouth_i]

def blank_face(rgb):
    out = rgb.copy()
    for m in feat_masks:
        out[nd.binary_dilation(m, iterations=3) & head_yel | m] = YELLOW
    return out

def with_mask(rgb, m):
    rgba = np.zeros((Hh, Ww, 4), np.uint8)
    rgba[..., :3] = np.where(m[..., None], rgb, 0)
    rgba[..., 3] = np.where(m, 255, 0)
    return rgba

base_rgb = img.astype(np.uint8).copy()
base_rgb[core & ~yel & (lum < 60)] = (14, 14, 13)   # 黒フチを均一に

# 顔の差分
def face_happy():
    rgb = blank_face(base_rgb)
    for i in eyes_i:                                  # 目はそのまま
        rgb[feat_masks[i]] = base_rgb[feat_masks[i]]
    m = feat_masks[mouth_i]
    ys, xs = np.where(m)
    y0, y1 = ys.min(), ys.max()
    flipped = np.zeros_like(m)
    flipped[y0 + y1 - ys - 14, xs] = True            # への字を上下反転 = にっこり
    rgb[flipped] = (14, 14, 13)
    # ほっぺ
    pil = Image.fromarray(rgb)
    d = ImageDraw.Draw(pil)
    for i in eyes_i:
        eys, exs = np.where(feat_masks[i])
        ex, ey = exs.mean(), eys.max() + 42
        ex += -28 if ex < cx else 28
        d.ellipse([ex - 30, ey - 15, ex + 30, ey + 15], fill=(255, 140, 70))
    return np.array(pil)

def face_dead():
    rgb = blank_face(base_rgb)
    rgb[feat_masks[mouth_i]] = base_rgb[feat_masks[mouth_i]]
    pil = Image.fromarray(rgb)
    d = ImageDraw.Draw(pil)
    for i in eyes_i:
        eys, exs = np.where(feat_masks[i])
        ex, ey = exs.mean(), eys.mean()
        s = 24
        d.line([ex - s, ey - s, ex + s, ey + s], fill=(14, 14, 13), width=16)
        d.line([ex - s, ey + s, ex + s, ey - s], fill=(14, 14, 13), width=16)
    return np.array(pil)

parts = {
    'armL': with_mask(base_rgb, armL_x),
    'armR': with_mask(base_rgb, armR_x),
    'legL': with_mask(base_rgb, legL),
    'legR': with_mask(base_rgb, legR),
    'torso': with_mask(base_rgb, torso),
    'head': with_mask(base_rgb, is_head),
    'headHappy': with_mask(face_happy(), is_head),
    'headDead': with_mask(face_dead(), is_head),
}

meta = {'scale': OUT_SCALE, 'height': round((feet_y - np.where(core.any(1))[0].min()) * OUT_SCALE, 2),
        'headTop': round((feet_y - np.where(head_yel.any(1))[0].min()) * OUT_SCALE, 2),
        'pivots': {
            'armL': [round((300 - cx) * OUT_SCALE, 1), round((905 - feet_y) * OUT_SCALE, 1)],
            'armR': [round((700 - cx) * OUT_SCALE, 1), round((905 - feet_y) * OUT_SCALE, 1)],
        }, 'parts': {}}
uris = {}
for name, rgba in parts.items():
    a = rgba[..., 3] > 0
    ys, xs = np.where(a)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    # 縮小しても端が揃うよう 4 の倍数に揃える
    step = int(round(1 / OUT_SCALE))
    x0 -= x0 % step; y0 -= y0 % step
    x1 += (-x1) % step; y1 += (-y1) % step
    im = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
    im = im.resize(((x1 - x0) // step, (y1 - y0) // step), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    uris[name] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    meta['parts'][name] = [(x0 - cx) * OUT_SCALE, (y0 - feet_y) * OUT_SCALE]
    if '--preview' in sys.argv:
        im.save(Path(sys.argv[-1]) / f'{name}.png')

block = ('// @sprites-begin (tools/make_sprites.py で自動生成)\n'
         f'const HERO_META = {json.dumps(meta)};\n'
         f'const HERO_SRC = {json.dumps(uris)};\n'
         '// @sprites-end')
html = HTML.read_text(encoding='utf-8')
html, k = re.subn(r'// @sprites-begin.*?// @sprites-end', lambda _: block, html, flags=re.S)
if k != 1:
    sys.exit('index.html に // @sprites-begin ... // @sprites-end が見つかりません')
HTML.write_text(html, encoding='utf-8')
print('OK', {k: len(v) for k, v in uris.items()}, json.dumps(meta))
