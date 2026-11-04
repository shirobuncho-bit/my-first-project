# てるしのくんRUN 15 秒 CM

- `terushino-run-cm-15s.mp4` … 1920×1080 / 30fps / 15 秒、音声つき (AAC)
- `terushino-run-cm-15s-vertical.mp4` … Instagram リール用の縦長版。1080×1920 / 30fps / 15 秒、音声つき。上下は Instagram の表示に隠れやすいので、大事な文字は中央寄りに配置
- `thumbnail.jpg` … 終わりのカット (サムネイル用)
- `make_promo_vertical.js` … 縦長版を作り直すスクリプト (`promo/vframes/` と `promo/vaudio.wav` を出力。ffmpeg の手順は横長版と同じで、`crop` は不要)
- `make_promo.js` … 動画を作り直すスクリプト。ゲームを台本どおり 1 コマずつ動かして画像に書き出し、ゲーム内のシンセで BGM・効果音を書き出す (Playwright が必要)

作り直し方:

```sh
mkdir -p promo/frames
node promo/make_promo.js        # promo/frames/*.jpg と promo/audio.wav ができる
ffmpeg -framerate 30 -i promo/frames/%04d.jpg -i promo/audio.wav \
  -vf "crop=1920:1080:8:4,format=yuv420p" -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 \
  -c:v libx264 -crf 18 -movflags +faststart -c:a aac -b:a 192k -shortest promo/terushino-run-cm-15s.mp4
```
