// 使い方: node export_walk.js <walk_page.html> <出力ディレクトリ> <sky|sunset|night|pop|none>
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [,,page,out,bg]=process.argv;fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:420,height:900}});
await pg.goto('file://'+require('path').resolve(page));await pg.waitForTimeout(500);
const N=40;
for(let i=0;i<N;i++){
  const k=(i>=14&&i<18)?[.55,.1,.1,.55][i-14]:1;
  const url=await pg.evaluate(([i,N,k,bg])=>{started=false;eyeK=()=>k;setBg(bg);draw(i/N,240);return cv.toDataURL('image/png')},[i,N,k,bg]);
  fs.writeFileSync(`${out}/f${String(i).padStart(3,'0')}.png`,Buffer.from(url.split(',')[1],'base64'));
}
await b.close()})();
