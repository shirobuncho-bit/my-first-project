import cv2, numpy as np
im=cv2.imread('original.png')
hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
yellow=((hsv[...,0]>15)&(hsv[...,0]<40)&(hsv[...,1]>150)&(hsv[...,2]>150)).astype(np.uint8)
yellow=cv2.morphologyEx(yellow,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(41,41))
body=cv2.dilate(yellow,k)
# 動き線: 本体から離れた真っ黒の塊
black=(im.max(2)<7).astype(np.uint8)
n,lab,st,_=cv2.connectedComponentsWithStats(black)
lines=np.zeros_like(black)
for i in range(1,n):
    x,y,w,h,a=st[i]
    if a>150 and y>1150 and (x+w<280 or x>660) and body[lab==i].mean()<0.5: lines[lab==i]=1
lines=cv2.dilate(lines,np.ones((3,3),np.uint8))
mask=np.maximum(body,lines)
# 穴埋め
cnts,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
m=np.zeros_like(mask); cv2.drawContours(m,cnts,-1,1,-1)
cv2.imwrite('mask.png',m*255); cv2.imwrite('lines.png',lines*255)
# 背景: キャラを消して補完
bg=cv2.inpaint(im,cv2.dilate(m,np.ones((31,31),np.uint8))*255,15,cv2.INPAINT_TELEA)
bg=cv2.GaussianBlur(bg,(0,0),12)
cv2.imwrite('bg.png',bg)
cv2.imwrite('check.png',cv2.resize(np.hstack([cv2.cvtColor(m*255,cv2.COLOR_GRAY2BGR),bg]),None,fx=0.4,fy=0.4))
