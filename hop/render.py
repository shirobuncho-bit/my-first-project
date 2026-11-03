import cv2, numpy as np, subprocess, math
im=cv2.imread('original.png'); m=cv2.imread('mask.png',0); L=cv2.imread('lines.png',0)
bg=cv2.imread('bg.png')
H,W=im.shape[:2]
def soft(a): return cv2.GaussianBlur(a,(0,0),1.2).astype(np.float32)/255
body_m=soft(cv2.subtract(m,L)); line_m=soft(L)
ax,ay=560,1395            # 足元の基準点
FPS=24; N=24*1   # 1サイクル1秒
CYCLES=3
def ease(t): return t*t*(3-2*t)
def pose(t):
    # t in [0,1): returns (height, sx, sy, rot)
    if t<0.18:   # 溜め
        k=ease(t/0.18); return 0, 1+0.10*k, 1-0.16*k, 0
    if t<0.28:   # 踏切(伸び)
        k=(t-0.18)/0.10; return 0, 1.10-0.20*k, 0.84+0.30*k, 0
    if t<0.78:   # 空中
        k=(t-0.28)/0.50; h=4*k*(1-k)*95
        s=1-0.06*math.cos(k*math.pi*2)*0  # 
        st=1.14-0.14*min(1,k*2) if k<0.5 else 1.0+0.07*(k-0.5)*2
        return h, 1/st**0.5, st, 0.05*math.sin(k*math.pi*2+math.pi)*-1
    if t<0.90:   # 着地つぶれ
        k=(t-0.78)/0.12; return 0, 1+0.16*math.sin(k*math.pi/2), 1-0.20*math.sin(k*math.pi/2), 0
    k=(t-0.90)/0.10; return 0, 1.16-0.06*ease(k)-0.0, 0.80+0.04*ease(k), 0
def frame(f):
    t=(f%N)/N
    h,sx,sy,rot=pose(t)
    # 上部のゆれ(慣性): 空中で頭側が遅れて伸縮
    lag=math.sin(2*math.pi*(t-0.28)*1.5)*0.03*(1 if 0.28<t<0.95 else 0)
    # 出力->入力 逆写像
    ys,xs=np.mgrid[0:H,0:W].astype(np.float32)
    # 出力座標から基準点を引く
    X=xs-ax; Y=ys-(ay-h)
    c,s=math.cos(-rot),math.sin(-rot)
    Xr=c*X-s*Y; Yr=s*X+c*Y
    syrow=sy*(1+lag*(-Yr/1000))
    mx=ax+Xr/sx; my=ay+Yr/syrow
    wb=cv2.remap(im,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)
    wm=cv2.remap(body_m,mx,my,cv2.INTER_LINEAR)
    out=bg.astype(np.float32).copy()
    # 影
    sh=np.zeros((H,W),np.float32)
    hh=h/95
    cv2.ellipse(sh,(ax-30,ay+10),(int(230*(1-0.4*hh)*sx),int(26*(1-0.4*hh))),0,0,360,1,-1)
    sh=cv2.GaussianBlur(sh,(0,0),14)*(0.75-0.45*hh)
    out*= (1-sh)[...,None]
    out=out*(1-wm[...,None])+wb*wm[...,None]
    # 動き線(空中でちらつく)
    if 0.20<t<0.85:
        dy=-h*0.0
        M=np.float32([[1,0,0],[0,1,-h*0.6+ (30 if t<0.5 else -10)]])
        lm=cv2.warpAffine(line_m,M,(W,H))
        a=lm*(0.9 if (f%4<2) else 0.5)
        out=out*(1-a[...,None])
    return np.clip(out,0,255).astype(np.uint8)
p=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
  '-vf','scale=720:-2','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','hop.mp4'],stdin=subprocess.PIPE)
fr=[frame(f) for f in range(N*CYCLES)]
for x in fr: p.stdin.write(x.tobytes())
p.stdin.close(); p.wait()
for i,t in enumerate([0.1,0.25,0.5,0.85]):
    cv2.imwrite(f'f{i}.png',cv2.resize(fr[int(t*N)],None,fx=0.35,fy=0.35))
cv2.imwrite('sheet.png',np.hstack([cv2.imread(f'f{i}.png') for i in range(4)]))
