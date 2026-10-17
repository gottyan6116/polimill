# Polimill 5年の年表

Polimill株式会社の2021年10月〜2026年10月を、自社発表699件から読む1ページの静的サイト。

## 構成

```
index.html              ページ本体（00〜09の10セクション）
assets/css/style.css    スタイル（白地・アクセント #67C59F のみ）
assets/js/data.js       polimill_data/ を包んだデータ（生成物）
assets/js/main.js       D3 v7 による描画
assets/js/check.js      完了条件のセルフチェック（?check のときだけ読み込む）
polimill_data/          入力データ（改変なし）
scripts/build_data.py   polimill_data/ → assets/js/data.js
scripts/static_check.py 絵文字・グラデーション・影の不使用、data.js の一致などを確認
DATA_NOTES.md           データ上の疑問
```

ビルドは不要。`index.html` を直接開いても表示できる（D3とGoogle FontsはCDNから読み込む）。Vercelにはこのフォルダをそのまま静的デプロイすればよい。

## データを更新したとき

```bash
python -I scripts/build_data.py
python -I scripts/static_check.py
```

続けて `python -m http.server 3010` で起動し、`http://localhost:3010/?check` を390px幅と1440px幅で開く。画面下に PASS/FAIL の一覧が出る。

CSS・JSを変えたら、`index.html` 内の `?v=2` の数字を上げる（ブラウザのキャッシュ対策）。
