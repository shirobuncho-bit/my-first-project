# てるしのくんRUN 15 秒 CM

- `terushino-run-cm-15s.mp4` … 1920×1080 / 30fps / 15 秒、音声つき (AAC)
- `thumbnail.jpg` … 終わりのカット (サムネイル用)
- `make_promo.js` … 動画を作り直すスクリプト。ゲームを台本どおり 1 コマずつ動かして画像に書き出し、ゲーム内のシンセで BGM・効果音を書き出す (Playwright が必要)

作り直し方:

```sh
mkdir -p promo/frames
node promo/make_promo.js        # promo/frames/*.jpg と promo/audio.wav ができる
ffmpeg -framerate 30 -i promo/frames/%04d.jpg -i promo/audio.wav \
  -vf "crop=1920:1080:8:4,format=yuv420p" -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 \
  -c:v libx264 -crf 18 -movflags +faststart -c:a aac -b:a 192k -shortest promo/terushino-run-cm-15s.mp4
```
