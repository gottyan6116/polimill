# Polimill 5年の年表

Polimill株式会社の2021年10月〜2026年10月を、自社発表699件から読む静的サイト。

## ページ

| パス | 中身 |
|---|---|
| `/` | 結論、3つの示唆、KPI、導入自治体数の曲線、5章のミニ年表、各ページへの入口 |
| `/chapters/1/` 〜 `/chapters/5/` | 第1〜5章。章番号・期間 → 代表数字 → 見出し → 象徴的な図 → 解説 → 出来事タイムライン → 前後の章 |
| `/analysis/` | A 発信構成、B 目標と実績、C 全国の分布、D 入社後に確認したい問い |
| `/archive/` | 699件の検索・絞り込み（`?month=2023-07` で月指定） |
| `/method/` | 出典、データファイル |

旧1ページ版のアンカー（`/#s02` など）は、トップで新しいページへ転送する。

## 構成

```
index.html, chapters/*/, analysis/, archive/, method/   各ページ（ビルド不要の静的HTML）
assets/css/style.css        スタイル
assets/js/data.js           polimill_data/ を包んだデータ（生成物）
assets/js/core.js           共通：データ、配色、ツールチップ、描画の登録
assets/js/site.js           共通：ナビ、前後の章、フッター、旧アンカーの転送
assets/js/charts/*.js       図ごとの描画（各ページは自分にある要素だけを描く）
assets/js/boot.js           起動
assets/js/check.js          セルフチェック（?check のときだけ読み込む）
polimill_data/              入力データ（改変なし）
scripts/build_data.py       polimill_data/ → assets/js/data.js
scripts/static_check.py     絵文字・グラデーション・影の不使用、data.js の一致などを確認
audit/                      文言監査とページ検査（Playwright）
DATA_NOTES.md               データ上の疑問
```

GitHub Pages・Vercel にそのまま静的に置ける。リンクはすべて相対パス。

## 確認

```bash
npm install
npx playwright install chromium
python -I scripts/static_check.py
npm run check
```

`npm run check` は全ページを375px・1440pxで開いてセルフチェックを走らせる（`-- --shots` でスクリーンショットを `audit/screenshots/` に保存）。

## 文言監査

```bash
node audit/extract.mjs audit/after.txt
node audit/compare.mjs
```

`audit/before.txt` は1ページ版時点の全文言。`compare.mjs` は移行前の各行が移行後のどこかに残っているかを照合し、`audit/diff-report.md` に書き出す。意図した変更は理由とともに `audit/expected-removals.json` に記録する。

データを更新したら `python -I scripts/build_data.py` を実行する。CSS・JSを変えたら、各ページの `?v=` の数字を上げる（ブラウザのキャッシュ対策）。
