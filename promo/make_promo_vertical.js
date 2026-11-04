// てるしのくんRUN 15 秒 CM (Instagram 縦 1080x1920 版): ゲームを 1 コマずつ台本どおりに動かして画像に書き出し、
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
  // スマホ向けの動画なので、タイトルの操作説明はスマホ用の表示にする
  await ctxB.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => q.includes('pointer: coarse') ? { matches: true, addListener() {}, addEventListener() {} } : mm(q); });
  const pg = await ctxB.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file:///home/user/my-first-project/game/index.html');
  await pg.waitForTimeout(800);

  await pg.evaluate(({ FPS }) => {
    // 2 倍解像度で描く (1936x1088 → 1920x1080 に切り出す)
    W = 640; lightCv.width = W; lightCv.height = H;
    cv.width = W * 2; cv.height = H * 2; ctx.setTransform(2, 0, 0, 2, 0, 0);
    const gameCtx = ctx;
    const VC = document.createElement('canvas'); VC.width = 1080; VC.height = 1920;
    const vctx = VC.getContext('2d');
    const GY = 520, GH = Math.round(1080 * H / W);   // ゲーム画面を置く位置と高さ (1080x918)
    window.__V = { VC, vctx, gameCtx, GY, GH };
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
      const slide = (1 - Math.min(1, (f - f0) / 10)) * 30;
      const lines = str.split('\n');
      lines.forEach((ln, i) => text(ln, 540 + slide, GY + GH + 110 + i * 78, 64, '#ffffff', 'center', '#2a1640'));
      ctx.restore();
    }
    function fade(f, f0, f1, len = 6, color = '0,0,0') {
      const a = Math.max(0, 1 - (f - f0) / len, 1 - (f1 - f) / len);
      if (a > 0) { ctx.fillStyle = `rgba(${color},${clamp(a, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
    }
    function endCard(f) {
      const k = clamp((f - S.end) / 14, 0, 1);
      ctx.save(); ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(12,6,32,0.55)'; ctx.fillRect(0, 0, 1080, 1920);
      ctx.save(); ctx.translate(0, 470); ctx.scale(2.6, 2.6); drawAnniversary(540 / 2.6); drawTitleSparkles(540 / 2.6); ctx.restore();
      const pop = 1 + (1 - k) * 0.25;
      ctx.save(); ctx.translate(540, 760); ctx.scale(pop, pop);
      text('てるしのくん', 0, -70, 128, '#ffc61a', 'center', '#2a1640');
      text('RUN', 0, 70, 150, '#ffc61a', 'center', '#2a1640');
      ctx.restore();
      text('真夜中から、夜明けまで', 540, 930, 46, '#ffe6d0', 'center');
      text('駆けぬけろ！', 540, 992, 46, '#ffe6d0', 'center');
      drawHero(330, 1300 - Math.abs(Math.sin(f * 0.25)) * 20, { scale: 3, face: 1, walk: 0, happy: true, glow: true });
      drawHero(750, 1300 - Math.abs(Math.sin(f * 0.25 + 1.4)) * 20, { scale: 3, face: -1, walk: 0, happy: true, glow: true });
      const g = ctx.createLinearGradient(0, 1360, 0, 1470);
      g.addColorStop(0, 'rgba(255,214,120,0.97)'); g.addColorStop(1, 'rgba(230,150,60,0.97)');
      ctx.fillStyle = g; rr(140, 1360, 800, 110, 55); ctx.fill();
      ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 5; ctx.stroke();
      text('スマホ・PCで 今すぐプレイ！', 540, 1416, 52, '#2a1640', 'center', 'rgba(255,255,255,0.6)');
      text('shirobuncho-bit.github.io', 540, 1530, 36, '#cfd8ff', 'center');
      text('/my-first-project/game/', 540, 1578, 36, '#cfd8ff', 'center');
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
      // ゲーム画面を描く (2 倍解像度)
      ctx = __V.gameCtx;
      if (f < S.s2) render();
      else { drawWorld(); drawLoopBanner(); }
      for (const s2 of [S.s2, S.s3, S.s4, S.s5]) if (Math.abs(f - s2) < 5) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(f - s2) / 5})`; ctx.fillRect(0, 0, W, H); }
      // 縦長の画面に組み立てる
      const vc = __V.vctx; ctx = vc;
      const d = G.mode === 'title' ? 0 : dawnLevel();
      vc.setTransform(1, 0, 0, 1, 0, 0);
      vc.filter = 'blur(28px) brightness(0.55) saturate(1.2)';
      vc.drawImage(cv, -420, -80, 1920, 2080);
      vc.filter = 'none';
      const bg = vc.createLinearGradient(0, 0, 0, 1920);
      bg.addColorStop(0, rgba(keyed(SKY_KEYS, d, 1), 0.65)); bg.addColorStop(0.5, 'rgba(10,6,28,0.15)'); bg.addColorStop(1, rgba(keyed(SKY_KEYS, d, 1), 0.75));
      vc.fillStyle = bg; vc.fillRect(0, 0, 1080, 1920);
      if (f < S.end) {
        // 上: 30 周年の札とロゴ
        if (f >= S.s2) {   // タイトル画面の場面では、ゲーム画面の中にロゴがあるので出さない
          const ha = clamp((f - S.s2) / 10, 0, 1);
          vc.globalAlpha = ha;
          vc.save(); vc.translate(0, 196); vc.scale(2, 2); drawAnniversary(270); drawTitleSparkles(270); vc.restore();
          text('てるしのくんRUN', 540, 420, 84, '#ffc61a', 'center', '#2a1640');
          vc.globalAlpha = 1;
        }
        // まん中: ゲーム画面 (角を丸めて、光るふち)
        vc.save();
        vc.shadowColor = 'rgba(255,200,100,0.55)'; vc.shadowBlur = 40;
        rr(20, GY, 1040, GH, 28); vc.fillStyle = '#000'; vc.fill();
        vc.restore();
        vc.save(); rr(20, GY, 1040, GH, 28); vc.clip(); vc.drawImage(cv, 20, GY, 1040, GH); vc.restore();
        vc.strokeStyle = 'rgba(255,214,140,0.85)'; vc.lineWidth = 4; rr(20, GY, 1040, GH, 28); vc.stroke();
        // 下: 字幕
        if (f >= S.s2) {
          if (f < S.s3) caption('真夜中の丘を、\n駆けぬけろ！', f, S.s2 + 6, S.s3 - 4);
          else if (f < S.s4) caption('ためて、はなして、\nスーパーダッシュ！', f, S.s3 + 4, S.s4 - 4);
          else if (f < S.s5) caption('ループを決めて、\nハイスコア！', f, S.s4 + 4, S.s5 - 4);
          else caption('めざすは、日の出。', f, S.s5 + 10, S.end - 4);
        } else {
          const a2 = clamp((f - 20) / 12, 0, 1);
          vc.globalAlpha = a2; text('30周年記念ゲーム、登場！', 540, GY + GH + 130, 60, '#ffffff', 'center', '#2a1640'); vc.globalAlpha = 1;
        }
      } else endCard(f);
      // はじめは黒から、締めの前に白く光る、最後は暗転
      if (f < 10) { vc.fillStyle = `rgba(0,0,0,${1 - f / 10})`; vc.fillRect(0, 0, 1080, 1920); }
      if (f >= S.end - 5 && f < S.end + 6) { vc.fillStyle = `rgba(255,250,235,${1 - Math.abs(f - S.end) / 6})`; vc.fillRect(0, 0, 1080, 1920); }
      if (f >= N_FRAMES - 10) { vc.fillStyle = `rgba(0,0,0,${(f - (N_FRAMES - 10)) / 10})`; vc.fillRect(0, 0, 1080, 1920); }
      ctx = __V.gameCtx;
      return __V.VC.toDataURL('image/jpeg', 0.93);

    };
    window.N_FRAMES = 450;
  }, { FPS });

  for (let f = 0; f < N; f++) {
    const url = await pg.evaluate(f => __frame(f), f);
    fs.writeFileSync(path.join(OUT, 'vframes', String(f).padStart(4, '0') + '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
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
    master.gain.setValueAtTime(0.9, 0); master.gain.setValueAtTime(0.9, SEC - 1.2); master.gain.linearRampToValueAtTime(0.0001, SEC - 0.05);
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
  fs.writeFileSync(path.join(OUT, 'vaudio.wav'), Buffer.from(wavB64, 'base64'));
  const log = await pg.evaluate(() => __log.map(e => e.k + '@' + e.t.toFixed(2)).filter((v, i, a) => !v.startsWith('drop') && a.indexOf(v) === i).join(' '));
  console.log('sfx:', log);
  console.log('errors', errs);
  await b.close();
})();
