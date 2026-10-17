/* Polimill 5年の年表 — shared core: data, palette, helpers, tooltip, draw-once registry.
   Every page loads: d3 → data.js → core.js → site.js → charts/*.js → boot.js */
(function () {
  'use strict';

  const PM = window.PM = {};
  const D = PM.D = window.PM_DATA;
  const parse = PM.parse = d3.timeParse('%Y-%m-%d');
  PM.fmtDot = d3.timeFormat('%Y.%m.%d');
  PM.fmtJ = d3.timeFormat('%Y年%-m月%-d日');
  PM.fmtYM = d3.timeFormat('%Y年%-m月');
  const keyM = PM.keyM = d3.timeFormat('%Y-%m');
  PM.nf = d3.format(',');
  PM.REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // path prefix to the site root ('' on the top page, '../' or '../../' below)
  PM.ROOT = document.documentElement.dataset.root || '';
  PM.href = p => PM.ROOT + p;

  // ---------- fixed palette (same in every chart) ----------
  PM.THEMES = [
    { key: 'Surfvote', label: 'Surfvote', color: '#4A4A4A' },
    { key: 'QommonsAI', label: 'QommonsAI', color: '#67C59F' },
    { key: 'QommonsAI研修', label: 'QommonsAI研修', color: '#B7E3CF' },
    { key: '自治体協定', label: '自治体協定', color: '#2F7D5B' },
    { key: '資金調達', label: '資金調達', color: '#8A8A8A' },
    { key: 'その他（登壇・出展・組織等）', label: 'その他', color: '#D6D6D6' },
  ];
  PM.TCOLOR = Object.fromEntries(PM.THEMES.map(t => [t.key, t.color]));
  PM.TLABEL = Object.fromEntries(PM.THEMES.map(t => [t.key, t.label]));
  PM.QA_KEYS = ['QommonsAI', 'QommonsAI研修', '自治体協定'];

  const CH = PM.CH = [
    { n: 1, from: '2021-10', to: '2022-12', period: '2021–2022', msg: '市民の声を政策に届ける実験から始まった' },
    { n: 2, from: '2023-01', to: '2024-07', period: '2023–2024.7', msg: '月20〜30本、社会課題を問い続けた' },
    { n: 3, from: '2024-08', to: '2025-04', period: '2024.8–2025.4', msg: '4か月で作り、型ごと立ち上げた' },
    { n: 4, from: '2025-05', to: '2025-12', period: '2025.5–2025.12', msg: '型を量産し、1年で600自治体へ' },
    { n: 5, from: '2026-01', to: '2026-10', period: '2026', msg: '無料のAIから、行政のプラットフォームへ' },
  ];
  CH.forEach(c => { c.name = D.chapters[c.n]; c.path = `chapters/${c.n}/`; });

  // ---------- helpers ----------
  const esc = PM.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ext = PM.ext = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>`;
  // ---------- confidence labels: shape/line style differ, not only color ----------
  PM.CONF = {
    fact: { label: '事実', desc: '公開記事の存在・日付・件数など、記事そのものから確かめられること' },
    claim: { label: '自社発表', desc: '同社が発表した数値や主張。第三者による検証はない' },
    est: { label: '試算', desc: '発表値からこのサイトが計算した値（月あたりのペース、倍率、目標比、逆算した時期など）' },
    unk: { label: '未確認', desc: '公開情報では確かめられないこと' },
  };
  PM.conf = k => `<a class="conf conf-${k}" href="${PM.ROOT}method/#sec-labels" title="${esc(PM.CONF[k].desc)}">${PM.CONF[k].label}</a>`;

  // ---------- source link icon: the source name shows on hover / first tap ----------
  const ICON = '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false"><path d="M5 2.5H2.5v7h7V7M7 2h3v3M10 2L5.5 6.5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  PM.srcIcon = (url, source, what) => `<a class="src-ic" href="${esc(url)}" target="_blank" rel="noopener" data-src="${esc(source)}" aria-label="出典：${esc(source)}${what ? '（' + esc(what) + '）' : ''}">${ICON}</a>`;
  PM.srcLine = (source, url, when, conf) => `<p class="src">${when ? esc(when) : ''}${conf ? PM.conf(conf) : ''}${PM.srcIcon(url, source, when)}</p>`;
  // touch: first tap shows the source name, second tap opens it
  let lastPointer = 'mouse';
  document.addEventListener('pointerdown', e => { lastPointer = e.pointerType; }, true);
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('.src-ic');
    document.querySelectorAll('.src-ic.armed').forEach(x => { if (x !== a) x.classList.remove('armed'); });
    if (!a || lastPointer !== 'touch' || a.classList.contains('armed')) return;
    e.preventDefault();
    a.classList.add('armed');
  }, true);

  // ---------- footnotes ----------
  PM.fnRef = (scope, n) => `<sup class="fn"><a href="#fn-${scope}-${n}" id="fnref-${scope}-${n}" aria-label="脚注${n}">${n}</a></sup>`;
  PM.footnotes = (scope, items) => `<ol class="footnotes" aria-label="脚注">${items.map((html, i) =>
    `<li id="fn-${scope}-${i + 1}">${html} <a class="fn-back" href="#fnref-${scope}-${i + 1}" aria-label="本文に戻る">戻る</a></li>`).join('')}</ol>`;

  // ---------- figure notes (also listed on the method page) ----------
  PM.NOTES = {};   // id -> { page, path, fig, items: [html] } — filled by notes.js
  PM.figNotes = (id, figure) => {
    const n = PM.NOTES[id];
    if (!n || !figure) return;
    figure.insertAdjacentHTML('beforeend', `<div class="fig-notes" data-notes="${id}">${n.items.map(h => `<p>${h}</p>`).join('')}</div>`);
  };
  PM.dot = s => PM.fmtDot(parse(s));
  PM.firstNum = s => { const m = String(s).replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? +m[0] : NaN; };
  const ms = PM.ms = (date, needle) => {
    const hit = D.milestones.find(m => m.date === date && (!needle || m.headline.includes(needle)));
    if (!hit) console.warn('milestone not found', date, needle);
    return hit;
  };
  PM.el = id => document.getElementById(id);
  const adoption = PM.adoption = D.adoption.map(a => Object.assign({}, a, { t: parse(a.date) }));
  const lastAdopt = PM.lastAdopt = adoption[adoption.length - 1];
  PM.round10 = v => Math.round(v / 10) * 10;
  PM.monthsBetween = (a, b) => (d3.timeDay.count(a.t, b.t) / 30.44).toFixed(1);
  PM.yen = v => v >= 1e8 ? (v / 1e8) + '億' : (v / 1e4) + '万';
  PM.debounce = (fn, wait) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, wait); }; };

  // chapter-local index of each milestone (used to cross-reference visuals and timelines)
  const msIndex = PM.msIndex = new Map();
  CH.forEach(c => D.milestones.filter(m => m.chapter === c.n).forEach((m, i) => msIndex.set(m, i + 1)));

  PM.interpAdoption = t => {
    for (let i = 1; i < adoption.length; i++) {
      const a = adoption[i - 1], b = adoption[i];
      if (t >= a.t && t <= b.t) return a.municipalities + (b.municipalities - a.municipalities) * ((t - a.t) / (b.t - a.t));
    }
    return NaN;
  };

  // ---------- derived data shared by several pages ----------
  const months = PM.months = d3.timeMonth.range(new Date(2021, 9, 1), new Date(2026, 10, 1));
  const monthRows = PM.monthRows = months.map(mm => {
    const r = { m: mm, k: keyM(mm), total: 0, pr: 0 };
    PM.THEMES.forEach(t => { r[t.key] = 0; });
    return r;
  });
  const byMonth = new Map(monthRows.map(r => [r.k, r]));
  D.news.forEach(n => {
    const r = byMonth.get(n.date.slice(0, 7));
    if (!r) { console.warn('news outside range', n); return; }
    if (!(n.theme in PM.TCOLOR)) console.warn('unknown theme', n.theme);
    r[n.theme] += 1; r.total += 1;
    if (n.source.startsWith('PR TIMES')) r.pr += 1;
  });

  const ch2 = CH[1];
  PM.svPeriod = D.news.filter(n => n.theme === 'Surfvote' && n.date.slice(0, 7) >= ch2.from && n.date.slice(0, 7) <= ch2.to)
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  PM.WALL_N = 30;
  PM.wallItems = d3.range(PM.WALL_N).map(i => PM.svPeriod[Math.round(i * (PM.svPeriod.length - 1) / (PM.WALL_N - 1))]);
  PM.ch2Months = monthRows.filter(r => r.k >= ch2.from && r.k <= ch2.to);

  PM.FUNDING = [
    { date: '2021-10-26', v: 3000e4, label: '約3,000万円', needle: '約3,000万円' },
    { date: '2021-11-30', v: 3500e4, label: '3,500万円超', needle: '3,500万円超' },
    { date: '2022-05-31', v: 7500e4, label: '7,500万円超', needle: '7,500万円超' },
    { date: '2022-12-13', v: 1.3e8, label: '約1.3億円', needle: '約1.3億円' },
  ].map(f => Object.assign(f, { t: parse(f.date), m: ms(f.date, f.needle) }));

  // every cumulative-funding figure stated in a milestone headline (labels are the headline wording)
  PM.FUND_CUM = [
    { date: '2021-10-26', v: 3000e4, label: '約3,000万円', needle: '約3,000万円' },
    { date: '2021-11-30', v: 3500e4, label: '3,500万円超', needle: '3,500万円超' },
    { date: '2022-05-31', v: 7500e4, label: '7,500万円超', needle: '7,500万円超' },
    { date: '2022-12-13', v: 1.3e8, label: '約1.3億円', needle: '約1.3億円' },
    { date: '2023-04-25', v: 1.7e8, label: '1.7億円超', needle: '1.7億円超' },
    { date: '2023-07-31', v: 2e8, label: '2億円超', needle: '2億円を超える' },
    { date: '2024-10-03', v: 5e8, label: '5億円超', needle: '5億円超' },
  ].map(f => Object.assign(f, { t: parse(f.date), m: ms(f.date, f.needle) }));
  // Series A: amount of the round only; no cumulative total was announced
  PM.SERIES_A = { date: '2026-01-19', t: parse('2026-01-19'), label: 'シリーズA 約6.35億円', m: ms('2026-01-19', '約6.35億円') };

  PM.STEPS = [
    { when: '2024.3', label: '開発開始', m: ms('2024-08-02'), note: '2024年8月2日発表の「開発開始から約4か月」から逆算' },
    { when: '2024.8', label: 'プレビュー版を約50自治体・省庁へ', m: ms('2024-08-02') },
    { when: '2024.9', label: '導入サポート研修を開始', m: ms('2024-09-03'), tag: ['研修', 't-train'] },
    { when: '2024.10', label: 'プロダクト版をリリース', m: ms('2024-10-29') },
    { when: '2024.11', label: '初の包括連携協定（群馬県館林市）', m: ms('2024-11-20'), tag: ['協定', 't-agree'] },
    { when: '2024.11', label: '100自治体・省庁、各100アカウントまで無料', m: ms('2024-11-30'), tag: ['無料枠', 't-free'] },
  ];

  PM.ZOOM_NOTES = [
    ms('2025-10-09', 'ISO'), ms('2025-11-05', '正社員'), ms('2025-12-05', 'ミッション'), ms('2025-12-08', 'LGWAN'),
  ].map(m => ({ m, t: parse(m.date), k: msIndex.get(m) }));

  PM.ECO = {
    C: { title: 'QommonsAI', sub: ['行政向け生成AIの基盤', '主要4社12モデルを統合'], src: [ms('2026-03-24'), ms('2026-05-08')] },
    L: { title: '自治体・職員', sub: [`約${PM.nf(lastAdopt.municipalities)}自治体・${lastAdopt.users_man}万人`, `（${PM.fmtYM(lastAdopt.t)}）`], src: [lastAdopt] },
    R: { title: '民間パートナー', sub: ['Qommons ONE', '（MCPアプリ）'], src: [ms('2026-01-05'), D.targets.find(t => t.item === 'Qommons ONE')] },
    T: { title: '国', sub: ['デジタル庁 法制事務AI技術検証', '総務省「信頼できるAI」開発実証'], src: [ms('2025-06-02'), ms('2026-06-30')] },
    B: { title: '新製品', sub: ['Qommons Qraft／Quester／洛索'], src: [ms('2026-05-27'), ms('2026-02-28')] },
  };

  // milestones that appear in a chapter's main visual (shown with a filled dot in the timeline)
  PM.keyMilestones = new Set([
    ...PM.FUNDING.map(f => f.m), ...PM.STEPS.map(s => s.m), ...PM.ZOOM_NOTES.map(n => n.m),
    ...D.milestones.filter(m => m.chapter === 2),
    ms('2026-03-24'), ms('2026-05-27'), ms('2026-06-30'),
  ]);

  // ---------- tooltip ----------
  const tip = PM.tip = d3.select('body').append('div').attr('class', 'tip').attr('role', 'status');
  let pinned = false;
  PM.isPinned = () => pinned;
  function placeTip(ev) {
    const n = tip.node(), pad = 12, w = n.offsetWidth, h = n.offsetHeight;
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - pad;
    if (x < 8) x = 8;
    if (y + h > window.innerHeight - 8) y = ev.clientY - h - pad;
    if (y < 8) y = 8;
    tip.style('left', x + 'px').style('top', y + 'px');
  }
  const showTip = PM.showTip = (html, ev) => { tip.html(html).style('display', 'block'); placeTip(ev); };
  const hideTip = PM.hideTip = () => { tip.style('display', 'none'); };
  PM.bindTip = (sel, html) => {
    sel.style('cursor', 'pointer')
      .on('pointermove', (ev, d) => { if (ev.pointerType === 'mouse' && !pinned) showTip(html(d), ev); })
      .on('pointerleave', ev => { if (ev.pointerType === 'mouse' && !pinned) hideTip(); })
      .on('click', (ev, d) => { ev.stopPropagation(); pinned = true; showTip(html(d), ev); });
  };
  document.addEventListener('click', e => { if (!tip.node().contains(e.target)) { pinned = false; hideTip(); } });
  // keyboard: Esc closes a pinned tooltip
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { pinned = false; hideTip(); } });
  // "この月の記事を一覧で見る": filter in place on the archive page, otherwise go there
  tip.on('click', ev => {
    const b = ev.target.closest('.tip-act');
    if (!b) return;
    pinned = false; hideTip();
    if (window.PM_filterMonth) window.PM_filterMonth(b.dataset.month);
    else window.location.href = PM.href(`archive/?month=${b.dataset.month}`);
  });
  window.addEventListener('scroll', () => { pinned = false; hideTip(); }, { passive: true });

  // ---------- draw-once-on-scroll registry ----------
  const charts = [];
  PM.register = (node, render) => { if (node) charts.push({ node, render, drawn: false }); };
  function draw(c, animate) { c.node.innerHTML = ''; c.render(c.node, animate && !PM.REDUCED); c.drawn = true; }
  window.PM_renderAll = () => charts.forEach(c => { if (!c.drawn) draw(c, false); });
  PM.startCharts = () => {
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const c = charts.find(c => c.node === e.target);
        if (c && !c.drawn) draw(c, true);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' }) : null;
    charts.forEach(c => { if (io) io.observe(c.node); else draw(c, false); });
  };
  let lastW = window.innerWidth;
  window.addEventListener('resize', PM.debounce(() => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    charts.forEach(c => { if (c.drawn) draw(c, false); });
  }, 150));

  PM.svgFor = (node, W, H, label) => d3.select(node).append('svg').attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img').attr('aria-label', label);
  PM.legend = (id, items) => {
    const n = PM.el(id); if (!n) return;
    n.innerHTML = items.map(i => `<li><span class="sw ${i.cls || ''}" style="${i.color ? 'background:' + i.color : ''}"></span>${esc(i.label)}</li>`).join('');
  };
  PM.yearMonthTick = d => d.getMonth() === 0 ? d3.timeFormat('%Y')(d) : d3.timeFormat('%-m月')(d);
})();
