// 使い方: node export_frames.js <hop_page.html> <出力ディレクトリ> <sky|none>
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [,,page,out,bg]=process.argv;fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:420,height:900}});
await p.goto('file://'+require('path').resolve(page));await p.waitForTimeout(600);
const N=25, blink=[0,0,0,0,0,0,0,0,.55,.1,.08,.5,1];
for(let i=0;i<N;i++){
  const k=i>=9&&i<9+4?[.55,.1,.1,.55][i-9]:1;
  const url=await p.evaluate(([i,N,k,bg])=>{
    running=false;window.eyeK=()=>k;
    setBg(bg);draw(i/N);return cv.toDataURL('image/png')},[i,N,k,bg]);
  fs.writeFileSync(`${out}/f${String(i).padStart(3,'0')}.png`,Buffer.from(url.split(',')[1],'base64'));
}
await b.close()})();
