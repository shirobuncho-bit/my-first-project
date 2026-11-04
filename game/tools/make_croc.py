"""ワニのイラスト (assets/croc-original.webp) からプレイアブルキャラ用のパーツ画像を作り、
index.html の // @croc-begin ～ // @croc-end の間に data URI として埋め込む。

- てるしのくんと同じ頭身になるよう、頭だけ HEAD_SCALE 倍に大きくして首でつなぐ
- 元の絵は左向きなので、ゲームでは左右反転して使う (meta.flip)

使い方:  python3 game/tools/make_croc.py [--preview 出力フォルダ]
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
SRC = ROOT / 'assets' / 'croc-original.webp'
HTML = ROOT / 'index.html'
OUT_SCALE = 0.3
HEAD_SCALE = 1.5              # 頭を大きくして、てるしのくんと同じくらいの頭身に
NECK = (440, 380)             # 頭を大きくするときの基準点 (首のまん中)
FEET_CX = 470                 # 足もとの中心 x
GREEN = (82, 126, 66)
INK = (12, 12, 12)

img = np.array(Image.open(SRC).convert('RGBA')).astype(np.int32)
Hh, Ww, _ = img.shape
alpha = img[..., 3] > 128
YY, XX = np.mgrid[0:Hh, 0:Ww]
feet_y = np.where(alpha.any(1))[0].max() + 1

# ---- 部位の切り分け (元画像の座標で) ----
head = alpha & (((XX < 600) & (YY < 384)) | ((XX >= 600) & (YY < 346)))
# 腕: 体の線より外側のふくらみ
armL_core = alpha & (YY > 418) & (YY < 655) & (XX < 326 - (YY - 430) * 0.13)
armR_core = alpha & (YY > 430) & (YY < 655) & (XX > 597 + (YY - 445) * 0.24) & (XX < 712)
# 足: お腹の下
legs = alpha & (YY >= 712) & ~((XX > 630))
legL_core = legs & (XX < 470)
legR_core = legs & (XX >= 470)
# しっぽ: 体の右うしろ
tail_core = alpha & (((XX > 712) & (YY > 455) & (YY < 712)) | ((XX > 630) & (YY >= 700)))
torso = alpha & ~head & ~armL_core & ~armR_core & ~legL_core & ~legR_core & ~tail_core
torso |= alpha & (YY >= 330) & (YY < 400) & ~armL_core & ~armR_core   # 首まわりは頭の下に重ねて隙間を防ぐ

# 動かしたときに隙間が出ないよう、体の下にもぐりこむ「のりしろ」をつける (体のうしろに描く)
def grow(core, cond, it):
    return core | (nd.binary_dilation(core, iterations=it) & alpha & cond)
armL = grow(armL_core, YY < 660, 30)
armR = grow(armR_core, (YY < 660) & (XX < 712), 30)
legL = grow(legL_core, (XX < 470) & (YY > 660), 40)
legR = grow(legR_core, (XX >= 470) & (XX <= 630) & (YY > 660), 40)
tail = grow(tail_core, YY > 440, 34)

# ---- 顔の差分 ----
dark = alpha & (img[..., :3].sum(-1) < 150)
lab, n = nd.label(dark)
eyes = []
for i, o in enumerate(nd.find_objects(lab)):
    h, w = o[0].stop - o[0].start, o[1].stop - o[1].start
    if 150 < o[0].start < 230 and 25 < h < 50 and 20 < w < 45:
        eyes.append(lab == i + 1)
assert len(eyes) == 2, len(eyes)

rgb = img[..., :3].astype(np.uint8)
def face(kind):
    out = rgb.copy()
    for m in eyes:
        out[nd.binary_dilation(m, iterations=3) & head] = GREEN
    pil = Image.fromarray(out); d = ImageDraw.Draw(pil)
    for m in eyes:
        ys, xs = np.where(m); ex, ey = xs.mean(), ys.mean()
        if kind == 'happy':    # にっこり目 (^ ^)
            d.arc([ex - 22, ey - 10, ex + 22, ey + 30], 200, 340, fill=INK, width=11)
        else:                  # やられた目 (× ×)
            s = 16
            d.line([ex - s, ey - s, ex + s, ey + s], fill=INK, width=11)
            d.line([ex - s, ey + s, ex + s, ey - s], fill=INK, width=11)
    return np.array(pil)

def rgba_of(src_rgb, m):
    out = np.zeros((Hh, Ww, 4), np.uint8)
    out[..., :3] = np.where(m[..., None], src_rgb, 0)
    out[..., 3] = np.where(m, img[..., 3], 0)
    return out

parts = {
    'tail': (rgba_of(rgb, tail), 1.0),
    'armL': (rgba_of(rgb, armL), 1.0),
    'armR': (rgba_of(rgb, armR), 1.0),
    'legL': (rgba_of(rgb, legL), 1.0),
    'legR': (rgba_of(rgb, legR), 1.0),
    'torso': (rgba_of(rgb, torso), 1.0),
    'head': (rgba_of(rgb, head), HEAD_SCALE),
    'headHappy': (rgba_of(face('happy'), head), HEAD_SCALE),
    'headDead': (rgba_of(face('dead'), head), HEAD_SCALE),
}

# 頭を大きくしたあとの、頭のてっぺん (= 全体の高さ)
head_top = np.where(head.any(1))[0].min()
top_y = NECK[1] - (NECK[1] - head_top) * HEAD_SCALE
meta = {'height': round((feet_y - top_y) * OUT_SCALE, 2), 'flip': True, 'parts': {},
        'pivots': {
            # 腕は肩、しっぽは付け根を軸に回す (足もと中心からの座標)
            'armL': [round((300 - FEET_CX) * OUT_SCALE, 1), round((455 - feet_y) * OUT_SCALE, 1)],
            'armR': [round((612 - FEET_CX) * OUT_SCALE, 1), round((462 - feet_y) * OUT_SCALE, 1)],
            'tail': [round((712 - FEET_CX) * OUT_SCALE, 1), round((660 - feet_y) * OUT_SCALE, 1)],
        }}
uris = {}
for name, (rgba, sc) in parts.items():
    a = rgba[..., 3] > 0
    ys, xs = np.where(a)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    im = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
    k = OUT_SCALE * sc
    im = im.resize((max(1, round((x1 - x0) * k)), max(1, round((y1 - y0) * k))), Image.LANCZOS)
    if sc != 1.0:   # 首を基準に大きくする
        ox = NECK[0] + (x0 - NECK[0]) * sc
        oy = NECK[1] + (y0 - NECK[1]) * sc
    else:
        ox, oy = x0, y0
    meta['parts'][name] = [round((ox - FEET_CX) * OUT_SCALE, 2), round((oy - feet_y) * OUT_SCALE, 2)]
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    uris[name] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    if '--preview' in sys.argv:
        im.save(Path(sys.argv[-1]) / f'croc_{name}.png')

block = ('// @croc-begin (tools/make_croc.py で自動生成)\n'
         f'const CROC_META = {json.dumps(meta)};\n'
         f'const CROC_SRC = {json.dumps(uris)};\n'
         '// @croc-end')
html = HTML.read_text(encoding='utf-8')
html, k = re.subn(r'// @croc-begin.*?// @croc-end', lambda _: block, html, flags=re.S)
if k != 1:
    sys.exit('index.html に // @croc-begin ... // @croc-end が見つかりません')
HTML.write_text(html, encoding='utf-8')
print('OK', {k: len(v) for k, v in uris.items()}, json.dumps(meta))
