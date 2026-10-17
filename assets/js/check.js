/* Self-check for the completion criteria. Open index.html?check (served over http). */
(async function () {
  'use strict';
  const results = [];
  const ok = (name, pass, detail) => results.push({ name, pass: !!pass, detail: detail || '' });

  window.PM_renderAll();
  window.PM_archiveShowAll();
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  await new Promise(r => setTimeout(r, 400));

  const json = await fetch('polimill_data/polimill_data.json').then(r => r.json());
  const csv = parseCSV((await fetch('polimill_data/0_all_news_699.csv').then(r => r.text())).replace(/^﻿/, ''));
  const news = csv.slice(1).filter(r => r.length > 1);

  // ---- 1. layout: horizontal overflow and overlapping chart labels ----
  const vw = document.documentElement.clientWidth;
  ok('1a ページ横スクロールなし', document.documentElement.scrollWidth <= vw, `scrollWidth=${document.documentElement.scrollWidth} / clientWidth=${vw}`);
  const outside = [...document.querySelectorAll('body *')].filter(n => {
    if (n.closest('.tip, #check-result')) return false;
    const r = n.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const cs = getComputedStyle(n);
    if (cs.visibility === 'hidden') return false;
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
  const metric = k => document.querySelector(`.metric[data-key="${k}"]`).dataset.raw;
  const sa = json.milestones.find(m => m.date === '2026-01-19');
  const prefN = new Set(json.prefecture_events.map(e => e.prefecture)).size;
  ok('2a 00 導入自治体 約800', +metric('municipalities') === last.municipalities && last.municipalities === 800, `page=${metric('municipalities')} json=${last.municipalities}`);
  ok('2b 00 職員ユーザー 約30万人', +metric('users') === last.users_man && last.users_man === 30, `page=${metric('users')} json=${last.users_man}`);
  ok('2c 00 シリーズA 約6.35億円／評価額 約50億円', metric('seriesA').split('|').every(s => sa.headline.includes(s)), sa.headline);
  ok('2d 00 研修・協定 116件・38都道府県', metric('events') === `${json.prefecture_events.length}|${prefN}` && json.prefecture_events.length === 116 && prefN === 38, `page=${metric('events')}`);
  const sumP = Object.values(json.prefectures).reduce((s, v) => s + v['研修'] + v['協定'], 0);
  ok('2e 都道府県サマリ合計＝イベント件数', sumP === json.prefecture_events.length, `summary=${sumP} events=${json.prefecture_events.length}`);
  const ptsOK = (id, expected) => {
    const pts = [...document.querySelectorAll(`#${id} circle.pt`)].map(c => [c.dataset.date, +c.dataset.v]);
    const bad = pts.filter(([d, v]) => { const a = json.adoption.find(x => x.date === d); return !a || a.municipalities !== v; });
    return { pass: bad.length === 0 && pts.length === expected.length && expected.every(a => pts.some(p => p[0] === a.date)), detail: `points=${pts.length} mismatch=${JSON.stringify(bad)}` };
  };
  const p00 = ptsOK('chart-adoption', json.adoption);
  ok('2f 00 曲線の12点がjsonと一致', p00.pass, p00.detail);
  const zoomExpected = json.adoption.filter(a => a.date >= '2024-12-15' && a.date <= '2026-01-20');
  const p05 = ptsOK('chart-zoom', zoomExpected);
  ok('2g 05 拡大図の点がjsonと一致', p05.pass, p05.detail);
  const p01 = ptsOK('chart-monthly', json.adoption);
  ok('2l 01 重ねた導入曲線の12点がjsonと一致', p01.pass, p01.detail);
  const stat = n => document.querySelector('.ch-stat[data-chapter="' + n + '"] b').textContent;
  const A = d => json.adoption.find(a => a.date === d);
  ok('2m 章の代表数字がjsonと一致', stat(1) === '約1.3億円' && json.milestones.some(m => m.date === '2022-12-13' && m.headline.includes(stat(1))) &&
    stat(3) === A('2024-11-30').note && stat(4) === A('2025-05-14').municipalities + ' → ' + A('2025-12-24').municipalities && stat(5) === '約' + last.municipalities,
    [1, 2, 3, 4, 5].map(stat).join(' / '));
  const notes = [...document.querySelectorAll('#zoom-notes li')].map(li => li.dataset.date);
  const wantNotes = [['2025-10-09', 'ISO'], ['2025-11-05', '正社員'], ['2025-12-05', 'ミッション'], ['2025-12-08', 'LGWAN']];
  ok('2h 05 注記（ISO／正社員倍増／ミッション／LGWAN）', wantNotes.every(([d, k]) => notes.includes(d) && json.milestones.some(m => m.date === d && m.headline.includes(k))), notes.join(','));
  const num = s => +String(s).replace(/,/g, '').match(/\d+/)[0];
  const tg = [...document.querySelectorAll('g.tgt')].map(g => [+g.dataset.target, +g.dataset.actual]);
  const t25 = json.targets.find(t => t.item.startsWith('2025年 ')), t26 = json.targets.find(t => t.item.startsWith('2026年'));
  ok('2i 08 目標と実績（2025: 1,000超→約600、2026: 1,200→約800）',
    JSON.stringify(tg) === JSON.stringify([[num(t25.target), num(t25.actual)], [num(t26.target), num(t26.actual)]]) && JSON.stringify(tg) === '[[1000,600],[1200,800]]', JSON.stringify(tg));
  const qual = [...document.querySelectorAll('#targets-qual li')].map(li => li.dataset.item);
  ok('2j 08 定性項目（LGWAN／Qommons ONE／Surfvote 2.0）', ['LGWAN接続対応', 'Qommons ONE', 'Surfvote 2.0'].every(i => qual.includes(i)), qual.join(','));
  ok('2k 08 問い4つ', document.querySelectorAll('#questions li').length === 4);

  // ---- 3. tile map ----
  const tiles = [...document.querySelectorAll('#chart-tiles g.tile')];
  const names = tiles.map(t => t.dataset.pref);
  const svgR = document.querySelector('#chart-tiles svg').getBoundingClientRect();
  const visible = tiles.filter(t => { const r = t.getBoundingClientRect(); return r.width > 10 && r.left >= svgR.left - 0.5 && r.right <= svgR.right + 0.5; });
  const posKey = new Set(tiles.map(t => t.getAttribute('transform')));
  ok('3 タイルマップ 47都道府県すべて表示', tiles.length === 47 && visible.length === 47 && posKey.size === 47 && Object.keys(json.prefectures).every(p => names.includes(p)),
    `tiles=${tiles.length} visible=${visible.length} uniquePos=${posKey.size}`);

  // ---- 4. monthly stack ----
  const segs = [...document.querySelectorAll('#chart-monthly rect.seg')];
  const total = segs.reduce((s, r) => s + +r.dataset.n, 0);
  const byTheme = {};
  segs.forEach(r => { byTheme[r.dataset.theme] = (byTheme[r.dataset.theme] || 0) + +r.dataset.n; });
  const csvTheme = {};
  news.forEach(r => { csvTheme[r[1]] = (csvTheme[r[1]] || 0) + 1; });
  ok('4 01 積み上げ合計＝699件（テーマ別も一致）', total === 699 && news.length === 699 && Object.keys(csvTheme).every(k => csvTheme[k] === byTheme[k]),
    `chart=${total} csv=${news.length} ${JSON.stringify(byTheme)}`);
  const monthsN = new Set(segs.map(r => r.getAttribute('x'))).size;
  ok('4b 01 横軸が2021-10〜2026-10の全61か月', monthsN === 61, `months=${monthsN}`);

  // ---- 5. external links ----
  const urls = new Set();
  json.milestones.forEach(m => urls.add(m.url));
  json.adoption.forEach(a => urls.add(a.url));
  json.prefecture_events.forEach(e => urls.add(e.url));
  json.targets.forEach(t => { if (t.target_url) urls.add(t.target_url); if (t.actual_url) urls.add(t.actual_url); });
  news.forEach(r => urls.add(r[4]));
  const links = [...document.querySelectorAll('a[href^="http"]')];
  const badAttr = links.filter(a => a.target !== '_blank' || !(a.rel || '').split(/\s+/).includes('noopener'));
  const badUrl = links.filter(a => !urls.has(a.getAttribute('href')));
  ok('5a 外部リンクがすべて target=_blank rel=noopener', links.length > 0 && badAttr.length === 0, `links=${links.length} bad=${badAttr.length}`);
  ok('5b 外部リンクURLがすべてデータと一致', badUrl.length === 0, badUrl.slice(0, 5).map(a => a.getAttribute('href')).join(' '));
  const archiveLinks = document.querySelectorAll('#archive a').length;
  ok('5c アーカイブに699件（全件表示時）', archiveLinks === 699, `archive=${archiveLinks}`);

  // ---- report ----
  const pass = results.filter(r => r.pass).length;
  const pre = document.createElement('pre');
  pre.id = 'check-result';
  pre.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;margin:0;padding:8px;background:#fff;border-top:2px solid #111;font:11px/1.5 monospace;white-space:pre-wrap;z-index:99';
  pre.textContent = `CHECK ${pass}/${results.length} passed @${vw}px\n` + results.map(r => `${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  — ' + r.detail : ''}`).join('\n');
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
