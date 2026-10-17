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
  add('growth', '分析B', 'analysis/#sec-growth', '成長の型', [
    '実線は、公開情報（同社のリリース）で確認できる要素とつながり。破線は、公開情報では確かめられない要素とつながり（仮説・構想）。',
    '各要素をクリック／タップすると根拠の出来事と出典が開く。図の下の一覧が同じ内容の文章版。',
  ]);
  add('parallel', '分析B', 'analysis/#sec-growth', '並行タイムライン', [
    '導入自治体数・累計調達額は各系列の中での相対的な高さで描いている（系列どうしの高さは比べられない）。',
    `累計調達額は、マイルストーンの見出しに書かれた累計値（${PM.FUND_CUM.map(f => f.label).join('→')}）。シリーズA（2026年1月、約6.35億円）は調達額のみが発表され、累計額は発表されていないため別の印で示す。`,
    '正社員数は「4名から倍増」（2025年11月）の発表のみで、人数の推移は公開されていない。',
  ]);
  add('projection', '分析C', 'analysis/#sec-targets', '導入自治体数の試算線', [
    '試算線は、2026年5月8日の発表値（約800）を起点に、毎月一定の数（40または50）ずつ増えると仮定して引いたもの。月40・月50は比較のために置いた仮のペースで、同社の見通しではない。',
    '直近の2つの発表値から計算したペースは月45.1（2025年12月24日の600→2026年5月8日の800、135日で+200）（表示は約45）で、月40と月50の間にある。計算方法はデータと方法を参照。',
  ]);
  add('tiles', '分析D', 'analysis/#sec-regions', '都道府県別の研修＋協定件数', [
    '件数は 3_prefecture_summary（研修・協定）による。タイルの配置は地理に近い模式配置。タイルをタップすると件数と最新の発表が右（モバイルでは下）に出る。',
  ]);
})(window.PM);
