# my-first-project

## てるしのくんRUN

真夜中から日の出まで、坂やループを駆け抜けて「日の出の祭壇」をめざすハイスピード横スクロールアクションです。HTML5 Canvas だけで動き、`game/index.html` 1 ファイルで完結しています。

- **遊ぶ**: GitHub Pages を有効にすると https://shirobuncho-bit.github.io/my-first-project/game/ で遊べます（ローカルでは `game/index.html` をブラウザで開くだけ）
- **操作**: ←→ 移動 / Space・Z ジャンプ / Shift・X 長押しでためて、はなすとスーパーダッシュ / P ポーズ / M 音のオン・オフ
- **スマホ**: 画面のボタンで操作できます（縦持ちでも横持ちでも OK）
- **評価**: クリアタイムとスコアそれぞれに S〜D のランク、2 つを合わせた総合ランク

### ファイル

| パス | 内容 |
|---|---|
| `game/index.html` | ゲーム本体（主人公の画像も埋め込み済み） |
| `game/assets/hero-original.png` | 主人公の元イラスト |
| `game/tools/make_sprites.py` | 元イラストから主人公のパーツ画像を作って `index.html` に埋め込むスクリプト |
