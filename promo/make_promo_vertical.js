// てるしのくんRUN 15 秒 CM (Instagram 縦 1080x1920 版): ゲームを 1 コマずつ台本どおりに動かして画像に書き出し、
// ゲーム内のシンセで BGM・効果音を書き出して、ffmpeg で MP4 にまとめる。
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = __dirname;
const FPS = 30, SEC = 16.5, N = Math.round(FPS * SEC);

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
    const S = { title: 0, s2: 75, s3: 150, sel: 225, s4: 270, s5: 377, end: 429 };   // sel: キャラえらび (ワニに切りかえ)
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
    const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const ease = (f, f0, len) => clamp((f - f0) / len, 0, 1);
    // ===== ポップな演出の部品 =====
    const POP = ['#ffb347', '#ff7eb6', '#5ec8ff', '#6fd6b0', '#7ee08a', '#ffd84a', '#ffb347'];      // 場面ごとの背景色
    const POPD = ['#d96a00', '#d6336c', '#1b78c2', '#1f9a78', '#2b9a48', '#d99a00', '#d96a00'];     // 字幕リボンの色
    const sceneOf = f => f < S.s2 ? 0 : f < S.s3 ? 1 : f < S.sel ? 2 : f < S.s4 ? 3 : f < S.s5 ? 4 : f < S.end ? 5 : 6;
    const cutOf = i => [S.title, S.s2, S.s3, S.sel, S.s4, S.s5, S.end][i];
    function popBG(vc, f, i) {   // 回るサンバースト + 水玉
      vc.fillStyle = POP[i]; vc.fillRect(0, 0, 1080, 1920);
      vc.save(); vc.translate(540, 1000); vc.rotate(f * 0.006);
      vc.fillStyle = 'rgba(255,255,255,0.24)';
      for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; vc.beginPath(); vc.moveTo(0, 0); vc.arc(0, 0, 1700, a, a + Math.PI / 18); vc.closePath(); vc.fill(); }
      vc.restore();
      vc.fillStyle = 'rgba(255,255,255,0.22)';
      for (let y = -1; y < 22; y++) for (let x = -1; x < 13; x++) {
        const px = x * 96 + (y % 2) * 48 + (f * 0.8) % 96, py = y * 96 + (f * 0.8) % 96;
        vc.beginPath(); vc.arc(px, py, 9, 0, Math.PI * 2); vc.fill();
      }
      const vg = vc.createRadialGradient(540, 960, 500, 540, 960, 1250);
      vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(120,40,80,0.25)');
      vc.fillStyle = vg; vc.fillRect(0, 0, 1080, 1920);
    }
    // ずっと舞っている紙ふぶき・星・ハート
    const CONF = Array.from({ length: 46 }, (_, i) => ({ x: hash(i * 2.1) * 1080, y: hash(i * 3.3) * 2000, sp: 2 + hash(i * 4.7) * 4, w: hash(i * 5.9) * 6.28, kind: i % 4,
      c: ['#ffffff', '#ff5d8f', '#ffd23f', '#5ec8ff', '#8a5cff', '#7ee08a'][i % 6], r: 9 + hash(i * 7.1) * 10 }));
    function shape(vc, kind, r) {
      vc.beginPath();
      if (kind === 0) vc.rect(-r, -r * 0.45, r * 2, r * 0.9);
      else if (kind === 1) { for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr2 = k % 2 ? r * 0.45 : r; vc.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } vc.closePath(); }
      else if (kind === 2) vc.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      else { vc.moveTo(0, r * 0.8); vc.bezierCurveTo(-r * 1.4, -r * 0.2, -r * 0.5, -r * 1.2, 0, -r * 0.35); vc.bezierCurveTo(r * 0.5, -r * 1.2, r * 1.4, -r * 0.2, 0, r * 0.8); }
      vc.fill();
    }
    function confetti(vc, f) {
      for (const c of CONF) {
        const y = (c.y + f * c.sp) % 2040 - 60, x = c.x + Math.sin(f * 0.05 + c.w) * 40;
        vc.save(); vc.translate(x, y); vc.rotate(f * 0.06 + c.w); vc.fillStyle = c.c; vc.globalAlpha = 0.9; shape(vc, c.kind, c.r); vc.restore();
      }
    }
    // 場面の切り替えで中央からはじける紙ふぶき
    function burst(vc, f) {
      for (const cf of [S.s2, S.s3, S.sel, S.s4, S.s5, S.end]) {
        const t = f - cf; if (t < 0 || t > 34) continue;
        for (let k = 0; k < 34; k++) {
          const a = hash(k * 1.7 + cf) * Math.PI * 2, sp = 18 + hash(k * 2.9 + cf) * 22;
          const x = 540 + Math.cos(a) * sp * t, y = 980 + Math.sin(a) * sp * t + 0.9 * t * t;
          vc.save(); vc.globalAlpha = clamp(1 - t / 34, 0, 1); vc.translate(x, y); vc.rotate(t * 0.3 + k);
          vc.fillStyle = ['#ffffff', '#ff5d8f', '#ffd23f', '#5ec8ff', '#8a5cff'][k % 5]; shape(vc, k % 4, 14); vc.restore();
        }
      }
    }
    // 「NEW!」のギザギザシール
    function sticker(vc, x, y, label, k, rot) {
      if (k <= 0) return;
      const e = easeOutBack(k);
      vc.save(); vc.translate(x, y); vc.rotate(rot + Math.sin(__t * 6) * 0.06); vc.scale(e, e);
      vc.fillStyle = '#ff3d6e'; vc.beginPath();
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r = i % 2 ? 78 : 96; vc.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      vc.closePath(); vc.fill(); vc.strokeStyle = '#fff'; vc.lineWidth = 6; vc.stroke();
      text(label, 0, 2, 44, '#ffffff', 'center', '#a3002f');
      vc.restore();
    }
    // 字幕: 大きく傾いた状態からポンと飛び込んでくる (1 行ずつ時間差)
    function caption(str, f, f0, f1) {
      if (f < f0 || f > f1) return;
      const out = clamp((f1 - f) / 6, 0, 1);
      str.split('\n').forEach((ln, i) => {
        const t = ease(f, f0 + i * 5, 12); if (t <= 0) return;
        const e = easeOutBack(t);
        const sc = (1 + (1 - e) * 1.4) * (1 + (1 - out) * 0.25);
        ctx.save();
        ctx.globalAlpha = Math.min(1, t * 2) * out;
        ctx.translate(540, GY + GH + 112 + i * 112); ctx.rotate((1 - t) * (i % 2 ? 9 : -9) * Math.PI / 180); ctx.scale(sc, sc);
        const sc2 = sceneOf(f);
        ctx.font = '900 66px system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif';
        const tw = ctx.measureText(ln).width + 80;
        ctx.rotate((i % 2 ? 2.5 : -2.5) * Math.PI / 180);
        ctx.fillStyle = 'rgba(60,20,60,0.25)'; rr(-tw / 2 + 8, -48 + 10, tw, 96, 48); ctx.fill();
        ctx.fillStyle = POPD[sc2]; rr(-tw / 2, -48, tw, 96, 48); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7; ctx.stroke();
        text(ln, 0, 2, 66, '#ffffff', 'center', 'rgba(40,10,40,0.85)');
        ctx.restore();
      });
    }
    function fade(f, f0, f1, len = 6, color = '0,0,0') {
      const a = Math.max(0, 1 - (f - f0) / len, 1 - (f1 - f) / len);
      if (a > 0) { ctx.fillStyle = `rgba(${color},${clamp(a, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
    }
    function endCard(f) {
      const t = f - S.end;
      // 札: 上から落ちてくる
      let k = ease(f, S.end, 12), e = easeOutBack(k);
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.translate(0, 330 - (1 - e) * 500); ctx.scale(2.6, 2.6); drawAnniversary(540 / 2.6); drawTitleSparkles(540 / 2.6); ctx.restore();
      // ロゴ: 大きく回転しながら着地、ゆらゆら
      k = ease(f, S.end + 5, 14); e = easeOutBack(k);
      if (k > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.translate(540, 600); ctx.rotate((1 - k) * -14 * Math.PI / 180 + Math.sin(t * 0.12) * 0.03);
        const sc = (1 + (1 - e) * 2) * (1 + Math.sin(t * 0.18) * 0.02); ctx.scale(sc, sc);
        text('てるしのくん', 0, -70, 132, '#ffd23f', 'center', '#5a1f00');
        text('RUN', 0, 72, 160, '#ffffff', 'center', '#5a1f00');
        ctx.restore();
      }
      k = ease(f, S.end + 12, 10);
      ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 30);
      text('真夜中から、夜明けまで駆けぬけろ！', 540, 805, 44, '#5a1f00', 'center', '#ffffff');
      ctx.restore();
      // タイトルのイラスト: 下からぴょんと飛び出して弾む
      k = ease(f, S.end + 14, 14); e = easeOutBack(k);
      if (k > 0 && TITLE_ART.naturalWidth) {
        const aw = 800, ah = aw * TITLE_ART.naturalHeight / TITLE_ART.naturalWidth;
        const hop = Math.abs(Math.sin(t * 0.22)) * 18 * k;
        ctx.save(); ctx.translate(455, 1110 + (1 - e) * 600 - hop); ctx.rotate(Math.sin(t * 0.15) * 0.025);
        const gl = ctx.createRadialGradient(0, 0, 40, 0, 0, aw * 0.6);
        gl.addColorStop(0, 'rgba(255,255,255,0.75)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(-aw * 0.7, -ah, aw * 1.4, ah * 2);
        ctx.drawImage(TITLE_ART, -aw / 2, -ah / 2, aw, ah);
        ctx.restore();
      }
      // 今すぐプレイ: ポンと出て、脈打つ
      k = ease(f, S.end + 24, 10); e = easeOutBack(k);
      if (k > 0) {
        const sc = e * (1 + Math.sin(t * 0.3) * 0.04 * k);
        ctx.save(); ctx.translate(540, 1450); ctx.rotate(-0.03); ctx.scale(sc, sc);
        ctx.fillStyle = 'rgba(90,20,60,0.3)'; rr(-400, -55 + 12, 800, 110, 55); ctx.fill();
        ctx.fillStyle = '#ff3d6e'; rr(-400, -55, 800, 110, 55); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7; ctx.stroke();
        text('スマホ・PCで 今すぐプレイ！', 0, 1, 52, '#ffffff', 'center', '#8a0026');
        ctx.restore();
      }
      k = ease(f, S.end + 30, 10);
      ctx.save(); ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; rr(150, 1532, 780, 104, 30); ctx.fill();
      text('shirobuncho-bit.github.io', 540, 1562, 36, '#5a1f00', 'center', 'rgba(255,255,255,0)');
      text('/my-first-project/game/', 540, 1606, 36, '#5a1f00', 'center', 'rgba(255,255,255,0)');
      ctx.restore();
      // ワニも横からぴょんと登場
      k = ease(f, S.end + 20, 14); e = easeOutBack(k);
      if (k > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, k * 2);
        drawHero(930 + (1 - e) * 300, 1318 - Math.abs(Math.sin(t * 0.22 + 1.3)) * 16 * k, { who: 'croc', still: true, scale: 3.2, face: -1, happy: true });
        ctx.restore();
      }
      sticker(ctx, 900, 700, '30th!', ease(f, S.end + 26, 10), -0.2);
    }
    // 1 コマ分進めて描く
    window.__frame = f => {
      __t = f / FPS;
      if (f === S.title) { G.mode = 'title'; loadLevel(); G.frame = 0; }
      if (f === S.s2) { place(37, 6, { score: 1260, drops: 12, clock: 9 * 60 }); keys.right = true; }
      if (f === S.s3) { place(110, 0, { score: 6840, drops: 31, clock: 27 * 60 }); keys.run = true; keys.right = false; }
      if (f === S.s3 + 26) { keys.run = false; keys.right = true; }
      if (f === S.sel) { for (const k in keys) keys[k] = false; G.char = 'sun'; G.mode = 'select'; G.sel = 0; }
      if (f === S.sel + 16) pressed.right = true;      // カーソルがワニへ
      if (f === S.s4) { G.char = 'croc'; place(398, 13, { score: 14120, drops: 58, clock: 41 * 60, cpi: 2 }); keys.right = true; }
      if (f === S.s5) { place(503, 3, { score: 21980, drops: 77, clock: 52 * 60, cpi: 3 }); keys.right = true; }
      // ゲームを進める (日の出は少し早回し)
      const steps = f >= S.end ? 1 : f >= S.s5 ? 4 : 2;
      for (let i = 0; i < steps; i++) { update(); for (const k in pressed) delete pressed[k]; }
      __dawn.push(G.mode === 'title' ? 0 : f >= S.end ? 1 : dawnLevel());
      __charge.push(!!(P && P.charging));
      // ゲーム画面を描く (2 倍解像度)
      ctx = __V.gameCtx;
      if (f < S.s2 || (f >= S.sel && f < S.s4)) render();
      else { drawWorld(); drawLoopBanner(); }
      // 縦長の画面に組み立てる
      const vc = __V.vctx; ctx = vc;
      const d = G.mode === 'title' ? 0 : dawnLevel();
      vc.setTransform(1, 0, 0, 1, 0, 0);
      const si = sceneOf(f), lt0 = f - cutOf(si);
      if (si > 0 && lt0 < 12) {   // 新しい色が中央から丸く広がる
        popBG(vc, f, si - 1);
        vc.save(); vc.beginPath(); vc.arc(540, 980, easeOutCubic(lt0 / 12) * 1300, 0, Math.PI * 2); vc.clip(); popBG(vc, f, si); vc.restore();
      } else popBG(vc, f, si);
      confetti(vc, f);
      if (f < S.end) {
        // 上: 30 周年の札とロゴ (2 場面目でポンと登場、あとはゆっくり呼吸)
        if (f >= S.s2) {
          const k = ease(f, S.s2, 12), e = easeOutBack(k);
          vc.save(); vc.globalAlpha = Math.min(1, k * 2);
          vc.save(); vc.translate(540, 0); vc.scale(e, e); vc.translate(-540, 0); vc.translate(0, 196); vc.scale(2, 2); drawAnniversary(270); drawTitleSparkles(270); vc.restore();
          const br = 1 + Math.sin(f * 0.12) * 0.02;
          vc.translate(540, 420); vc.scale(e * br, e * br);
          text('てるしのくんRUN', 0, 0, 84, '#ffc61a', 'center', '#2a1640');
          vc.restore();
        }
        // まん中: ゲーム画面。場面ごとにズーム・回転・揺れでカメラワーク
        const cam = __V.cam || (__V.cam = { z: 1, punch: 0, pdir: 1, banner: null, dash: false });
        const scenes = [S.title, S.s2, S.s3, S.sel, S.s4, S.s5];
        const s0 = scenes.filter(x => f >= x).pop(), lt = f - s0;
        const inPlay = G.mode !== 'title' && G.mode !== 'select' && P;
        const hx = inPlay ? (P.loop ? P.feetX : P.x + P.w / 2) - L.camX : W / 2;
        const hy = inPlay ? (P.loop ? P.feetY : P.y + P.h) - 40 : H / 2;
        let tz = 1, rot = 0, cs = 1, shake = 0;
        if (f < S.s2) { const k = ease(f, 0, 20); cs = 0.45 + 0.55 * easeOutBack(k); rot = (1 - k) * -14; }
        else if (f < S.s3) tz = 1.12 + 0.18 * (lt / (S.s3 - S.s2));
        else if (f < S.sel) { if (P.charging) { tz = 1.2 + 0.55 * P.charge; shake = 7 * P.charge; } else tz = 1.05; }
        else if (f < S.s4) { tz = 1; }
        else if (f < S.s5) { tz = 1.15; if (P.loop) rot = Math.sin(P.loop.th) * 6; }
        else { const k = easeOutCubic(ease(f, S.s5, 50)); tz = 1 + 0.75 * k; rot = 2.5 * k; }
        if (lt === 0) { cam.z = tz; cam.punch = 0; cam.dash = false; }
        if (inPlay && L.loopBanner && L.loopBanner !== cam.banner) { cam.banner = L.loopBanner; cam.punch = 1; cam.pdir = -cam.pdir; }
        if (inPlay && f >= S.s3 && f < S.sel && P.dash > 0 && !cam.dash) { cam.dash = true; cam.punch = 1.3; cam.pdir = -1; }
        cam.z += (tz - cam.z) * 0.2;
        cam.punch *= 0.85;
        const z = Math.max(1, cam.z + cam.punch * 0.3);
        rot += cam.punch * 5 * cam.pdir;
        shake += cam.punch * 14;
        // 場面の頭はくるっと回って飛び込む
        if (f >= S.s2 && lt < 10) { const e = easeOutCubic(lt / 10); rot += (1 - e) * (scenes.indexOf(s0) % 2 ? -24 : 24); cs *= 1.3 - 0.3 * e; }
        const sx0 = Math.sin(f * 12.9898) * shake, sy0 = Math.cos(f * 78.233) * shake;
        // ズームの切り出し範囲 (主人公の近くを大きく)
        const fw = cv.width / z, fh = cv.height / z, foc = clamp((z - 1) / 0.25, 0, 1);
        const fcx = clamp(lerp(cv.width / 2, hx * 2, foc), fw / 2, cv.width - fw / 2);
        const fcy = clamp(lerp(cv.height / 2, hy * 2, foc), fh / 2, cv.height - fh / 2);
        vc.save();
        vc.translate(540 + sx0, GY + GH / 2 + sy0); vc.rotate(rot * Math.PI / 180); vc.scale(cs, cs);
        vc.save(); vc.shadowColor = 'rgba(80,20,60,0.45)'; vc.shadowBlur = 30; vc.shadowOffsetY = 14; rr(-520, -GH / 2, 1040, GH, 28); vc.fillStyle = '#000'; vc.fill(); vc.restore();
        vc.save(); rr(-520, -GH / 2, 1040, GH, 28); vc.clip();
        vc.drawImage(cv, fcx - fw / 2, fcy - fh / 2, fw, fh, -520, -GH / 2, 1040, GH);
        if (f >= S.s2 && lt < 4) { vc.fillStyle = `rgba(255,255,255,${0.7 * (1 - lt / 4)})`; vc.fillRect(-520, -GH / 2, 1040, GH); }
        vc.restore();
        vc.strokeStyle = '#ffffff'; vc.lineWidth = 12; rr(-520, -GH / 2, 1040, GH, 28); vc.stroke();
        vc.restore();
        // 下: 字幕
        if (f >= S.s2) {
          if (f < S.s3) caption('真夜中の丘を、\n駆けぬけろ！', f, S.s2 + 6, S.s3 - 4);
          else if (f < S.sel) caption('ためて、はなして、\nスーパーダッシュ！', f, S.s3 + 4, S.sel - 4);
          else if (f < S.s4) caption('ワニでも\nあそべる！', f, S.sel + 4, S.s4 - 3);
          else if (f < S.s5) caption('ループを決めて、\nハイスコア！', f, S.s4 + 4, S.s5 - 4);
          else caption('それぞれのゴールを\n目指して…！', f, S.s5 + 8, S.end - 4);
        } else {
          caption('30周年記念？ゲーム、\n登場！', f, 16, S.s2 - 3);
          sticker(vc, 900, GY + 40, 'NEW!', ease(f, 26, 10), 0.25);
        }
      } else endCard(f);
      burst(vc, f);
      // はじめは黒から、締めの前に白く光る、最後は暗転
      if (f < 8) { vc.fillStyle = `rgba(255,255,255,${1 - f / 8})`; vc.fillRect(0, 0, 1080, 1920); }
      if (f >= S.end - 5 && f < S.end + 6) { vc.fillStyle = `rgba(255,250,235,${1 - Math.abs(f - S.end) / 6})`; vc.fillRect(0, 0, 1080, 1920); }
      ctx = __V.gameCtx;
      return __V.VC.toDataURL('image/jpeg', 0.93);

    };
    window.N_FRAMES = 495;
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
      const d = Math.max(0.72, __dawn[Math.min(__dawn.length - 1, Math.floor(t * FPS))]);   // 最初からドラム入りの元気な編成
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
    // 動画の演出に合わせた音: 場面の切り替えで「シュッ」、締めの画面で要素が出るたびに「ポン」
    for (const f0 of [__S.s2, __S.s3, __S.sel, __S.s4, __S.s5]) { __tOff = f0 / FPS - 0.06; noise({ d: 0.28, v: 0.14, f: 500, f2: 5000, q: 1.2 }); __tOff = f0 / FPS; voice({ f: 520, f2: 1560, d: 0.08, r: 0.1, type: 'sine', v: 0.16 }); [84, 88, 91].forEach((m, i) => bell(m, i * 0.04, 0.03, 0.35)); }
    __tOff = 26 / FPS; voice({ f: 400, f2: 1400, d: 0.07, r: 0.1, type: 'sine', v: 0.16 });
    __tOff = __S.end / FPS - 0.1; noise({ d: 0.6, v: 0.12, f: 300, f2: 6000, q: 0.8, rev: 0.4 });
    [[12, 70], [19, 74], [30, 77], [36, 79]].forEach(([df, m]) => { __tOff = (__S.end + df) / FPS; voice({ f: midi(m), f2: midi(m + 12), d: 0.06, r: 0.12, type: 'sine', v: 0.14 }); bell(m + 12, 0.02, 0.03, 0.3); });
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
  fs.writeFileSync(path.join(OUT, 'vaudio.wav'), Buffer.from(wavB64, 'base64'));
  const log = await pg.evaluate(() => __log.map(e => e.k + '@' + e.t.toFixed(2)).filter((v, i, a) => !v.startsWith('drop') && a.indexOf(v) === i).join(' '));
  console.log('sfx:', log);
  console.log('errors', errs);
  await b.close();
})();
