"""ワニのイラスト (assets/croc-original.webp) からプレイアブルキャラ用のパーツ画像を作り、
index.html の // @croc-begin ～ // @croc-end の間に data URI として埋め込む。

- 切れ目が見えないよう、体 (腕・しっぽこみ) はひとかたまりのまま使い、足の先だけを別パーツにして歩かせる
- 頭は表情の差し替え用に別パーツ (HEAD_SCALE=1 なのでイラストのバランスのまま)
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
SMILE = ROOT / 'assets' / 'croc-smile.webp'   # 笑顔のイラスト (にっこり目と口の色をここから取る)
HTML = ROOT / 'index.html'
OUT_SCALE = 0.3
HEAD_SCALE = 1.0  #             # 頭を少しだけ大きく (イラストの体のバランスを保ちつつ、てるしのくんに近い頭身に)
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
# 足: お腹の線より下 (左右の足が分かれるところ) から先だけ
legs = alpha & (YY >= 748) & ~((XX > 630))
def biggest(m):   # 小さなゴミ (はなれた点) を落とす
    l, n = nd.label(m)
    return l == (np.argmax(nd.sum(m, l, range(1, n + 1))) + 1) if n else m
legL_core = biggest(legs & (XX < 470))
legR_core = biggest(legs & (XX >= 470))
# しっぽ: 体の右うしろ
tail_core = alpha & (((XX > 712) & (YY > 455) & (YY < 712)) | ((XX > 630) & (YY >= 700)))
torso = alpha & ~head & ~legL_core & ~legR_core   # 腕・しっぽは体といっしょ (切れ目を作らない)
torso |= alpha & (YY >= 330) & (YY < 400)   # 首まわりは頭の下に重ねて隙間を防ぐ
# 肩口の線は体に残す (腕を振っても肩の輪郭が欠けないように)
for sx, sy in [(300, 448), (606, 452)]:
    torso |= alpha & (((XX - sx) ** 2 + (YY - sy) ** 2) < 30 ** 2)

# 動かしたときに隙間が出ないよう、体の下にもぐりこむ「のりしろ」をつける (体のうしろに描く)
def grow(core, cond, it):
    return core | (nd.binary_dilation(core, iterations=it) & alpha & cond)
# 腕は体の手前に描くので、のりしろは体の線がかくれる程度だけ
armL = grow(armL_core, YY < 660, 6)
armR = grow(armR_core, (YY < 660) & (XX < 712), 6)
legL = grow(legL_core, (XX < 470) & (YY > 700), 40)
legR = grow(legR_core, (XX >= 470) & (XX <= 630) & (YY > 700), 40)
tail = grow(tail_core, YY > 440, 34)

# ---- 顔の差分 ----
dark = alpha & (img[..., :3].sum(-1) < 150)
lab, n = nd.label(dark)
eyes, brows = [], []
for i, o in enumerate(nd.find_objects(lab)):
    h, w = o[0].stop - o[0].start, o[1].stop - o[1].start
    if 150 < o[0].start < 230 and 25 < h < 50 and 20 < w < 45:
        eyes.append(lab == i + 1)
    elif 100 < o[0].start < 150 and 12 < h < 30 and 30 < w < 70:
        brows.append(lab == i + 1)
assert len(eyes) == 2 and len(brows) == 2, (len(eyes), len(brows))

# 笑顔のイラストから「にっこり目」の線を取り出す (鼻の穴を目印に、元の絵の位置・大きさに合わせる)
sm = np.array(Image.open(SMILE).convert('RGBA')).astype(np.int32)
sm_dark = (sm[..., 3] > 128) & (sm[..., :3].sum(-1) < 150)
slab, sn = nd.label(sm_dark)
smile_eyes = []
for i, o in enumerate(nd.find_objects(slab)):
    h, w = o[0].stop - o[0].start, o[1].stop - o[1].start
    if 120 < o[0].start < 220 and 30 < h < 60 and 50 < w < 80:
        smile_eyes.append((o, slab[o] == i + 1))
assert len(smile_eyes) == 2, len(smile_eyes)
SM_NOSE, OLD_NOSE, SM_K = (269, 242), (261.5, 254), 0.95
sm_mouth = (sm[..., 3] > 128) & (sm[..., 0] > 180) & (sm[..., 1] < 140)
MOUTH_SMILE = tuple(int(v) for v in np.median(sm[sm_mouth][:, :3], axis=0))

rgb = img[..., :3].astype(np.uint8)
def face(kind):
    out = rgb.copy()
    for m in eyes:
        out[nd.binary_dilation(m, iterations=3) & head] = GREEN
    if kind == 'happy':
        # 笑顔のイラストに合わせる: まゆは消して、にっこり目を貼り、口の色を明るく
        for m in brows:
            out[nd.binary_dilation(m, iterations=3) & head] = GREEN
        red = head & (img[..., 0] > 180) & (img[..., 1] < 140)
        out[red] = MOUTH_SMILE
        for o, m in smile_eyes:
            mi = Image.fromarray((m * 255).astype(np.uint8))
            mi = mi.resize((round(mi.width * SM_K), round(mi.height * SM_K)), Image.LANCZOS)
            mm = np.array(mi) > 110
            x0 = round(OLD_NOSE[0] + (o[1].start - SM_NOSE[0]) * SM_K)
            y0 = round(OLD_NOSE[1] + (o[0].start - SM_NOSE[1]) * SM_K)
            region = out[y0:y0 + mm.shape[0], x0:x0 + mm.shape[1]]
            region[mm] = INK
        return out
    pil = Image.fromarray(out); d = ImageDraw.Draw(pil)
    for m in eyes:
        ys, xs = np.where(m); ex, ey = xs.mean(), ys.mean()
        if True:               # やられた目 (× ×)
            s = 16
            d.line([ex - s, ey - s, ex + s, ey + s], fill=INK, width=11)
            d.line([ex - s, ey + s, ex + s, ey - s], fill=INK, width=11)
    return np.array(pil)

def rgba_of(src_rgb, m):
    out = np.zeros((Hh, Ww, 4), np.uint8)
    out[..., :3] = np.where(m[..., None], src_rgb, 0)
    out[..., 3] = np.where(m, img[..., 3], 0)
    return out

# 腕を振ったときに体と腕のあいだに隙間が見えないよう、体の内側を塗りつぶした下じき (線なし・少し小さめ)
under_m = nd.binary_erosion(nd.binary_fill_holes(torso | armL_core | armR_core | (legL_core & (YY < 745)) | (legR_core & (YY < 745))) & (YY > 380), iterations=7)
under_rgb = np.zeros_like(rgb); under_rgb[:] = GREEN

parts = {
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
meta = {'height': round((feet_y - top_y) * OUT_SCALE, 2), 'flip': True, 'legLift': 0, 'legShift': 0, 'waddle': 0.07,   # 足は動かさず、体をよちよちゆらして歩く (切れ目が出ないように)
        'parts': {},
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
