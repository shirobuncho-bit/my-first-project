import pyopenjtalk, numpy as np, wave, subprocess, sys
SR=48000
def save(name,x,sr=SR):
    x=x/ max(1e-9,np.abs(x).max())*0.8
    w=wave.open(name,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr)
    w.writeframes((x*32767).astype(np.int16).tobytes());w.close()
def tts(text,speed=1.0,ht=0):
    labels=pyopenjtalk.extract_fullcontext(text)
    x,sr=pyopenjtalk.synthesize(labels,speed=speed,half_tone=ht)
    x=x.astype(np.float32)
    return x/32768 if np.abs(x).max()>2 else x
def ff(inp,out,af):
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',inp,'-af',af,out],check=True)
# 1 そのままの声
save('1_plain.wav',tts("ぴょん！わーい！"),SR)
# 2 高め+速め (ピッチ上げ)
for n,ht,sp in [('2_high',6,1.1),('3_veryhigh',10,1.2)]:
    save(f'tmp_{n}.wav',tts("ぴょん！わーい！",sp,ht)); ff(f'tmp_{n}.wav',f'{n}.wav','aecho=0.8:0.7:40:0.2')
# 4 ピッチシフトをffmpegで (声質も幼く)
save('tmp4.wav',tts("ぴょんぴょん！たのしいな！",1.05,0))
ff('tmp4.wav','4_child.wav','asetrate=48000*1.35,aresample=48000,atempo=1/1.35*1.1')
# 5 鳴き声合成: ぴょん(上昇チャープ) + きゃっ
t=np.arange(int(0.18*SR))/SR
f=500+1800*(t/0.18)**0.7; ph=2*np.pi*np.cumsum(f)/SR
env=np.sin(np.pi*t/0.18)**0.5
a=(np.sin(ph)+0.4*np.sin(2*ph)+0.15*np.sin(3*ph))*env
t2=np.arange(int(0.25*SR))/SR
f2=1400+500*np.sin(2*np.pi*14*t2)-1200*(t2/0.25)
ph2=2*np.pi*np.cumsum(f2)/SR
b=(np.sin(ph2)+0.3*np.sin(2*ph2))*np.sin(np.pi*t2/0.25)**0.7
sil=np.zeros(int(0.12*SR))
save('5_chirp.wav',np.concatenate([a,sil,a,sil,b]))
# 6 ぽよん(ばね): 下がって上がるピッチ+ビブラート
t3=np.arange(int(0.5*SR))/SR
f3=(700-380*np.sin(np.pi*np.minimum(t3/0.25,1))+250*(t3>0.25)*(t3-0.25)*4)*(1+0.04*np.sin(2*np.pi*22*t3))
ph3=2*np.pi*np.cumsum(f3)/SR
c=(np.sin(ph3)+0.5*np.sin(2*ph3))*np.exp(-3.5*t3)
save('6_boing.wav',c)
