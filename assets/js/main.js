/* Polimill 5年の年表 — rendering. Data: window.PM_DATA (generated from polimill_data/). */
(function () {
  'use strict';

  const D = window.PM_DATA;
  const parse = d3.timeParse('%Y-%m-%d');
  const fmtDot = d3.timeFormat('%Y.%m.%d');
  const fmtJ = d3.timeFormat('%Y年%-m月%-d日');
  const fmtYM = d3.timeFormat('%Y年%-m月');
  const keyM = d3.timeFormat('%Y-%m');
  const nf = d3.format(',');
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- fixed palette (same in every chart) ----------
  const THEMES = [
    { key: 'Surfvote', label: 'Surfvote', color: '#4A4A4A' },
    { key: 'QommonsAI', label: 'QommonsAI', color: '#67C59F' },
    { key: 'QommonsAI研修', label: 'QommonsAI研修', color: '#B7E3CF' },
    { key: '自治体協定', label: '自治体協定', color: '#2F7D5B' },
    { key: '資金調達', label: '資金調達', color: '#8A8A8A' },
    { key: 'その他（登壇・出展・組織等）', label: 'その他', color: '#D6D6D6' },
  ];
  const TCOLOR = Object.fromEntries(THEMES.map(t => [t.key, t.color]));
  const TLABEL = Object.fromEntries(THEMES.map(t => [t.key, t.label]));
  const QA_KEYS = ['QommonsAI', 'QommonsAI研修', '自治体協定'];

  const CH = [
    { n: 1, from: '2021-10', to: '2022-12' },
    { n: 2, from: '2023-01', to: '2024-07' },
    { n: 3, from: '2024-08', to: '2025-04' },
    { n: 4, from: '2025-05', to: '2025-12' },
    { n: 5, from: '2026-01', to: '2026-10' },
  ];

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ext = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>`;
  const srcLine = (source, url, when) => `<p class="src">${when ? esc(when) + '　' : ''}出典：${ext(url, source)}</p>`;
  const dot = s => fmtDot(parse(s));
  const firstNum = s => { const m = String(s).replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? +m[0] : NaN; };
  const ms = (date, needle) => {
    const hit = D.milestones.find(m => m.date === date && (!needle || m.headline.includes(needle)));
    if (!hit) console.warn('milestone not found', date, needle);
    return hit;
  };
  const el = id => document.getElementById(id);
  const adoption = D.adoption.map(a => Object.assign({}, a, { t: parse(a.date) }));
  const lastAdopt = adoption[adoption.length - 1];

  // chapter-local index of each milestone (used to cross-reference visuals and timelines)
  const msIndex = new Map();
  CH.forEach(c => D.milestones.filter(m => m.chapter === c.n).forEach((m, i) => msIndex.set(m, i + 1)));
  const keyMilestones = new Set();

  // ---------- tooltip ----------
  const tip = d3.select('body').append('div').attr('class', 'tip').attr('role', 'status');
  let pinned = false;
  function placeTip(ev) {
    const n = tip.node(), pad = 12, w = n.offsetWidth, h = n.offsetHeight;
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - pad;
    if (x < 8) x = 8;
    if (y + h > window.innerHeight - 8) y = ev.clientY - h - pad;
    if (y < 8) y = 8;
    tip.style('left', x + 'px').style('top', y + 'px');
  }
  function showTip(html, ev) { tip.html(html).style('display', 'block'); placeTip(ev); }
  function hideTip() { tip.style('display', 'none'); }
  function bindTip(sel, html) {
    sel.style('cursor', 'pointer')
      .on('pointermove', (ev, d) => { if (ev.pointerType === 'mouse' && !pinned) showTip(html(d), ev); })
      .on('pointerleave', ev => { if (ev.pointerType === 'mouse' && !pinned) hideTip(); })
      .on('click', (ev, d) => { ev.stopPropagation(); pinned = true; showTip(html(d), ev); });
  }
  document.addEventListener('click', e => { if (!tip.node().contains(e.target)) { pinned = false; hideTip(); } });
  tip.on('click', ev => {
    const b = ev.target.closest('.tip-act');
    if (!b || !window.PM_filterMonth) return;
    pinned = false; hideTip(); window.PM_filterMonth(b.dataset.month);
  });
  window.addEventListener('scroll', () => { pinned = false; hideTip(); }, { passive: true });

  // ---------- draw-once-on-scroll registry ----------
  const charts = [];
  function register(node, render) { charts.push({ node, render, drawn: false }); }
  function draw(c, animate) { c.node.innerHTML = ''; c.render(c.node, animate && !REDUCED); c.drawn = true; }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const c = charts.find(c => c.node === e.target);
      if (c && !c.drawn) draw(c, true);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;
  window.PM_renderAll = () => charts.forEach(c => { if (!c.drawn) draw(c, false); });
  let lastW = window.innerWidth;
  window.addEventListener('resize', debounce(() => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    charts.forEach(c => { if (c.drawn) draw(c, false); });
  }, 150));
  function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }

  function svgFor(node, W, H, label) {
    return d3.select(node).append('svg').attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img').attr('aria-label', label);
  }
  function legend(id, items) {
    el(id).innerHTML = items.map(i => `<li><span class="sw ${i.cls || ''}" style="${i.color ? 'background:' + i.color : ''}"></span>${esc(i.label)}</li>`).join('');
  }
  function yearMonthTick(d) { return d.getMonth() === 0 ? d3.timeFormat('%Y')(d) : d3.timeFormat('%-m月')(d); }

  // =====================================================================
  // 00 現在地 — metrics + adoption curve
  // =====================================================================
  function renderMetrics() {
    const seriesA = ms('2026-01-19', 'シリーズA');
    const ev = D.prefecture_events;
    const prefN = new Set(ev.map(e => e.prefecture)).size;
    const evLast = d3.max(ev, e => e.date);
    const users = lastAdopt.users_man;
    const items = [
      { key: 'municipalities', label: '導入自治体', value: `約${nf(lastAdopt.municipalities)}`, unit: '', raw: lastAdopt.municipalities,
        src: srcLine(lastAdopt.source, lastAdopt.url, fmtJ(lastAdopt.t) + '時点') },
      { key: 'users', label: '職員ユーザー', value: `約${users}`, unit: '万人', raw: users,
        src: srcLine(lastAdopt.source, lastAdopt.url, fmtJ(lastAdopt.t) + '時点') },
      { key: 'seriesA', label: 'シリーズA調達額', value: '約6.35', unit: '億円', value2: '評価額 約50億円', raw: '約6.35億円|約50億円',
        src: srcLine(seriesA.source, seriesA.url, fmtJ(parse(seriesA.date)) + '発表') },
      { key: 'events', label: '研修・協定', value: `${ev.length}`, unit: '件', value2: `${prefN}都道府県で実施`, raw: `${ev.length}|${prefN}`,
        src: `<p class="src">${esc(fmtJ(parse(evLast)))}までの自社発表を集計　<a href="#s07">内訳は07へ</a></p>` },
    ];
    el('metrics').innerHTML = items.map(i => `
      <div class="metric" data-key="${i.key}" data-raw="${esc(i.raw)}">
        <p class="metric-label">${esc(i.label)}</p>
        <p class="metric-value">${i.value}<small>${esc(i.unit)}</small></p>
        ${i.value2 ? `<p class="metric-value2">${esc(i.value2)}</p>` : ''}
        ${i.src}
      </div>`).join('');
  }

  function interpAdoption(t) {
    for (let i = 1; i < adoption.length; i++) {
      const a = adoption[i - 1], b = adoption[i];
      if (t >= a.t && t <= b.t) return a.municipalities + (b.municipalities - a.municipalities) * ((t - a.t) / (b.t - a.t));
    }
    return NaN;
  }

  function adoptionTip(d) {
    return `<b>${fmtJ(d.t)}</b><br>${esc(d.note)}` +
      `<div class="row">導入自治体<span class="v">${nf(d.municipalities)}</span></div>` +
      (d.users_man != null ? `<div class="row">職員ユーザー<span class="v">${d.users_man}万人</span></div>` : '') +
      `<p class="src">出典：${ext(d.url, d.source)}</p>`;
  }

  function adoptionChart(node, animate, cfg) {
    const W = node.clientWidth, narrow = W < 560;
    const H = cfg.height(narrow);
    const m = { t: 36, r: narrow ? 10 : 20, b: 26, l: 34 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = d3.scaleTime().domain(cfg.domain).range([0, iw]);
    const y = d3.scaleLinear().domain([0, cfg.yMax]).range([ih, 0]);
    const svg = svgFor(node, W, H, cfg.aria);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    const yt = y.ticks(4);
    g.append('g').attr('class', 'grid').selectAll('line').data(yt).join('line').attr('x1', 0).attr('x2', iw).attr('y1', y).attr('y2', y);
    g.append('g').selectAll('text').data(yt).join('text').attr('class', 'tick-label').attr('x', -6).attr('y', d => y(d) + 3).attr('text-anchor', 'end').text(nf);

    // period after the last announcement
    if (cfg.noData) {
      const x0 = x(lastAdopt.t);
      g.append('rect').attr('x', x0).attr('y', 0).attr('width', iw - x0).attr('height', ih).attr('fill', '#F4F4F4');
      const tx = g.append('text').attr('class', 'lbl-s').attr('x', (x0 + iw) / 2).attr('y', ih - 36).attr('text-anchor', 'middle');
      ['2026年6月', '以降', '発表なし'].forEach((s, i) => tx.append('tspan').attr('x', (x0 + iw) / 2).attr('dy', i ? 13 : 0).text(s));
    }

    // chapter boundaries
    (cfg.chapters || []).forEach(c => {
      const t = parse(c.from + '-01');
      if (t < cfg.domain[0] || t > cfg.domain[1]) return;
      g.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', -16).attr('y2', ih).attr('stroke', '#BDBDBD').attr('stroke-width', 0.5).attr('stroke-dasharray', '2 3');
      g.append('text').attr('class', 'lbl-s').attr('x', x(t) + 3).attr('y', -8).text(`第${c.n}章`);
    });

    const xa = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(cfg.tickMonths(narrow))).tickFormat(yearMonthTick).tickSize(3));
    xa.select('.domain').attr('stroke', '#111');

    const visible = adoption.filter(d => d.t >= cfg.domain[0] && d.t <= cfg.domain[1]);
    // cut the line exactly at the domain edges instead of drawing past them
    const edge = t => { const v = interpAdoption(t); return isNaN(v) ? [] : [{ t, municipalities: v }]; };
    const inDomain = edge(cfg.domain[0]).concat(visible, edge(cfg.domain[1]));
    const line = d3.line().x(d => x(d.t)).y(d => y(d.municipalities));
    const path = g.append('path').datum(inDomain).attr('d', line).attr('fill', 'none').attr('stroke', '#67C59F').attr('stroke-width', 2);
    const pts = g.append('g').selectAll('circle').data(visible).join('circle')
      .attr('class', 'pt').attr('data-date', d => d.date).attr('data-v', d => d.municipalities)
      .attr('cx', d => x(d.t)).attr('cy', d => y(d.municipalities)).attr('r', 3)
      .attr('fill', d => d === lastAdopt ? '#67C59F' : '#fff').attr('stroke', '#2F7D5B').attr('stroke-width', 1);

    // value labels
    const labels = g.append('g');
    (cfg.valueLabels || []).forEach(v => {
      const [date, pos] = Array.isArray(v) ? v : [v, 'tl'];
      const d = adoption.find(a => a.date === date); if (!d) return;
      const px = x(d.t), py = y(d.municipalities), br = pos === 'br';
      labels.append('text').attr('class', 'lbl halo').attr('x', br ? px + 5 : px - 5).attr('y', br ? py + 14 : py - 7)
        .attr('text-anchor', br ? 'start' : 'end').text(nf(d.municipalities));
    });
    if (cfg.lastLabel) {
      const lx = x(lastAdopt.t), ly = y(lastAdopt.municipalities);
      const t = labels.append('text').attr('class', 'lbl-b halo').attr('text-anchor', 'end').attr('x', lx - 8).attr('y', ly - (narrow ? 22 : 10));
      const head = lastAdopt.note;
      const when = `（${fmtYM(lastAdopt.t)}）`;
      if (narrow) { t.append('tspan').attr('x', lx - 8).text(head); t.append('tspan').attr('x', lx - 8).attr('dy', 14).attr('class', 'lbl-s').text(when); }
      else t.text(head + when);
    }

    // annotations on the curve (chapter 4)
    if (cfg.notes) {
      let prev = null;
      const ng = g.append('g');
      cfg.notes.forEach(n => {
        const cx = x(n.t), cyCurve = y(interpAdoption(n.t));
        let cy = cyCurve - 22;
        if (prev && cx - prev.cx < 20) cy = Math.min(cy, prev.cy - 20);
        ng.append('line').attr('x1', cx).attr('x2', cx).attr('y1', cyCurve).attr('y2', cy).attr('stroke', '#111').attr('stroke-width', 0.5);
        ng.append('circle').attr('cx', cx).attr('cy', cyCurve).attr('r', 2).attr('fill', '#111');
        const k = ng.append('g').attr('class', 'note-k').datum(n).attr('transform', `translate(${cx},${cy})`);
        k.append('circle').attr('r', 8).attr('fill', '#111');
        k.append('text').attr('text-anchor', 'middle').attr('y', 3.5).attr('fill', '#fff').style('font-size', '10px').text(n.k);
        bindTip(k, d => `<b>${fmtJ(d.t)}</b><br>${esc(d.m.headline)}<p class="src">出典：${ext(d.m.url, d.m.source)}</p>`);
        prev = { cx, cy };
      });
    }

    // hit targets
    bindTip(g.append('g').selectAll('circle').data(visible).join('circle')
      .attr('cx', d => x(d.t)).attr('cy', d => y(d.municipalities)).attr('r', 13).attr('fill', 'transparent'), adoptionTip);

    if (animate) {
      const L = path.node().getTotalLength();
      path.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L).transition().duration(1200).ease(d3.easeCubicOut).attr('stroke-dashoffset', 0)
        .on('end', () => path.attr('stroke-dasharray', null));
      pts.attr('opacity', 0).transition().delay((d, i) => 300 + i * 70).duration(300).attr('opacity', 1);
      labels.attr('opacity', 0).transition().delay(1100).duration(400).attr('opacity', 1);
    }
  }

  function renderS00Body() {
    const first = adoption[0];
    const months = d3.timeMonth.count(first.t, lastAdopt.t);
    el('s00-body').innerHTML = `
      <p>QommonsAIの導入自治体数は、${fmtYM(first.t)}の${esc(first.note)}から${fmtYM(lastAdopt.t)}の${esc(lastAdopt.note)}まで、${months}か月で約${Math.round(lastAdopt.municipalities / first.municipalities)}倍になった。数値はいずれも同社発表の概数で、${fmtYM(lastAdopt.t)}を最後に更新が止まっている。</p>
      <p class="src">点をクリック／タップすると、その時点の発表文と出典が開く。</p>`;
  }

  // =====================================================================
  // 01 5年の地図 — monthly stacked bars
  // =====================================================================
  const months = d3.timeMonth.range(new Date(2021, 9, 1), new Date(2026, 10, 1));
  const monthRows = months.map(mm => {
    const r = { m: mm, k: keyM(mm), total: 0, pr: 0 };
    THEMES.forEach(t => { r[t.key] = 0; });
    return r;
  });
  const byMonth = new Map(monthRows.map(r => [r.k, r]));
  D.news.forEach(n => {
    const r = byMonth.get(n.date.slice(0, 7));
    if (!r) { console.warn('news outside range', n); return; }
    if (!(n.theme in TCOLOR)) console.warn('unknown theme', n.theme);
    r[n.theme] += 1; r.total += 1;
    if (n.source.startsWith('PR TIMES')) r.pr += 1;
  });

  function monthlyTip(r) {
    const rows = THEMES.filter(t => r[t.key] > 0).map(t => `<div class="row"><span class="sw" style="background:${t.color}"></span>${esc(t.label)}<span class="v">${r[t.key]}</span></div>`).join('');
    return `<b>${fmtYM(r.m)}　計${r.total}本</b>${rows}` + (r.pr ? `<p class="src">うち${r.pr}本はPR TIMES（サイト未掲載期間の補完）</p>` : '') +
      `<p class="src">出典：0_all_news_699.csv を月×テーマで集計</p>` +
      (r.total ? `<button type="button" class="tip-act" data-month="${r.k}">この月の記事を一覧で見る</button>` : '');
  }

  function monthlyChart(node, animate) {
    const W = node.clientWidth, narrow = W < 560;
    const H = narrow ? 310 : 370;
    const m = { t: 34, r: 30, b: 50, l: 24 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = d3.scaleBand().domain(monthRows.map(r => r.k)).range([0, iw]).paddingInner(narrow ? 0.12 : 0.2);
    const y = d3.scaleLinear().domain([0, Math.max(30, d3.max(monthRows, r => r.total))]).nice().range([ih, 0]);
    const svg = svgFor(node, W, H, '月別の発信本数のテーマ別積み上げ棒グラフ');
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    // chapter band
    // chapter band: each band jumps to its chapter section
    CH.forEach((c, i) => {
      const x0 = x(c.from), x1 = x(c.to) + x.bandwidth();
      const a = g.append('a').attr('class', 'band-link').attr('href', `#s0${c.n + 1}`).attr('aria-label', `第${c.n}章 ${D.chapters[c.n]} へ移動`);
      a.append('rect').attr('x', x0).attr('y', -28).attr('width', x1 - x0).attr('height', 18).attr('fill', i % 2 ? '#E4E4E4' : '#F2F2F2');
      a.append('text').attr('class', 'lbl').attr('x', (x0 + x1) / 2).attr('y', -15).attr('text-anchor', 'middle').style('font-size', '10px').text(`第${c.n}章`);
    });
    const y2 = d3.scaleLinear().domain([0, 1000]).range([ih, 0]);
    const pos = date => { const t = parse(date), days = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); return x(keyM(t)) + x.step() * (t.getDate() - 1) / days; };

    const yt = y.ticks(3);
    g.append('g').attr('class', 'grid').selectAll('line').data(yt).join('line').attr('x1', 0).attr('x2', iw).attr('y1', y).attr('y2', y);
    g.append('g').selectAll('text').data(yt).join('text').attr('class', 'tick-label').attr('x', -4).attr('y', d => y(d) + 3).attr('text-anchor', 'end').text(d => d);
    g.append('g').selectAll('text').data([0, 500, 1000]).join('text').attr('class', 'tick-label').attr('x', iw + 4).attr('y', d => y2(d) + 3).text(nf);

    const stack = d3.stack().keys(THEMES.map(t => t.key))(monthRows);
    const segs = g.append('g').selectAll('g').data(stack).join('g').attr('fill', s => TCOLOR[s.key])
      .selectAll('rect').data(s => s.map(v => ({ v, key: s.key }))).join('rect')
      .attr('class', 'seg').attr('data-n', d => d.v[1] - d.v[0]).attr('data-theme', d => d.key)
      .attr('x', d => x(d.v.data.k)).attr('width', x.bandwidth())
      .attr('y', d => y(d.v[1])).attr('height', d => y(d.v[0]) - y(d.v[1]));

    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ih).attr('y2', ih).attr('stroke', '#111').attr('stroke-width', 1);
    // PR TIMES marks
    g.append('g').selectAll('rect').data(monthRows.filter(r => r.pr > 0)).join('rect').attr('class', 'pr-mark')
      .attr('x', r => x(r.k) + x.bandwidth() / 2 - 1.5).attr('y', ih + 4).attr('width', 3).attr('height', 3).attr('fill', '#111');
    // milestone marks (one triangle per month that has milestones)
    const msByMonth = d3.groups(D.milestones, mm => mm.date.slice(0, 7));
    const tri = g.append('g').selectAll('path').data(msByMonth).join('path').attr('class', 'ms-mark')
      .attr('d', ([k]) => `M${x(k) + x.bandwidth() / 2},${ih + 10} l3.5,6 h-7 z`).attr('fill', '#4A4A4A');
    // year labels
    const yrs = monthRows.filter(r => r.m.getMonth() === 0 || (r === monthRows[0] && !narrow));
    g.append('g').selectAll('line').data(yrs).join('line').attr('x1', r => x(r.k)).attr('x2', r => x(r.k)).attr('y1', ih).attr('y2', ih + 26).attr('stroke', '#BDBDBD').attr('stroke-width', 0.5);
    g.append('g').selectAll('text').data(yrs).join('text').attr('class', 'tick-label').attr('x', r => x(r.k) + 2).attr('y', ih + 34)
      .text(r => r === monthRows[0] ? '2021.10' : r.m.getFullYear());

    bindTip(g.append('g').selectAll('rect').data(monthRows).join('rect')
      .attr('x', r => x(r.k) - (x.step() - x.bandwidth()) / 2).attr('width', x.step()).attr('y', -8).attr('height', ih + 15).attr('fill', 'transparent'), monthlyTip);
    bindTip(g.append('g').selectAll('rect').data(msByMonth).join('rect')
      .attr('x', ([k]) => x(k) + x.bandwidth() / 2 - Math.max(6, x.step() / 2)).attr('width', () => Math.max(12, x.step())).attr('y', ih + 8).attr('height', 12).attr('fill', 'transparent'),
      ([k, list]) => `<b>${fmtYM(parse(k + '-01'))}のマイルストーン</b>` + list.map(mm => `<p class="src">${dot(mm.date)} ${ext(mm.url, mm.headline)}</p>`).join(''));

    // adoption overlay (right axis)
    const ad = adoption.map(a => ({ a, px: pos(a.date), py: y2(a.municipalities) }));
    const adLine = g.append('path').datum(ad).attr('d', d3.line().x(d => d.px).y(d => d.py)).attr('fill', 'none').attr('stroke', '#111').attr('stroke-width', 1.5);
    const adDots = g.append('g').selectAll('circle').data(ad).join('circle').attr('class', 'pt').attr('data-date', d => d.a.date).attr('data-v', d => d.a.municipalities)
      .attr('cx', d => d.px).attr('cy', d => d.py).attr('r', d => d.a === lastAdopt ? 3.5 : 2).attr('fill', '#111');
    const lastP = ad[ad.length - 1];
    const adLbl = g.append('text').attr('class', 'lbl-b halo').attr('x', lastP.px - 6).attr('y', lastP.py - 8).attr('text-anchor', 'end').text(`約${nf(lastAdopt.municipalities)}`);
    bindTip(g.append('g').selectAll('circle').data(ad).join('circle').attr('cx', d => d.px).attr('cy', d => d.py).attr('r', 9).attr('fill', 'transparent'), d => adoptionTip(d.a));

    if (animate) {
      segs.attr('y', ih).attr('height', 0).transition().delay(d => months.findIndex(mm => keyM(mm) === d.v.data.k) * 12).duration(500).ease(d3.easeCubicOut)
        .attr('y', d => y(d.v[1])).attr('height', d => y(d.v[0]) - y(d.v[1]));
      const L = adLine.node().getTotalLength();
      adLine.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L).transition().delay(600).duration(1000).attr('stroke-dashoffset', 0)
        .on('end', () => adLine.attr('stroke-dasharray', null));
      adDots.attr('opacity', 0).transition().delay(1400).duration(300).attr('opacity', 1);
      adLbl.attr('opacity', 0).transition().delay(1500).duration(300).attr('opacity', 1);
      tri.attr('opacity', 0).transition().delay(900).duration(400).attr('opacity', 1);
    }
  }

  function renderS01Body() {
    const rows = CH.map(c => {
      const rs = monthRows.filter(r => r.k >= c.from && r.k <= c.to);
      const total = d3.sum(rs, r => r.total), sv = d3.sum(rs, r => r.Surfvote), qa = d3.sum(rs, r => d3.sum(QA_KEYS, k => r[k]));
      return { c, total, avg: total / rs.length, sv: sv / total, qa: qa / total };
    });
    const pct = v => Math.round(v * 100) + '%';
    // first month from which QommonsAI-related posts exceed Surfvote in every month that has posts
    let cross = null;
    for (let i = monthRows.length - 1; i >= 0; i--) {
      const r = monthRows[i];
      if (r.total === 0) continue;
      if (d3.sum(QA_KEYS, k => r[k]) > r.Surfvote) cross = r; else break;
    }
    const total = d3.sum(monthRows, r => r.total);
    el('s01-body').innerHTML = `
      <table class="mini"><thead><tr><th>章</th><th>本数</th><th>月平均</th><th>Surfvote</th><th>QommonsAI系</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>第${r.c.n}章</td><td>${r.total}</td><td>${r.avg.toFixed(1)}</td><td>${pct(r.sv)}</td><td>${pct(r.qa)}</td></tr>`).join('')}
      <tr><td>計</td><td>${total}</td><td>${(total / monthRows.length).toFixed(1)}</td><td></td><td></td></tr>
      </tbody></table>
      <p class="src">QommonsAI系＝QommonsAI・QommonsAI研修・自治体協定の合計。テーマ分類は元データの暫定分類による。データのない月も0として横軸に含める（全${monthRows.length}か月）。</p>
      <p>第2章までは発信の大半がSurfvoteの投票記事だった。${cross ? `${fmtYM(cross.m)}以降は、QommonsAI関連の発信が毎月Surfvoteを上回っている。` : ''}発信の総量は第3〜4章で月10本前後まで細り、第5章で月15本前後に戻った。</p>`;
  }

  // =====================================================================
  // 02 第1章 — cumulative funding staircase
  // =====================================================================
  const FUNDING = [
    { date: '2021-10-26', v: 3000e4, label: '約3,000万円', needle: '約3,000万円' },
    { date: '2021-11-30', v: 3500e4, label: '3,500万円超', needle: '3,500万円超' },
    { date: '2022-05-31', v: 7500e4, label: '7,500万円超', needle: '7,500万円超' },
    { date: '2022-12-13', v: 1.3e8, label: '約1.3億円', needle: '約1.3億円' },
  ].map(f => Object.assign(f, { t: parse(f.date), m: ms(f.date, f.needle) }));
  FUNDING.forEach(f => keyMilestones.add(f.m));
  const round10 = v => Math.round(v / 10) * 10;
  const monthsBetween = (a, b) => (d3.timeDay.count(a.t, b.t) / 30.44).toFixed(1);
  const yen = v => v >= 1e8 ? (v / 1e8) + '億' : (v / 1e4) + '万';

  function fundingChart(node, animate) {
    const W = node.clientWidth, narrow = W < 560;
    const H = narrow ? 240 : 280;
    const m = { t: 24, r: 12, b: 26, l: 44 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const domain = [new Date(2021, 9, 1), new Date(2023, 0, 1)];
    const x = d3.scaleTime().domain(domain).range([0, iw]);
    const y = d3.scaleLinear().domain([0, 1.5e8]).range([ih, 0]);
    const svg = svgFor(node, W, H, '累計調達額の階段チャート');
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
    const yt = [0, 5e7, 1e8, 1.5e8];
    g.append('g').attr('class', 'grid').selectAll('line').data(yt).join('line').attr('x1', 0).attr('x2', iw).attr('y1', y).attr('y2', y);
    g.append('g').selectAll('text').data(yt).join('text').attr('class', 'tick-label').attr('x', -6).attr('y', d => y(d) + 3).attr('text-anchor', 'end').text(d => d ? yen(d) + '円' : '');
    const xa = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(narrow ? 6 : 3)).tickFormat(d => +d === +domain[0] ? '2021.10' : yearMonthTick(d)).tickSize(3));
    xa.select('.domain').attr('stroke', '#111');

    const pts = FUNDING.map(f => ({ t: f.t, v: f.v })).concat([{ t: domain[1], v: FUNDING[FUNDING.length - 1].v }]);
    const area = d3.area().curve(d3.curveStepAfter).x(d => x(d.t)).y0(ih).y1(d => y(d.v));
    const line = d3.line().curve(d3.curveStepAfter).x(d => x(d.t)).y(d => y(d.v));
    const ar = g.append('path').datum(pts).attr('d', area).attr('fill', '#8A8A8A').attr('fill-opacity', 0.14);
    const ln = g.append('path').datum(pts).attr('d', line).attr('fill', 'none').attr('stroke', '#8A8A8A').attr('stroke-width', 2);
    const dots = g.append('g').selectAll('circle').data(FUNDING).join('circle').attr('cx', d => x(d.t)).attr('cy', d => y(d.v)).attr('r', 3.5).attr('fill', '#fff').attr('stroke', '#111');

    // labels with simple vertical dodge
    const lg = g.append('g');
    let prev = null;
    FUNDING.forEach(f => {
      const fx = x(f.t), right = fx > iw - 80;
      let ly = y(f.v) - 9;
      if (prev && Math.abs(fx - prev.x) < prev.w + 6 && Math.abs(ly - prev.y) < 16) ly = prev.y - 16;
      const t = lg.append('text').attr('class', 'lbl-b halo').attr('x', right ? fx - 4 : fx + 4).attr('y', ly).attr('text-anchor', right ? 'end' : 'start').text(f.label);
      lg.append('text').attr('class', 'lbl-s halo').attr('x', right ? fx - 4 : fx + 4).attr('y', ly - 15).attr('text-anchor', right ? 'end' : 'start').text(d3.timeFormat('%Y.%-m')(f.t));
      prev = { x: fx, y: ly - 15, w: t.node().getComputedTextLength() };
    });
    bindTip(g.append('g').selectAll('circle').data(FUNDING).join('circle').attr('cx', d => x(d.t)).attr('cy', d => y(d.v)).attr('r', 14).attr('fill', 'transparent'),
      f => `<b>${fmtJ(f.t)}</b><br>${esc(f.m.headline)}<p class="src">出典：${ext(f.m.url, f.m.source)}</p>`);

    if (animate) {
      const L = ln.node().getTotalLength();
      ln.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L).transition().duration(1100).ease(d3.easeLinear).attr('stroke-dashoffset', 0);
      ar.attr('fill-opacity', 0).transition().delay(700).duration(500).attr('fill-opacity', 0.14);
      dots.attr('opacity', 0).transition().delay((d, i) => 200 + i * 250).attr('opacity', 1);
      lg.attr('opacity', 0).transition().delay(900).duration(400).attr('opacity', 1);
    }
  }

  function renderS02Body() {
    const later = D.milestones.filter(m => m.chapter > 1 && m.headline.includes('調達'));
    el('s02-body').innerHTML = `
      <p>最初のプロダクトは行政向けではなく、市民が社会課題に投票する政策提言SNS「Surfvote」だった。2022年末には投票結果を3省へ提出し、奈良県田原本町との「Surfvoteローカル」も始まる。この時期の調達は累計約1.3億円まで。</p>
      <p class="src">その後の累計調達（マイルストーンより）：${later.map(m => `${dot(m.date)} ${ext(m.url, m.headline)}`).join('　／　')}</p>`;
  }

  // =====================================================================
  // 03 第2章 — wall of issues + milestone strip
  // =====================================================================
  const ch2 = CH[1];
  const svPeriod = D.news.filter(n => n.theme === 'Surfvote' && n.date.slice(0, 7) >= ch2.from && n.date.slice(0, 7) <= ch2.to)
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const WALL_N = 30;
  const wallItems = d3.range(WALL_N).map(i => svPeriod[Math.round(i * (svPeriod.length - 1) / (WALL_N - 1))]);
  const ch2Months = monthRows.filter(r => r.k >= ch2.from && r.k <= ch2.to);

  function wallStrip(node, animate) {
    const W = node.clientWidth;
    const H = 110, m = { t: 26, r: 4, b: 20, l: 4 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = d3.scaleBand().domain(ch2Months.map(r => r.k)).range([0, iw]).paddingInner(0.18);
    const y = d3.scaleLinear().domain([0, 32]).range([ih, 0]);
    const svg = svgFor(node, W, H, '第2章の月別Surfvote記事数とマイルストーン');
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
    g.append('rect').attr('x', 0).attr('width', iw).attr('y', y(30)).attr('height', y(20) - y(30)).attr('fill', '#67C59F').attr('fill-opacity', 0.16);
    g.append('text').attr('class', 'lbl-s').attr('x', iw).attr('y', y(30) - 3).attr('text-anchor', 'end').text('月20〜30本の帯');
    const bars = g.append('g').selectAll('rect').data(ch2Months).join('rect').attr('fill', '#4A4A4A')
      .attr('x', r => x(r.k)).attr('width', x.bandwidth()).attr('y', r => y(r.Surfvote)).attr('height', r => ih - y(r.Surfvote));
    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ih).attr('y2', ih).attr('stroke', '#111');
    g.append('g').selectAll('text').data(ch2Months.filter(r => r.m.getMonth() === 0)).join('text').attr('class', 'tick-label')
      .attr('x', r => x(r.k)).attr('y', ih + 13).text(r => r.m.getFullYear());

    const pos = date => { const t = parse(date), k = keyM(t), days = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); return x(k) + x.step() * (t.getDate() - 1) / days; };
    const msl = D.milestones.filter(mm => mm.chapter === 2);
    let prevX = -99, lift = 0;
    msl.forEach(mm => {
      const px = pos(mm.date);
      lift = px - prevX < 14 ? lift + 1 : 0; prevX = px;
      g.append('line').attr('x1', px).attr('x2', px).attr('y1', -10 - lift * 12).attr('y2', ih).attr('stroke', '#2F7D5B').attr('stroke-width', 1);
      const k = g.append('g').datum(mm).attr('transform', `translate(${px},${-16 - lift * 12})`);
      k.append('circle').attr('r', 7).attr('fill', '#fff').attr('stroke', '#2F7D5B');
      k.append('text').attr('text-anchor', 'middle').attr('y', 3.5).style('font-size', '9px').attr('fill', '#111').text(msIndex.get(mm));
      bindTip(k, d => `<b>${fmtJ(parse(d.date))}</b><br>${esc(d.headline)}<p class="src">出典：${ext(d.url, d.source)}</p>`);
      keyMilestones.add(mm);
    });
    bindTip(g.append('g').selectAll('rect').data(ch2Months).join('rect').attr('x', r => x(r.k)).attr('width', x.step()).attr('y', 0).attr('height', ih).attr('fill', 'transparent'),
      r => `<b>${fmtYM(r.m)}</b><div class="row">Surfvote記事<span class="v">${r.Surfvote}本</span></div><div class="row">全テーマ計<span class="v">${r.total}本</span></div>`);
    if (animate) bars.attr('y', ih).attr('height', 0).transition().delay((d, i) => i * 25).duration(400).attr('y', r => y(r.Surfvote)).attr('height', r => ih - y(r.Surfvote));
  }

  function renderWall() {
    const w = el('wall');
    w.innerHTML = wallItems.map(n => `<span class="w-item"><time datetime="${n.date}">${d3.timeFormat('%y.%m')(parse(n.date))}</time>${ext(n.url, n.title)}</span>`).join('');
    const btn = el('wall-more');
    const mq = window.matchMedia('(max-width: 719px)');
    if (mq.matches) {
      w.classList.add('clamped');
      if (w.scrollHeight > w.clientHeight + 4) btn.hidden = false;
    }
    btn.addEventListener('click', () => { w.classList.remove('clamped'); btn.hidden = true; });
    const over20 = ch2Months.filter(r => r.Surfvote >= 20);
    const totals20 = ch2Months.filter(r => r.total >= 20);
    el('s03-body').innerHTML = `
      <p>${fmtYM(ch2Months[0].m)}〜${fmtYM(ch2Months[ch2Months.length - 1].m)}の${ch2Months.length}か月で、Surfvoteの記事は${svPeriod.length}件。全テーマの発信が月20本を超えた月は${totals20.length}か月（うちSurfvote単独で20本以上が${over20.length}か月）。給食費、ランドセル、PTA、万博まで、投票の論点は生活の細部に及んだ。</p>
      <p>一方、2023年7月にはAIアシスタント「ツクヨミ」をSurfvoteに載せ、2024年3月には省庁・自治体向けAI「DIGITAL COMMONS」を無料で出している。行政向けAIへの転換は、この期間の後半に準備されていた。</p>
      <p class="src">壁の記事は、この期間のSurfvote記事${svPeriod.length}件を日付順に並べ、等間隔に${WALL_N}件を抽出したもの（無作為抽出ではない）。上部の番号は下のタイムラインの番号に対応。</p>`;
  }

  // =====================================================================
  // 04 第3章 — process steps
  // =====================================================================
  function renderSteps() {
    const STEPS = [
      { when: '2024.3', label: '開発開始', m: ms('2024-08-02'), note: '2024年8月2日発表の「開発開始から約4か月」から逆算' },
      { when: '2024.8', label: 'プレビュー版を約50自治体・省庁へ', m: ms('2024-08-02') },
      { when: '2024.9', label: '導入サポート研修を開始', m: ms('2024-09-03'), tag: ['研修', 't-train'] },
      { when: '2024.10', label: 'プロダクト版をリリース', m: ms('2024-10-29') },
      { when: '2024.11', label: '初の包括連携協定（群馬県館林市）', m: ms('2024-11-20'), tag: ['協定', 't-agree'] },
      { when: '2024.11', label: '100自治体・省庁、各100アカウントまで無料', m: ms('2024-11-30'), tag: ['無料枠', 't-free'] },
    ];
    STEPS.forEach(s => keyMilestones.add(s.m));
    el('steps').innerHTML = STEPS.map(s => `
      <li class="${s.tag ? 'el' : ''}">
        <span class="dot"></span>
        <time>${esc(s.when)}</time>
        <span class="st-label">${esc(s.label)}</span>
        ${s.tag ? `<span class="tag ${s.tag[1]}">${esc(s.tag[0])}</span>` : ''}
        <span class="src">${s.note ? esc(s.note) + '　' : ''}出典：${ext(s.m.url, s.m.source)}</span>
      </li>`).join('');
    const why = ms('2024-11-20').why;
    el('steps-sum').innerHTML = `<b>2024年11月、研修・協定・無料枠の3要素が揃う。</b>　マイルストーンの記述では「${esc(why)}」。以後の拡大はこの型の繰り返しになる。`;
    const rep = ms('2025-05-14');
    const yokota = D.news.find(n => n.title.includes('横田えり'));
    const both = D.news.find(n => n.title.includes('伊藤あやめ') && n.title.includes('谷口野乃花'));
    el('s04-body').innerHTML = `
      <p>2024年3月の「DIGITAL COMMONS」無料提供を経て、8月にQommonsAIのプレビュー版を約50の自治体・省庁へ。9月に現地研修、10月にプロダクト版、11月に初の包括連携協定と「100アカウントまで無料」。製品と同時に、売り方の型まで4か月ほどで揃えている。</p>
      <p class="aside-note">注記：代表表記が2025年4月前後に横田えり氏→伊藤あやめ氏・谷口野乃花氏へ（リリース文面上の表記による）。<br>
      <span class="src">参照：${ext(yokota.url, dot(yokota.date) + ' 横田えり氏の表記')}　／　${ext(rep.url, dot(rep.date) + ' 「' + rep.why + '」')}${both ? '　／　' + ext(both.url, dot(both.date) + ' 伊藤・谷口両氏の表記') : ''}</span></p>`;
  }

  // =====================================================================
  // 05 第4章 — zoomed adoption curve with annotations
  // =====================================================================
  const ZOOM_NOTES = [
    ms('2025-10-09', 'ISO'), ms('2025-11-05', '正社員'), ms('2025-12-05', 'ミッション'), ms('2025-12-08', 'LGWAN'),
  ].map(m => ({ m, t: parse(m.date), k: msIndex.get(m) }));
  ZOOM_NOTES.forEach(n => keyMilestones.add(n.m));

  function renderZoomNotes() {
    el('zoom-notes').innerHTML = ZOOM_NOTES.map(n => `
      <li data-date="${n.m.date}"><span class="k">${n.k}</span><span><span class="d">${fmtJ(n.t)}</span>${esc(n.m.headline)}<br><span class="src">出典：${ext(n.m.url, n.m.source)}</span></span></li>`).join('');
    const a = adoption.find(d => d.date === '2024-11-30'), b = adoption.find(d => d.date === '2025-12-24');
    const p0 = adoption.find(d => d.date === '2025-07-23');
    const rate = (b.municipalities - p0.municipalities) / (d3.timeDay.count(p0.t, b.t) / 30.44);
    el('s05-body').innerHTML = `
      <p>${fmtJ(a.t)}の${nf(a.municipalities)}から${fmtJ(b.t)}の${nf(b.municipalities)}へ、約1年で+${b.municipalities - a.municipalities}。伸びが急になるのは2025年7月以降で、${fmtYM(p0.t)}の${p0.municipalities}から${fmtYM(b.t)}の${b.municipalities}まで、月あたり約${round10(rate)}自治体のペース（+${b.municipalities - p0.municipalities}を約${monthsBetween(p0, b)}か月で。発表値からの単純計算）。</p>
      <p>同じ時期に、自治体が導入判断で求める認証（ISO 27001／ISO 9001／Pマーク）を取り、正社員を倍増させ、ミッションを言語化し、LGWAN接続料の無償化を宣言した。拡大の速度に、組織と信頼の整備を後から追いつかせている。</p>
      <p class="src">番号は下のタイムラインの番号に対応。曲線は発表時点を直線で結んだもので、間の推移は不明。</p>`;
  }

  // =====================================================================
  // 06 第5章 — ecosystem diagram
  // =====================================================================
  const ECO = {
    C: { title: 'QommonsAI', sub: ['行政向け生成AIの基盤', '主要4社12モデルを統合'], src: [ms('2026-03-24'), ms('2026-05-08')] },
    L: { title: '自治体・職員', sub: [`約${nf(lastAdopt.municipalities)}自治体・${lastAdopt.users_man}万人`, `（${fmtYM(lastAdopt.t)}）`], src: [lastAdopt] },
    R: { title: '民間パートナー', sub: ['Qommons ONE', '（MCPアプリ）'], src: [ms('2026-01-05'), D.targets.find(t => t.item === 'Qommons ONE')] },
    T: { title: '国', sub: ['デジタル庁 法制事務AI技術検証', '総務省「信頼できるAI」開発実証'], src: [ms('2025-06-02'), ms('2026-06-30')] },
    B: { title: '新製品', sub: ['Qommons Qraft／Quester／洛索'], src: [ms('2026-05-27'), ms('2026-02-28')] },
  };

  function ecoChart(node) {
    const W = node.clientWidth, wide = W >= 760, cx = W / 2;
    let H, N, E;
    if (wide) {
      H = 440;
      const sw = Math.min(200, W * 0.22), cw = Math.min(250, W * 0.28);
      N = {
        T: { x: cx, y: 50, w: 320, h: 76 }, C: { x: cx, y: 220, w: cw, h: 100 },
        L: { x: sw / 2 + 1, y: 220, w: sw, h: 86 }, R: { x: W - sw / 2 - 1, y: 220, w: sw, h: 86 },
        B: { x: cx, y: 388, w: 320, h: 70 },
      };
      E = [
        { pts: [[cx, N.T.y + N.T.h / 2], [cx, N.C.y - N.C.h / 2]], label: ['実証に採用'], lx: cx + 8, ly: (N.T.y + N.C.y) / 2 + 4, anchor: 'start' },
        { pts: [[N.C.x - cw / 2, N.C.y], [N.L.x + sw / 2, N.L.y]], label: ['無料で提供'], lx: (N.C.x - cw / 2 + N.L.x + sw / 2) / 2, ly: N.C.y - 8, anchor: 'middle' },
        { pts: [[N.R.x - sw / 2, N.R.y], [N.C.x + cw / 2, N.C.y]], label: ['データ・アプリを提供'], lx: (N.R.x - sw / 2 + N.C.x + cw / 2) / 2, ly: N.C.y - 8, anchor: 'middle' },
        { pts: [[cx, N.C.y + N.C.h / 2], [cx, N.B.y - N.B.h / 2]], label: ['基盤の上に展開'], lx: cx + 8, ly: (N.C.y + N.B.y) / 2 + 4, anchor: 'start' },
      ];
    } else {
      H = 590;
      const half = (W - 14) / 2;
      N = {
        T: { x: cx, y: 40, w: W - 2, h: 78 }, C: { x: cx, y: 200, w: Math.min(W - 2, W * 0.84), h: 96 },
        L: { x: half / 2 + 1, y: 380, w: half, h: 92 }, R: { x: W - half / 2 - 1, y: 380, w: half, h: 92 },
        B: { x: cx, y: 545, w: W - 2, h: 70 },
      };
      const lx = N.L.x - 24, rx = N.R.x + 6;
      E = [
        { pts: [[cx, N.T.y + N.T.h / 2], [cx, N.C.y - N.C.h / 2]], label: ['実証に採用'], lx: cx + 8, ly: (N.T.y + N.T.h / 2 + N.C.y - N.C.h / 2) / 2 + 4, anchor: 'start' },
        { pts: [[lx, N.C.y + N.C.h / 2], [lx, N.L.y - N.L.h / 2]], label: ['無料で提供'], lx: lx + 8, ly: (N.C.y + N.C.h / 2 + N.L.y - N.L.h / 2) / 2 + 4, anchor: 'start' },
        { pts: [[rx, N.R.y - N.R.h / 2], [rx, N.C.y + N.C.h / 2]], label: ['データ・', 'アプリを提供'], lx: rx + 8, ly: (N.C.y + N.C.h / 2 + N.R.y - N.R.h / 2) / 2 - 3, anchor: 'start' },
        { pts: [[cx, N.C.y + N.C.h / 2], [cx, N.B.y - N.B.h / 2]], label: ['基盤の上に展開'], lx: cx + 8, ly: N.L.y + N.L.h / 2 + 22, anchor: 'start' },
      ];
    }
    const svg = svgFor(node, W, H, 'QommonsAIを中心とした関係図');
    svg.append('defs').append('marker').attr('id', 'arw').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', '#111');
    E.forEach(e => {
      svg.append('path').attr('d', d3.line()(e.pts)).attr('stroke', '#111').attr('stroke-width', 1).attr('fill', 'none').attr('marker-end', 'url(#arw)');
      const t = svg.append('text').attr('class', 'edge-l halo').attr('x', e.lx).attr('y', e.ly).attr('text-anchor', e.anchor);
      e.label.forEach((s, i) => t.append('tspan').attr('x', e.lx).attr('dy', i ? 14 : 0).text(s));
    });
    Object.entries(N).forEach(([k, n]) => {
      const info = ECO[k];
      const g = svg.append('g').attr('class', 'eco-node').attr('data-node', k).attr('transform', `translate(${n.x - n.w / 2},${n.y - n.h / 2})`);
      g.append('rect').attr('width', n.w).attr('height', n.h).attr('fill', k === 'C' ? '#67C59F' : '#fff').attr('stroke', '#111').attr('stroke-width', k === 'C' ? 0 : 1);
      const lines = info.sub.length;
      const top = n.h / 2 - (18 + lines * 15) / 2 + 14;
      g.append('text').attr('class', 'node-t').attr('x', n.w / 2).attr('y', top).attr('text-anchor', 'middle').text(info.title);
      info.sub.forEach((s, i) => g.append('text').attr('class', 'node-s').attr('x', n.w / 2).attr('y', top + 18 + i * 15).attr('text-anchor', 'middle').text(s));
      bindTip(g, () => `<b>${esc(info.title)}</b>` + info.src.map(s => s.headline
        ? `<p class="src">${dot(s.date)} ${ext(s.url, s.headline)}</p>`
        : s.target_url ? `<p class="src">${esc(s.item)}：${esc(s.target)} ${ext(s.target_url, '目標の出典')}</p>`
        : `<p class="src">${dot(s.date)} ${ext(s.url, s.note)}</p>`).join(''));
    });
  }

  function renderEcoSrc() {
    const names = { T: '上・国', C: '中央・QommonsAI', L: '左・自治体', R: '右・民間パートナー', B: '下・新製品' };
    el('eco-src').innerHTML = ['T', 'C', 'L', 'R', 'B'].map(k => `<li>${names[k]}：${ECO[k].src.map(s => s.headline
      ? ext(s.url, dot(s.date) + ' ' + s.headline)
      : s.target_url ? ext(s.target_url, dot(s.stated_on) + ' ' + s.item + 'の目標「' + s.target + '」')
      : ext(s.url, dot(s.date) + ' ' + s.note)).join('　／　')}</li>`).join('');
    [ms('2026-03-24'), ms('2026-05-27'), ms('2026-06-30')].forEach(m => keyMilestones.add(m));
    const outage = ms('2026-06-23');
    const sa = ms('2026-01-19');
    el('s06-body').innerHTML = `
      <p>2026年は、無料で広げた自治体の利用基盤の上に、民間パートナーのアプリ（Qommons ONE）と新製品群を重ねる構想が前面に出た。1月のシリーズA（${esc(sa.headline.replace(/^シリーズAで/, ''))}）は、マイルストーンの記述では「${esc(sa.why)}」とされる。</p>
      <p>一方で6月には${esc(outage.headline)}。${esc(outage.why)}。</p>
      <p class="src">関係図の矢印ラベルは、各出典の記述をもとに要約したもの。図中の要素をクリック／タップすると出典が開く。</p>`;
  }

  // =====================================================================
  // 07 全国 — 47 prefecture tile map
  // =====================================================================
  const TILE_POS = {
    '北海道': [11, 0], '青森県': [11, 1], '秋田県': [10, 2], '岩手県': [11, 2], '山形県': [10, 3], '宮城県': [11, 3],
    '石川県': [8, 4], '富山県': [9, 4], '新潟県': [10, 4], '福島県': [11, 4],
    '島根県': [3, 5], '鳥取県': [4, 5], '兵庫県': [5, 5], '京都府': [6, 5], '福井県': [7, 5], '岐阜県': [8, 5], '長野県': [9, 5], '群馬県': [10, 5], '栃木県': [11, 5],
    '山口県': [2, 6], '広島県': [3, 6], '岡山県': [4, 6], '大阪府': [5, 6], '奈良県': [6, 6], '滋賀県': [7, 6], '愛知県': [8, 6], '山梨県': [9, 6], '埼玉県': [10, 6], '茨城県': [11, 6],
    '佐賀県': [0, 7], '福岡県': [1, 7], '大分県': [2, 7], '和歌山県': [6, 7], '三重県': [7, 7], '静岡県': [9, 7], '東京都': [10, 7], '千葉県': [11, 7],
    '長崎県': [0, 8], '熊本県': [1, 8], '宮崎県': [2, 8], '愛媛県': [3, 8], '香川県': [4, 8], '神奈川県': [10, 8],
    '鹿児島県': [1, 9], '高知県': [3, 9], '徳島県': [4, 9],
    '沖縄県': [0, 10],
  };
  const short = p => p === '北海道' ? '北海道' : p.replace(/[都府県]$/, '');
  const BUCKETS = [
    { min: 0, max: 0, color: '#F0F0F0', label: '0件' },
    { min: 1, max: 2, color: '#DCF0E6', label: '1–2' },
    { min: 3, max: 4, color: '#B7E3CF', label: '3–4' },
    { min: 5, max: 7, color: '#67C59F', label: '5–7' },
    { min: 8, max: Infinity, color: '#2F7D5B', label: '8以上' },
  ];
  const bucket = n => BUCKETS.find(b => n >= b.min && n <= b.max);
  const prefList = Object.entries(D.prefectures).map(([name, v]) => ({
    name, train: v['研修'], agree: v['協定'], total: v['研修'] + v['協定'],
    events: D.prefecture_events.filter(e => e.prefecture === name).sort((a, b) => a.date < b.date ? 1 : -1),
  }));
  let selectedPref = null;

  function renderPanel(p) {
    const latest = p.events[0];
    el('tile-panel').innerHTML = `
      <h4>${esc(p.name)}</h4>
      <p class="cnt">研修 ${p.train}件　協定 ${p.agree}件　計 ${p.total}件</p>
      ${latest ? `<p class="ev"><span class="d">最新：${fmtJ(parse(latest.date))}（${esc(latest.type)}）</span>${ext(latest.url, latest.title)}</p>` : '<p class="hint">研修・協定の発表はまだない。</p>'}
      ${p.events.length > 1 ? `<ol>${p.events.slice(1).map(e => `<li><span class="arch-date">${dot(e.date)} ${esc(e.type)}</span><br>${ext(e.url, e.title)}</li>`).join('')}</ol>` : ''}`;
  }

  function tileChart(node, animate) {
    const W = node.clientWidth;
    const cols = 12, rows = 11, gap = 2;
    const size = Math.min(44, Math.floor((W - gap * (cols - 1)) / cols));
    const H = rows * (size + gap);
    const ox = (W - (cols * (size + gap) - gap)) / 2;
    const svg = svgFor(node, W, H, '47都道府県のタイルマップ');
    const g = svg.append('g').attr('transform', `translate(${ox},0)`);
    const tiles = g.selectAll('g.tile').data(prefList).join('g').attr('class', 'tile').attr('data-pref', d => d.name)
      .attr('tabindex', 0).attr('role', 'button').attr('aria-label', d => `${d.name} 研修${d.train}件 協定${d.agree}件`)
      .attr('transform', d => { const [c, r] = TILE_POS[d.name]; return `translate(${c * (size + gap)},${r * (size + gap)})`; })
      .classed('sel', d => selectedPref && d.name === selectedPref.name);
    tiles.append('rect').attr('class', 'bg').attr('width', size).attr('height', size).attr('fill', d => bucket(d.total).color);
    tiles.append('text').attr('x', size / 2).attr('y', size / 2 + (size > 34 ? -1 : 3)).attr('text-anchor', 'middle')
      .style('font-size', size > 34 ? '11px' : '9px').attr('fill', d => d.total >= 8 ? '#fff' : '#111').text(d => short(d.name));
    if (size > 34) tiles.append('text').attr('x', size / 2).attr('y', size / 2 + 12).attr('text-anchor', 'middle').style('font-size', '10px')
      .attr('fill', d => d.total >= 8 ? '#fff' : '#4A4A4A').text(d => d.total);
    tiles.filter(d => d.agree > 0).append('circle').attr('cx', size - 5).attr('cy', 5).attr('r', 2.6).attr('fill', '#111').attr('stroke', '#fff').attr('stroke-width', 1);
    const select = (ev, d) => {
      if (ev) ev.stopPropagation();
      selectedPref = d; tiles.classed('sel', t => t.name === d.name); renderPanel(d);
    };
    tiles.on('click', select).on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(ev, d); } });
    tiles.on('pointermove', (ev, d) => { if (ev.pointerType === 'mouse' && !pinned) showTip(`<b>${esc(d.name)}</b><div class="row">研修<span class="v">${d.train}</span></div><div class="row">協定<span class="v">${d.agree}</span></div>`, ev); })
      .on('pointerleave', ev => { if (ev.pointerType === 'mouse' && !pinned) hideTip(); });
    if (animate) tiles.attr('opacity', 0).transition().delay(d => (TILE_POS[d.name][0] + TILE_POS[d.name][1]) * 30).duration(300).attr('opacity', 1);
  }

  function renderTilesText() {
    legend('legend-tiles', BUCKETS.map(b => ({ label: b.label, color: b.color })).concat([{ label: '協定あり', cls: 'sw-dot' }]));
    const top = prefList.slice().sort((a, b) => b.total - a.total).slice(0, 3);
    const zero = prefList.filter(p => p.total === 0);
    const withAgree = prefList.filter(p => p.agree > 0);
    selectedPref = top[0]; renderPanel(top[0]);
    el('s07-body').innerHTML = `
      <p>研修・協定の発表は${prefList.length - zero.length}都道府県に及ぶ。最も多いのは${top.map(p => `${p.name}（${p.total}件）`).join('、')}。協定は${withAgree.length}道府県で${d3.sum(prefList, p => p.agree)}件。</p>
      <p>まだ発表がないのは${zero.length}県：${zero.map(p => p.name).join('、')}。中国・四国・九州の一部に空白が残る。</p>
      <p class="src">件数は 3_prefecture_summary（研修・協定）による。タイルの配置は地理に近い模式配置。タイルをタップすると件数と最新の発表が右（モバイルでは下）に出る。</p>`;
  }

  // =====================================================================
  // 08 経営企画の論点 — targets vs actuals
  // =====================================================================
  function renderTargets() {
    legend('legend-targets', [{ label: '目標（破線枠）', cls: 'sw-dash' }, { label: '実績（塗り）', color: '#67C59F' }, { label: '期中修正後の目標', color: '#111', cls: '' }]);
    const num = D.targets.filter(t => t.item.includes('導入自治体数'));
    const revised = num.find(t => t.item.includes('期中修正'));
    const main = num.filter(t => t !== revised);
    const box = el('targets-num');
    box.innerHTML = main.map((t, i) => `
      <div class="trow" data-item="${esc(t.item)}">
        <h4>${esc(t.item)}<span class="status">${esc(t.status)}</span></h4>
        <div class="tbar" id="tbar-${i}"></div>
        <p class="src">目標：${esc(t.target)}（${fmtJ(parse(t.stated_on))}表明）出典：${ext(t.target_url, '目標の発表')}</p>
        <p class="src">実績：${esc(t.actual)}（${fmtJ(parse(t.actual_as_of))}時点）出典：${ext(t.actual_url, '実績の発表')}</p>
        ${t.item.startsWith('2025') && revised ? `<p class="src">期中修正：${fmtJ(parse(revised.stated_on))}に「${esc(revised.target)}」へ。実績「${esc(revised.actual)}」で「${esc(revised.status)}」。出典：${ext(revised.target_url, '修正の発表')}／${ext(revised.actual_url, '実績の発表')}</p>` : ''}
      </div>`).join('');
    main.forEach((t, i) => register(el('tbar-' + i), (node, animate) => targetBar(node, animate, t, t.item.startsWith('2025') ? revised : null)));

    const qual = D.targets.filter(t => !num.includes(t));
    el('targets-qual').innerHTML = qual.map(t => {
      const cls = t.status.startsWith('未確認') ? 'pending' : t.status.includes('達成') ? 'done' : '';
      return `<li data-item="${esc(t.item)}">
        <div class="q-head"><span class="q-item">${esc(t.item)}</span><span class="q-status ${cls}">${esc(t.status)}</span></div>
        <dl><dt>目標</dt><dd>${esc(t.target)}<span class="src">　${fmtJ(parse(t.stated_on))}表明　${ext(t.target_url, '出典')}</span></dd>
        <dt>実績</dt><dd>${esc(t.actual)}${t.actual_as_of ? `<span class="src">　${fmtJ(parse(t.actual_as_of))}時点</span>` : ''}${t.actual_url ? `<span class="src">　${ext(t.actual_url, '出典')}</span>` : ''}</dd></dl>
      </li>`;
    }).join('');

    // questions
    const A = d => adoption.find(a => a.date === d);
    const p1 = A('2025-07-23'), p2 = A('2025-12-24'), p3 = lastAdopt;
    const r1 = (p2.municipalities - p1.municipalities) / (d3.timeDay.count(p1.t, p2.t) / 30.44);
    const r2 = (p3.municipalities - p2.municipalities) / (d3.timeDay.count(p2.t, p3.t) / 30.44);
    const one = D.targets.find(t => t.item === 'Qommons ONE'), launch = ms('2026-05-27');
    const sv2 = D.targets.find(t => t.item === 'Surfvote 2.0'), rep = ms('2025-05-14');
    const lastNews = d3.max(D.news, n => n.date);
    const Q = [
      { q: '導入数の伸び（2025年下期 月約60 → 2026年前半 月約40）は鈍化か、定着重視への意図的な転換か。アクティブ率はどうか。',
        s: `根拠：${fmtJ(p1.t)} ${p1.municipalities} → ${fmtJ(p2.t)} ${p2.municipalities}（${monthsBetween(p1, p2)}か月で+${p2.municipalities - p1.municipalities}、月約${round10(r1)}）、→ ${fmtJ(p3.t)} ${p3.municipalities}（${monthsBetween(p2, p3)}か月で+${p3.municipalities - p2.municipalities}、月約${round10(r2)}）。${ext(p1.url, '7月')}／${ext(p2.url, '12月')}／${ext(p3.url, '5月')}の発表値から単純計算。` },
      { q: '無料モデルの収益化：Qommons ONE など新製品群の提供状況と売上構成。',
        s: `根拠：Qommons ONEの目標「${esc(one.target)}」に対し、状況は「${esc(one.status)}」。${ext(launch.url, dot(launch.date) + ' 新サービス初公開')}` },
      { q: '2026年6月以降、導入数の発表がない理由と最新値。',
        s: `根拠：導入数の最終発表は${fmtJ(p3.t)}（${esc(p3.note)}）。収録記事は${fmtJ(parse(lastNews))}まであるが、その間に導入数の更新はない。${ext(p3.url, '最終発表')}` },
      { q: '2025年4月前後の体制転換の経緯と、Surfvoteの今後の位置づけ。',
        s: `根拠：${ext(rep.url, dot(rep.date) + ' 「' + rep.why + '」')}／Surfvote 2.0の目標「${esc(sv2.target)}」は「${esc(sv2.status)}」。` },
    ];
    el('questions').innerHTML = Q.map(x => `<li>${esc(x.q)}<span class="src">${x.s}</span></li>`).join('');
  }

  function targetBar(node, animate, t, revised) {
    const W = node.clientWidth, H = 74, m = { t: 6, r: 12, b: 4, l: 0 };
    const iw = W - m.l - m.r;
    const target = firstNum(t.target), actual = firstNum(t.actual);
    const x = d3.scaleLinear().domain([0, 1300]).range([0, iw]);
    const svg = svgFor(node, W, H, `${t.item} 目標${target} 実績${actual}`);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`).attr('data-target', target).attr('data-actual', actual).attr('class', 'tgt');
    g.append('rect').attr('x', 0).attr('y', 0).attr('width', x(target)).attr('height', 30).attr('fill', 'none').attr('stroke', '#111').attr('stroke-dasharray', '4 3');
    const bar = g.append('rect').attr('x', 0).attr('y', 6).attr('width', x(actual)).attr('height', 18).attr('fill', '#67C59F');
    g.append('text').attr('class', 'lbl-b').attr('x', 6).attr('y', 19.5).text(`実績 約${nf(actual)}（目標比${Math.round(actual / target * 100)}%）`);
    g.append('text').attr('class', 'lbl').attr('x', x(target)).attr('y', 46).attr('text-anchor', 'end').text(`目標 ${nf(target)}${t.target.includes('超') ? '超' : ''}`);
    if (revised) {
      const rv = firstNum(revised.target);
      g.append('line').attr('x1', x(rv)).attr('x2', x(rv)).attr('y1', -4).attr('y2', 36).attr('stroke', '#111').attr('stroke-width', 2);
      g.append('text').attr('class', 'lbl-s').attr('x', x(rv) + 4).attr('y', 62).text(`期中修正 ${revised.target}`);
      g.attr('data-revised', rv);
    }
    if (animate) bar.attr('width', 0).transition().duration(900).ease(d3.easeCubicOut).attr('width', x(actual));
  }

  // =====================================================================
  // chapter timelines
  // =====================================================================
  function renderChapterStats() {
    const A = d => adoption.find(a => a.date === d);
    const fund = ms('2022-12-13', '約1.3億円'), a100 = A('2024-11-30'), a150 = A('2025-05-14'), a600 = A('2025-12-24');
    const S = {
      1: { v: '約1.3億円', l: '累計調達額（2022年12月）', src: ext(fund.url, fund.source) },
      2: { v: `${svPeriod.length}本`, l: `この期間のSurfvote記事（月平均${(svPeriod.length / ch2Months.length).toFixed(1)}本）`, src: '0_all_news_699.csv の暫定分類で集計' },
      3: { v: a100.note, l: `プロダクト版リリースの翌月に到達（${fmtYM(a100.t)}）`, src: ext(a100.url, a100.source) },
      4: { v: `${a150.municipalities} → ${a600.municipalities}`, l: `導入自治体（${fmtYM(a150.t)} → ${fmtYM(a600.t)}）`, src: `${ext(a150.url, a150.source)}／${ext(a600.url, a600.source)}` },
      5: { v: `約${nf(lastAdopt.municipalities)}`, l: `導入自治体（${fmtYM(lastAdopt.t)}、最新の発表値）`, src: ext(lastAdopt.url, lastAdopt.source) },
    };
    CH.forEach(c => {
      const head = document.querySelector(`#s0${c.n + 1} .ch-head`), st = S[c.n];
      head.insertAdjacentHTML('afterend', `<div class="ch-stat" data-chapter="${c.n}"><b>${esc(st.v)}</b><span>${esc(st.l)}<span class="src">出典：${st.src}</span></span></div>`);
    });
  }

  function renderTimelines() {
    document.querySelectorAll('.tl[data-chapter]').forEach(ol => {
      const n = +ol.dataset.chapter;
      ol.innerHTML = D.milestones.filter(m => m.chapter === n).map(m => `
        <li class="${keyMilestones.has(m) ? 'key' : ''}" data-date="${m.date}">
          <p class="tl-date"><span class="idx">${msIndex.get(m)}</span>${dot(m.date)}</p>
          <p class="tl-head">${esc(m.headline)}</p>
          <p class="tl-why">${esc(m.why)}</p>
          <p class="src">出典：${ext(m.url, m.source)}</p>
        </li>`).join('');
    });
  }

  // =====================================================================
  // 09 アーカイブ
  // =====================================================================
  function renderArchive() {
    const all = D.news.map((n, i) => Object.assign({ i }, n)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.i - a.i);
    const opt = (v, label) => `<option value="${esc(v)}">${esc(label)}</option>`;
    const cnt = (k, v) => D.news.filter(n => n[k] === v).length;
    el('f-theme').innerHTML = opt('', 'すべて') + THEMES.map(t => opt(t.key, `${t.key}（${cnt('theme', t.key)}）`)).join('');
    const years = [...new Set(D.news.map(n => n.date.slice(0, 4)))].sort().reverse();
    el('f-year').innerHTML = opt('', 'すべて') + years.map(y => opt(y, `${y}年（${D.news.filter(n => n.date.startsWith(y)).length}）`)).join('');
    const sources = [...new Set(D.news.map(n => n.source))];
    el('f-source').innerHTML = opt('', 'すべて') + sources.map(s => opt(s, `${s}（${cnt('source', s)}）`)).join('');
    const PAGE = 50;
    let shown = PAGE, list = all, month = '';
    const tag = el('archive-month');
    const draw = () => {
      el('archive').innerHTML = list.slice(0, shown).map(n => `
        <li><span class="arch-date">${dot(n.date)}</span>
        <span class="arch-theme"><span class="sw" style="background:${TCOLOR[n.theme] || '#D6D6D6'}"></span>${esc(TLABEL[n.theme] || n.theme)}</span>
        <span class="arch-title">${ext(n.url, n.title)}${n.source.startsWith('PR TIMES') ? '<span class="s">PR TIMES</span>' : ''}</span></li>`).join('');
      el('archive-count').textContent = `該当 ${list.length}件（全${D.news.length}件）／表示 ${Math.min(shown, list.length)}件　新しい順`;
      el('archive-more').hidden = shown >= list.length;
    };
    const apply = () => {
      const th = el('f-theme').value, yr = el('f-year').value, so = el('f-source').value;
      const q = el('f-q').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      list = all.filter(n => (!month || n.date.startsWith(month)) && (!th || n.theme === th) && (!yr || n.date.startsWith(yr)) && (!so || n.source === so) &&
        q.every(w => (n.title + ' ' + n.theme).toLowerCase().includes(w)));
      tag.hidden = !month;
      tag.innerHTML = month ? `${fmtYM(parse(month + '-01'))}の記事に絞り込み中　<button type="button" id="archive-month-clear">解除</button>` : '';
      shown = PAGE; draw();
    };
    tag.addEventListener('click', e => { if (e.target.id === 'archive-month-clear') { month = ''; apply(); } });
    window.PM_filterMonth = k => {
      month = k;
      ['f-theme', 'f-year', 'f-source', 'f-q'].forEach(id => { el(id).value = ''; });
      apply();
      el('s09').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
    };
    ['f-theme', 'f-year', 'f-source'].forEach(id => el(id).addEventListener('change', apply));
    el('f-q').addEventListener('input', debounce(apply, 150));
    el('archive-more').addEventListener('click', () => { shown += PAGE; draw(); });
    window.PM_archiveShowAll = () => { shown = list.length; draw(); };
    draw();
  }

  // =====================================================================
  // nav
  // =====================================================================
  function initNav() {
    const secs = [...document.querySelectorAll('.sec')];
    const links = [...document.querySelectorAll('.jumpbar-list a, .sidenav a')];
    const cur = el('jumpbar-current');
    const setOn = id => {
      links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
      const s = document.getElementById(id);
      const title = s.querySelector('.ch-title');
      cur.textContent = s.dataset.label + (title ? ' ' + title.textContent : '');
    };
    const onScroll = () => {
      const y = window.innerHeight * 0.3;
      let active = secs[0];
      secs.forEach(s => { if (s.getBoundingClientRect().top <= y) active = s; });
      setOn(active.id);
    };
    window.addEventListener('scroll', debounce(onScroll, 50), { passive: true });
    onScroll();
  }

  // =====================================================================
  // boot
  // =====================================================================
  renderMetrics();
  renderS00Body();
  legend('legend-monthly', THEMES.map(t => ({ label: t.label, color: t.color })).concat([{ label: '導入自治体数（右目盛）', cls: 'sw-line' }, { label: 'PR TIMES出典の月（棒の下の点）', color: '#111', cls: 'sw-pr' }, { label: 'マイルストーン', cls: 'sw-tri' }]));
  renderS01Body();
  renderS02Body();
  renderWall();
  renderSteps();
  renderZoomNotes();
  renderEcoSrc();
  renderTilesText();
  renderTargets();
  renderTimelines();
  renderChapterStats();
  renderArchive();
  initNav();

  register(el('chart-adoption'), (n, a) => adoptionChart(n, a, {
    domain: [new Date(2024, 5, 1), new Date(2026, 10, 1)], yMax: 1000, height: nw => nw ? 280 : 340,
    tickMonths: nw => 6, chapters: CH.slice(2), noData: true, lastLabel: true, valueLabels: ['2024-08-02', '2025-07-23', '2025-12-24'],
    aria: '導入自治体数の推移（2024年8月〜2026年5月）',
  }));
  register(el('chart-monthly'), monthlyChart);
  register(el('chart-funding'), fundingChart);
  register(el('chart-wallstrip'), wallStrip);
  register(el('chart-zoom'), (n, a) => adoptionChart(n, a, {
    domain: [new Date(2024, 11, 15), new Date(2026, 0, 20)], yMax: 700, height: nw => nw ? 300 : 340,
    tickMonths: nw => nw ? 3 : 2, notes: ZOOM_NOTES, valueLabels: ['2025-05-14', '2025-07-23', '2025-10-02', ['2025-12-24', 'br']],
    aria: '2025年の導入自治体数の拡大図',
  }));
  register(el('chart-eco'), ecoChart);
  register(el('chart-tiles'), tileChart);
  charts.forEach(c => { if (io) io.observe(c.node); else draw(c, false); });
})();
