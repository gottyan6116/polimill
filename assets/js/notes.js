/* Figure notes: shown under each figure and listed together on the method page. */
(function (PM) {
  'use strict';
  const { ext, dot, ms, monthRows } = PM;
  const pv1 = ms('2025-08-06', 'PV'), pv2 = ms('2025-12-31', 'PV');
  const later = PM.D.milestones.filter(m => m.chapter > 1 && m.headline.includes('調達'));
  const add = (id, page, path, fig, items) => { PM.NOTES[id] = { page, path, fig, items }; };

  add('adoption', 'トップ', '', 'QommonsAI 導入自治体数', [
    '点をクリック／タップすると、その時点の発表文と出典が開く。',
  ]);
  add('funding', '第1章', 'chapters/1/', '累計調達額', [
    `その後の累計調達（マイルストーンより）：${later.map(m => `${dot(m.date)} ${ext(m.url, m.headline)}`).join('　／　')}`,
  ]);
  add('wall', '第2章', 'chapters/2/', '論点の壁', [
    `壁の記事は、この期間のSurfvote記事${PM.svPeriod.length}件を日付順に並べ、等間隔に${PM.WALL_N}件を抽出したもの（無作為抽出ではない）。上部の番号は下のタイムラインの番号に対応。`,
  ]);
  add('zoom', '第4章', 'chapters/4/', '導入自治体数（2025年区間の拡大）', [
    '番号は下のタイムラインの番号に対応。曲線は発表時点を直線で結んだもので、間の推移は不明。',
  ]);
  add('eco', '第5章', 'chapters/5/', '2026年時点の関係図', [
    '関係図の矢印ラベルは、各出典の記述をもとに要約したもの。図中の要素をクリック／タップすると出典が開く。',
  ]);
  add('monthly', '分析A', 'analysis/#sec-composition', '月別の発信本数と導入自治体数', [
    `QommonsAI系＝QommonsAI・QommonsAI研修・自治体協定の合計。テーマ分類は元データの暫定分類による。データのない月も0として横軸に含める（全${monthRows.length}か月）。`,
    `ここで言えるのは「発信の主役」の移り変わりまで。Surfvote自体は続いており、${ext(pv1.url, dot(pv1.date) + ' ' + pv1.headline)}、${ext(pv2.url, dot(pv2.date) + ' ' + pv2.headline)}。`,
  ]);
  add('tiles', '分析C', 'analysis/#sec-regions', '都道府県別の研修＋協定件数', [
    '件数は 3_prefecture_summary（研修・協定）による。タイルの配置は地理に近い模式配置。タイルをタップすると件数と最新の発表が右（モバイルでは下）に出る。',
  ]);
})(window.PM);
