// てるしのくんRUN 15 秒 CM: ゲームを 1 コマずつ台本どおりに動かして画像に書き出し、
// ゲーム内のシンセで BGM・効果音を書き出して、ffmpeg で MP4 にまとめる。
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = __dirname;
const FPS = 30, SEC = 15, N = FPS * SEC;

(async () => {
  const b = await chromium.launch();
  const ctxB = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  // ゲームのメインループを止めて、こちらから 1 コマずつ進める
  await ctxB.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  const pg = await ctxB.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file:///home/user/my-first-project/game/index.html');
  await pg.waitForTimeout(800);

  await pg.evaluate(({ FPS }) => {
    // 2 倍解像度で描く (1936x1088 → 1920x1080 に切り出す)
    cv.width = W * 2; cv.height = H * 2; ctx.setTransform(2, 0, 0, 2, 0, 0);
    while (!chunks.length || chunks.filter(Boolean).length < Math.ceil(L.LW / CHUNK)) { warmChunks(); if (chunks.filter(Boolean).length >= Math.ceil(L.LW / CHUNK)) break; }
    // 効果音は鳴らさずに「いつ・どれが鳴ったか」だけ記録 (あとで音声トラックに書き出す)
    window.__t = 0; window.__log = []; window.__orig = {};
    for (const k of Object.keys(sfx)) { __orig[k] = sfx[k]; sfx[k] = (...a) => __log.push({ t: __t, k, a }); }
    window.__dawn = []; window.__charge = [];
    const S = { title: 0, s2: 75, s3: 150, s4: 225, s5: 332, end: 384 };
    window.__S = S;
    function place(tx, vx, extra = {}) {
      for (const k in keys) keys[k] = false;
      loadLevel();
      P = makePlayer(tx);
      const fx = P.x + P.w / 2;
      const s = surfaceAt(fx, 0, H) ; // 足もとの地面
      P.y = (s ? s.y : 15 * T) - P.h; P.onGround = true; P.vx = vx; P.face = 1;
      G.mode = 'play'; G.paused = false; G.lives = 3;
      Object.assign(G, extra);
      L.camX = clamp(P.x + P.w / 2 - W * 0.38, 0, L.LW * T - W);
      L.prog = progressOf(P.x);
      L.zone = lastIndexWhere(ZONES, z => P.x >= z.x * T);   // ゾーン看板は出さない (字幕を使う)
    }
    function caption(str, f, f0, f1) {
      const a = clamp(Math.min((f - f0) / 8, (f1 - f) / 8), 0, 1);
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, 22, 0, 128);
      g.addColorStop(0, 'rgba(10,6,28,0)'); g.addColorStop(0.3, 'rgba(10,6,28,0.62)'); g.addColorStop(0.7, 'rgba(10,6,28,0.62)'); g.addColorStop(1, 'rgba(10,6,28,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 22, W, 106);
      const slide = (1 - Math.min(1, (f - f0) / 10)) * 18;
      text(str, W / 2 + slide, 76, 40, '#ffffff', 'center', '#2a1640');
      ctx.restore();
    }
    function fade(f, f0, f1, len = 6, color = '0,0,0') {
      const a = Math.max(0, 1 - (f - f0) / len, 1 - (f1 - f) / len);
      if (a > 0) { ctx.fillStyle = `rgba(${color},${clamp(a, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
    }
    function endCard(f) {
      const k = clamp((f - S.end) / 14, 0, 1);
      drawWorld();
      ctx.fillStyle = `rgba(12,6,32,${0.25 + k * 0.5})`; ctx.fillRect(0, 0, W, H);
      const cx = W / 2;
      ctx.save(); ctx.globalAlpha = k;
      ctx.save(); ctx.translate(0, 64); drawAnniversary(cx); drawTitleSparkles(cx); ctx.restore();
      const pop = 1 + (1 - k) * 0.25;
      ctx.save(); ctx.translate(cx, 214); ctx.scale(pop, pop);
      text('てるしのくんRUN', 0, 0, 84, '#ffc61a', 'center', '#2a1640');
      ctx.restore();
      text('真夜中から、夜明けまで駆けぬけろ！', cx, 296, 26, '#ffe6d0', 'center');
      const bob = Math.abs(Math.sin(f * 0.25)) * 10;
      drawHero(cx - 380, 440 - bob, { scale: 1.5, face: 1, walk: 0, happy: true, glow: true });
      drawHero(cx + 380, 440 - Math.abs(Math.sin(f * 0.25 + 1.4)) * 10, { scale: 1.5, face: -1, walk: 0, happy: true, glow: true });
      // 今すぐプレイ
      const g = ctx.createLinearGradient(0, 356, 0, 412);
      g.addColorStop(0, 'rgba(255,214,120,0.97)'); g.addColorStop(1, 'rgba(230,150,60,0.97)');
      ctx.fillStyle = g; rr(cx - 230, 356, 460, 56, 28); ctx.fill();
      ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 3; ctx.stroke();
      text('スマホ・PCで 今すぐプレイ！', cx, 385, 28, '#2a1640', 'center', 'rgba(255,255,255,0.6)');
      text('shirobuncho-bit.github.io/my-first-project/game/', cx, 452, 19, '#cfd8ff', 'center');
      ctx.restore();
    }
    // 1 コマ分進めて描く
    window.__frame = f => {
      __t = f / FPS;
      if (f === S.title) { G.mode = 'title'; loadLevel(); G.frame = 0; }
      if (f === S.s2) { place(37, 6, { score: 1260, drops: 12, clock: 9 * 60 }); keys.right = true; }
      if (f === S.s3) { place(110, 0, { score: 6840, drops: 31, clock: 27 * 60 }); keys.run = true; keys.right = false; }
      if (f === S.s3 + 26) { keys.run = false; keys.right = true; }
      if (f === S.s4) { place(398, 13, { score: 14120, drops: 58, clock: 41 * 60, cpi: 2 }); keys.right = true; }
      if (f === S.s5) { place(503, 3, { score: 21980, drops: 77, clock: 52 * 60, cpi: 3 }); keys.right = true; }
      // ゲームを進める (日の出は少し早回し)
      const steps = f >= S.end ? 1 : f >= S.s5 ? 4 : 2;
      for (let i = 0; i < steps; i++) { update(); for (const k in pressed) delete pressed[k]; }
      __dawn.push(G.mode === 'title' ? 0 : f >= S.end ? 1 : dawnLevel());
      __charge.push(!!(P && P.charging));
      // 描く
      if (f < S.s2) render();
      else if (f < S.end) {
        drawWorld();
        ctx.save(); ctx.translate(0, 74); drawLoopBanner(); ctx.restore();   // 字幕と重ならないよう少し下に
        if (f < S.s3) caption('真夜中の丘を、駆けぬけろ！', f, S.s2 + 6, S.s3 - 4);
        else if (f < S.s4) caption('ためて、はなして、スーパーダッシュ！', f, S.s3 + 4, S.s4 - 4);
        else if (f < S.s5) caption('ループを決めて、ハイスコア！', f, S.s4 + 4, S.s5 - 4);
        else caption('めざすは、日の出。', f, S.s5 + 10, S.end - 4);
      } else endCard(f);
      // 場面のつなぎ目は短く暗転
      if (f < 10) { ctx.fillStyle = `rgba(0,0,0,${1 - f / 10})`; ctx.fillRect(0, 0, W, H); }   // はじめだけ黒から
      for (const s of [S.s2, S.s3, S.s4, S.s5]) if (Math.abs(f - s) < 5) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(f - s) / 5})`; ctx.fillRect(0, 0, W, H); }
      if (f >= S.end - 5 && f < S.end + 6) { ctx.fillStyle = `rgba(255,250,235,${1 - Math.abs(f - S.end) / 6})`; ctx.fillRect(0, 0, W, H); }
      return cv.toDataURL('image/jpeg', 0.93);
    };
    window.N_FRAMES = 450;
  }, { FPS });

  for (let f = 0; f < N; f++) {
    const url = await pg.evaluate(f => __frame(f), f);
    fs.writeFileSync(path.join(OUT, 'frames', String(f).padStart(4, '0') + '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
    if (f % 75 === 0) console.log('frame', f);
  }

  // 音声トラック: BGM (時間とともに夜明けへ) + 記録した効果音
  const wavB64 = await pg.evaluate(async ({ SEC, FPS }) => {
    const SR = 44100;
    const off = new OfflineAudioContext(2, SR * SEC, SR);
    window.__tOff = 0;
    Object.defineProperty(off, 'currentTime', { get: () => window.__tOff, configurable: true });
    off.resume = () => Promise.resolve();
    const Real = window.AudioContext; window.AudioContext = function () { return off; }; AC = null; initAudio(); window.AudioContext = Real;
    for (const k of Object.keys(__orig)) sfx[k] = __orig[k];
    // BGM
    let t = 0.25, step = 0;
    while (t < SEC) {
      const d = __dawn[Math.min(__dawn.length - 1, Math.floor(t * FPS))];
      const st = 60 / (108 + d * 30) / 4;
      playStep(step++, t, d, st);
      t += st;
    }
    // 効果音 (同じ瞬間の連打は間引く)
    const seen = new Set();
    for (const e of __log) {
      const key = e.k + Math.round(e.t * 20);
      if ((e.k === 'drop' && seen.has(key)) || e.k === 'tick') continue;
      seen.add(key);
      __tOff = e.t; try { sfx[e.k](...e.a); } catch (err) { }
    }
    // ためダッシュの「ウィーン」
    let c0 = -1;
    __charge.forEach((c, i) => {
      if (c && c0 < 0) c0 = i;
      if (!c && c0 >= 0) { __tOff = c0 / FPS; voice({ f: 110, f2: 440, d: (i - c0) / FPS, r: 0.05, type: 'sawtooth', v: 0.035, cut: 500, cut2: 4000, q: 6, vib: 20, vibF: 16 }); c0 = -1; }
    });
    __tOff = 0;
    master.gain.setValueAtTime(0.9, 0); master.gain.setValueAtTime(0.9, SEC - 0.15); master.gain.linearRampToValueAtTime(0.0001, SEC - 0.01);
    const buf = await off.startRendering();
    // 16bit WAV に
    const n = buf.length, ch = 2, data = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); ws(8, 'WAVEfmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
    data.setUint16(22, ch, true); data.setUint32(24, SR, true); data.setUint32(28, SR * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true);
    ws(36, 'data'); data.setUint32(40, n * ch * 2, true);
    const L0 = buf.getChannelData(0), R0 = buf.getChannelData(1);
    let o = 44;
    for (let i = 0; i < n; i++) { for (const v of [L0[i], R0[i]]) { data.setInt16(o, Math.max(-1, Math.min(1, v)) * 32767, true); o += 2; } }
    const bytes = new Uint8Array(data.buffer); let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, { SEC, FPS });
  fs.writeFileSync(path.join(OUT, 'audio.wav'), Buffer.from(wavB64, 'base64'));
  const log = await pg.evaluate(() => __log.map(e => e.k + '@' + e.t.toFixed(2)).filter((v, i, a) => !v.startsWith('drop') && a.indexOf(v) === i).join(' '));
  console.log('sfx:', log);
  console.log('errors', errs);
  await b.close();
})();
