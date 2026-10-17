/* Self-check for the completion criteria. Open any page with ?check (served over http).
   Each check runs only on the page that holds the element it checks; audit/check-all.mjs runs every page. */
(async function () {
  'use strict';
  const results = [];
  const ok = (name, pass, detail) => results.push({ name, pass: !!pass, detail: detail || '' });
  const has = sel => !!document.querySelector(sel);
  const R = window.PM.ROOT;

  window.PM_renderAll();
  if (window.PM_archiveShowAll) window.PM_archiveShowAll();
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  await new Promise(r => setTimeout(r, 400));

  const json = await fetch(R + 'polimill_data/polimill_data.json').then(r => r.json());
  const csv = parseCSV((await fetch(R + 'polimill_data/0_all_news_699.csv').then(r => r.text())).replace(/^﻿/, ''));
  const news = csv.slice(1).filter(r => r.length > 1);

  // ---- 1. layout: horizontal overflow and overlapping chart labels ----
  const vw = document.documentElement.clientWidth;
  ok('1a ページ横スクロールなし', document.documentElement.scrollWidth <= vw, `scrollWidth=${document.documentElement.scrollWidth} / clientWidth=${vw}`);
  const outside = [...document.querySelectorAll('body *')].filter(n => {
    if (n.closest('.tip, #check-result, .skip')) return false;
    const r = n.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    if (getComputedStyle(n).visibility === 'hidden') return false;
    return r.right > vw + 0.5 || r.left < -0.5;
  });
  ok('1b ビューポートからはみ出す要素なし', outside.length === 0, outside.slice(0, 5).map(n => `${n.tagName}.${n.getAttribute('class') || ''} in #${(n.closest('[id]') || {}).id}`).join(', '));
  const overlaps = [];
  document.querySelectorAll('svg').forEach(svg => {
    const texts = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim() && getComputedStyle(t).opacity !== '0').map(t => ({ t, r: t.getBoundingClientRect() }));
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].r, b = texts[j].r;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 1 && h > 2) overlaps.push(`${svg.closest('[id]').id}: 「${texts[i].t.textContent}」×「${texts[j].t.textContent}」`);
    }
  });
  ok('1c チャート内の文字の重なりなし', overlaps.length === 0, overlaps.slice(0, 8).join(' / '));

  // ---- 2. numbers vs polimill_data.json ----
  const last = json.adoption[json.adoption.length - 1];
  if (has('.metric')) {
    const metric = k => document.querySelector(`.metric[data-key="${k}"]`).dataset.raw;
    const sa = json.milestones.find(m => m.date === '2026-01-19');
    const prefN = new Set(json.prefecture_events.map(e => e.prefecture)).size;
    ok('2a KPI 導入自治体 約800', +metric('municipalities') === last.municipalities && last.municipalities === 800, `page=${metric('municipalities')} json=${last.municipalities}`);
    ok('2b KPI 職員ユーザー 約30万人', +metric('users') === last.users_man && last.users_man === 30, `page=${metric('users')} json=${last.users_man}`);
    ok('2c KPI シリーズA 約6.35億円／評価額 約50億円', metric('seriesA').split('|').every(s => sa.headline.includes(s)), sa.headline);
    ok('2d KPI 研修・協定 116件・38都道府県', metric('events') === `${json.prefecture_events.length}|${prefN}` && json.prefecture_events.length === 116 && prefN === 38, `page=${metric('events')}`);
  }
  const sumP = Object.values(json.prefectures).reduce((s, v) => s + v['研修'] + v['協定'], 0);
  ok('2e 都道府県サマリ合計＝イベント件数', sumP === json.prefecture_events.length, `summary=${sumP} events=${json.prefecture_events.length}`);
  const ptsOK = (id, expected) => {
    const pts = [...document.querySelectorAll(`#${id} circle.pt`)].map(c => [c.dataset.date, +c.dataset.v]);
    const bad = pts.filter(([d, v]) => { const a = json.adoption.find(x => x.date === d); return !a || a.municipalities !== v; });
    return { pass: bad.length === 0 && pts.length === expected.length && expected.every(a => pts.some(p => p[0] === a.date)), detail: `points=${pts.length} mismatch=${JSON.stringify(bad)}` };
  };
  if (has('#chart-adoption')) { const p = ptsOK('chart-adoption', json.adoption); ok('2f 導入曲線の12点がjsonと一致', p.pass, p.detail); }
  if (has('#chart-zoom')) {
    const p = ptsOK('chart-zoom', json.adoption.filter(a => a.date >= '2024-12-15' && a.date <= '2026-01-20'));
    ok('2g 第4章 拡大図の点がjsonと一致', p.pass, p.detail);
  }
  if (has('#chart-monthly')) { const p = ptsOK('chart-monthly', json.adoption); ok('2l 分析A 重ねた導入曲線の12点がjsonと一致', p.pass, p.detail); }
  if (has('.ch-stat')) {
    const A = d => json.adoption.find(a => a.date === d);
    const expect = { 1: '約1.3億円', 3: A('2024-11-30').note, 4: A('2025-05-14').municipalities + ' → ' + A('2025-12-24').municipalities, 5: '約' + last.municipalities };
    const bad = [...document.querySelectorAll('.ch-stat')].filter(s => { const n = s.dataset.chapter, v = s.querySelector('b').textContent; return n in expect ? v !== expect[n] : !/^\d+本$/.test(v); });
    ok('2m 章の代表数字がjsonと一致', bad.length === 0 && json.milestones.some(m => m.date === '2022-12-13' && m.headline.includes('約1.3億円')),
      [...document.querySelectorAll('.ch-stat b')].map(b => b.textContent).join(' / '));
  }
  if (has('#zoom-notes')) {
    const notes = [...document.querySelectorAll('#zoom-notes li')].map(li => li.dataset.date);
    const want = [['2025-10-09', 'ISO'], ['2025-11-05', '正社員'], ['2025-12-05', 'ミッション'], ['2025-12-08', 'LGWAN']];
    ok('2h 第4章 注記（ISO／正社員倍増／ミッション／LGWAN）', want.every(([d, k]) => notes.includes(d) && json.milestones.some(m => m.date === d && m.headline.includes(k))), notes.join(','));
  }
  if (has('g.tgt')) {
    const num = s => +String(s).replace(/,/g, '').match(/\d+/)[0];
    const tg = [...document.querySelectorAll('g.tgt')].map(g => [+g.dataset.target, +g.dataset.actual]);
    const t25 = json.targets.find(t => t.item.startsWith('2025年 ')), t26 = json.targets.find(t => t.item.startsWith('2026年'));
    ok('2i 分析C 目標と実績（2025: 1,000超→約600、2026: 1,200→約800）',
      JSON.stringify(tg) === JSON.stringify([[num(t25.target), num(t25.actual)], [num(t26.target), num(t26.actual)]]) && JSON.stringify(tg) === '[[1000,600],[1200,800]]', JSON.stringify(tg));
  }
  if (has('#targets-qual')) {
    const qual = [...document.querySelectorAll('#targets-qual li')].map(li => li.dataset.item);
    ok('2j 分析C 定性項目（LGWAN／Qommons ONE／Surfvote 2.0）', ['LGWAN接続対応', 'Qommons ONE', 'Surfvote 2.0'].every(i => qual.includes(i)), qual.join(','));
  }
  if (has('#questions')) ok('2k 分析E 問い4つ', document.querySelectorAll('#questions li').length === 4);

  // ---- 7. added visuals ----
  if (has('#chart-growth')) {
    const nodes = [...document.querySelectorAll('#chart-growth g.gnode')];
    const dashed = nodes.filter(n => n.dataset.solid === 'false').map(n => n.dataset.node);
    ok('7a 分析B 成長の型（5要素＋収益の層、定着は破線）', nodes.length === 5 && has('#chart-growth .g-rev') && dashed.join() === 'stay' &&
      document.querySelectorAll('#growth-list .growth-nodes > li').length === 6, `nodes=${nodes.length} dashed=${dashed}`);
  }
  if (has('#chart-parallel')) {
    const p = ptsOK('chart-parallel', json.adoption);
    const lanes = [...document.querySelectorAll('#chart-parallel .lane-l')].map(t => t.textContent);
    const fund = document.querySelectorAll('#chart-parallel .fund-pt').length;
    const heads = ['約3,000万円', '3,500万円超', '7,500万円超', '約1.3億円', '1.7億円超', '2億円を超える', '5億円超'];
    ok('7b 分析B 並行タイムライン（5系列・導入12点・累計調達7点）', p.pass && lanes.join() === '導入自治体数,累計調達額,正社員数・組織,認証取得,主なプロダクト' && fund === 7 &&
      heads.every(h => json.milestones.some(m => m.headline.includes(h))) && has('#chart-parallel .fund-sa'), `${p.detail} lanes=${lanes.length} fund=${fund}`);
  }
  if (has('#chart-projection')) {
    const reach = [...document.querySelectorAll('#chart-projection path.proj')].map(p => [+p.dataset.pace, p.dataset.reach]);
    const want = [40, 50].map(pc => { const d = new Date(last.date); d.setMonth(d.getMonth() + Math.ceil((1200 - last.municipalities) / pc)); return [pc, d.toISOString().slice(0, 7)]; });
    ok('7c 分析C 試算線（800起点、月40・月50で1,200到達）', JSON.stringify(reach) === JSON.stringify(want) && has('#chart-projection .goal') &&
      document.querySelector('#projection-text .conf-est'), JSON.stringify(reach));
  }
  if (has('#nowbar')) {
    const items = [...document.querySelectorAll('.tl li[data-date]')];
    window.scrollTo(0, document.body.scrollHeight);
    window.dispatchEvent(new Event('scroll'));
    await new Promise(r => setTimeout(r, 200));
    const bar = document.getElementById('nowbar'), date = bar.dataset.date;
    const a = json.adoption.filter(x => x.date <= date).pop();
    const shownA = bar.querySelector('.nb-v b').textContent;
    window.scrollTo(0, 0);
    ok('7d 章 現在地表示（表示中の出来事の時点の発表値）', date === items[items.length - 1].dataset.date && (a ? shownA === a.municipalities.toLocaleString('en-US') : shownA === '発表前'),
      `date=${date} shown=${shownA} json=${a ? a.municipalities : '-'}`);
  }

  // ---- 3. tile map ----
  if (has('#chart-tiles')) {
    const tiles = [...document.querySelectorAll('#chart-tiles g.tile')];
    const names = tiles.map(t => t.dataset.pref);
    const svgR = document.querySelector('#chart-tiles svg').getBoundingClientRect();
    const visible = tiles.filter(t => { const r = t.getBoundingClientRect(); return r.width > 10 && r.left >= svgR.left - 0.5 && r.right <= svgR.right + 0.5; });
    const posKey = new Set(tiles.map(t => t.getAttribute('transform')));
    ok('3 分析D タイルマップ 47都道府県すべて表示', tiles.length === 47 && visible.length === 47 && posKey.size === 47 && Object.keys(json.prefectures).every(p => names.includes(p)),
      `tiles=${tiles.length} visible=${visible.length} uniquePos=${posKey.size}`);
  }

  // ---- 4. monthly stack ----
  if (has('#chart-monthly')) {
    const segs = [...document.querySelectorAll('#chart-monthly rect.seg')];
    const total = segs.reduce((s, r) => s + +r.dataset.n, 0);
    const byTheme = {};
    segs.forEach(r => { byTheme[r.dataset.theme] = (byTheme[r.dataset.theme] || 0) + +r.dataset.n; });
    const csvTheme = {};
    news.forEach(r => { csvTheme[r[1]] = (csvTheme[r[1]] || 0) + 1; });
    ok('4 分析A 積み上げ合計＝699件（テーマ別も一致）', total === 699 && news.length === 699 && Object.keys(csvTheme).every(k => csvTheme[k] === byTheme[k]),
      `chart=${total} csv=${news.length} ${JSON.stringify(byTheme)}`);
    const monthsN = new Set(segs.map(r => r.getAttribute('x'))).size;
    ok('4b 分析A 横軸が2021-10〜2026-10の全61か月', monthsN === 61, `months=${monthsN}`);
  }

  // ---- 5. links ----
  const urls = new Set();
  json.milestones.forEach(m => urls.add(m.url));
  json.adoption.forEach(a => urls.add(a.url));
  json.prefecture_events.forEach(e => urls.add(e.url));
  json.targets.forEach(t => { if (t.target_url) urls.add(t.target_url); if (t.actual_url) urls.add(t.actual_url); });
  news.forEach(r => urls.add(r[4]));
  const links = [...document.querySelectorAll('a[href^="http"]')];
  const badAttr = links.filter(a => a.target !== '_blank' || !(a.rel || '').split(/\s+/).includes('noopener'));
  const badUrl = links.filter(a => !urls.has(a.getAttribute('href')));
  ok('5a 外部リンクがすべて target=_blank rel=noopener', badAttr.length === 0, `links=${links.length} bad=${badAttr.length}`);
  ok('5b 外部リンクURLがすべてデータと一致', badUrl.length === 0, badUrl.slice(0, 5).map(a => a.getAttribute('href')).join(' '));
  if (has('#archive')) ok('5c アーカイブに699件（全件表示時）', document.querySelectorAll('#archive a').length === 699, `archive=${document.querySelectorAll('#archive a').length}`);
  // internal links: every page target must exist, every #anchor must exist on its page
  const internal = [...new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => !/^https?:/.test(h)))];
  const broken = [];
  for (const h of internal) {
    const u = new URL(h, location.href);
    const res = await fetch(u.pathname, { cache: 'no-store' });
    if (!res.ok) { broken.push(h + ' ' + res.status); continue; }
    if (u.hash) {
      const doc = u.pathname === location.pathname ? document : new DOMParser().parseFromString(await res.text(), 'text/html');
      if (!doc.getElementById(decodeURIComponent(u.hash.slice(1)))) broken.push(h + ' (no anchor)');
    }
  }
  ok('5d 内部リンクのページとアンカーがすべて存在', broken.length === 0, `internal=${internal.length} ${broken.slice(0, 5).join(' ')}`);

  // ---- 6. numbering ----
  const nums = [...document.querySelectorAll('.sec-no, .ch-no')].map(n => n.textContent.trim());
  ok('6 ページ内の番号が重複しない', new Set(nums).size === nums.length, nums.join(','));

  // ---- report ----
  const pass = results.filter(r => r.pass).length;
  const pre = document.createElement('pre');
  pre.id = 'check-result';
  pre.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;margin:0;padding:8px;background:#fff;border-top:2px solid #111;font:11px/1.5 monospace;white-space:pre-wrap;z-index:99';
  pre.textContent = `CHECK ${pass}/${results.length} passed @${vw}px ${location.pathname}\n` + results.map(r => `${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  — ' + r.detail : ''}`).join('\n');
  document.body.appendChild(pre);
  window.PM_CHECK = { vw, pass, total: results.length, results };
  console.log(pre.textContent);

  function parseCSV(text) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
})();
