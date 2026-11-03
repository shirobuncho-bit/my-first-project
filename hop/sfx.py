import numpy as np, wave, subprocess
SR=48000; FPS=24; N=24; CYC=3
dur=N*CYC/FPS
out=np.zeros(int(dur*SR)+SR)
def add(x,t):
    i=int(t*SR); out[i:i+len(x)]+=x[:len(out)-i]
def tone(f,dur,env_decay=0,harm=(1,.4,.15)):
    t=np.arange(int(dur*SR))/SR
    ph=2*np.pi*np.cumsum(f(t))/SR
    x=sum(h*np.sin((k+1)*ph) for k,h in enumerate(harm))
    return x
def jump():  # ぴょん: 上昇チャープ
    d=0.16; t=np.arange(int(d*SR))/SR
    x=tone(lambda t:450+1500*(t/d)**0.8,d)
    return x*np.sin(np.pi*t/d)**0.6*0.7
def land():  # ぽふっ(低い着地) + ぼよん
    d=0.12; t=np.arange(int(d*SR))/SR
    thud=np.sin(2*np.pi*np.cumsum(140-80*t/d)/SR)*np.exp(-t*35)
    rng=np.random.default_rng(1); n=rng.standard_normal(len(t))*np.exp(-t*60)*0.15
    d2=0.3; t2=np.arange(int(d2*SR))/SR
    b=tone(lambda t:(520-260*np.sin(np.pi*np.minimum(t/0.15,1))+120*(t>0.15)*(t-0.15)*5)*(1+0.03*np.sin(2*np.pi*20*t)),d2,harm=(1,.5))
    b=b*np.exp(-t2*9)*0.35
    y=np.zeros(int(0.45*SR)); y[:len(thud)]+=thud*0.9+n; y[int(0.03*SR):int(0.03*SR)+len(b)]+=b
    return y
def sparkle(): # 空中でちらっと
    d=0.1; t=np.arange(int(d*SR))/SR
    return tone(lambda t:2600+800*np.sin(2*np.pi*30*t),d,harm=(1,))*np.sin(np.pi*t/d)*0.12
for c in range(CYC):
    base=c*N/FPS
    add(jump(),base+0.22*N/FPS)
    add(sparkle(),base+0.50*N/FPS)
    add(land(),base+0.78*N/FPS)
out=out[:int(dur*SR)]
# 端のクリックを防ぐ
f=int(0.005*SR); out[:f]*=np.linspace(0,1,f); out[-f:]*=np.linspace(1,0,f)
out=out/np.abs(out).max()*0.85
w=wave.open('sfx.wav','wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR)
w.writeframes((out*32767).astype(np.int16).tobytes());w.close()
subprocess.run(['ffmpeg','-y','-loglevel','error','-i','hop.mp4','-i','sfx.wav','-c:v','copy','-c:a','aac','-b:a','160k','-shortest','hop_sound.mp4'],check=True)
