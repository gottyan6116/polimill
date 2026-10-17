/* Adoption curve (top page: full curve + KPIs; chapter 4: 2025 zoom with notes). */
(function (PM) {
  'use strict';
  const { D, parse, fmtJ, fmtYM, nf, esc, ext, el, ms, adoption, lastAdopt, svgFor, bindTip, interpAdoption, yearMonthTick, CH } = PM;

  function renderMetrics() {
    const seriesA = ms('2026-01-19', 'シリーズA');
    const ev = D.prefecture_events;
    const prefN = new Set(ev.map(e => e.prefecture)).size;
    const evLast = d3.max(ev, e => e.date);
    const users = lastAdopt.users_man;
    const items = [
      { key: 'municipalities', label: '導入自治体', value: `約${nf(lastAdopt.municipalities)}`, unit: '', raw: lastAdopt.municipalities,
        src: PM.srcLine(lastAdopt.source, lastAdopt.url, fmtJ(lastAdopt.t) + '時点') },
      { key: 'users', label: '職員ユーザー', value: `約${users}`, unit: '万人', raw: users,
        src: PM.srcLine(lastAdopt.source, lastAdopt.url, fmtJ(lastAdopt.t) + '時点') },
      { key: 'seriesA', label: 'シリーズA調達額', value: '約6.35', unit: '億円', value2: '評価額 約50億円', raw: '約6.35億円|約50億円',
        src: PM.srcLine(seriesA.source, seriesA.url, fmtJ(parse(seriesA.date)) + '発表') },
      { key: 'events', label: '研修・協定', value: `${ev.length}`, unit: '件', value2: `${prefN}都道府県で実施`, raw: `${ev.length}|${prefN}`,
        src: `<p class="src">${esc(fmtJ(parse(evLast)))}までの自社発表を集計　<a href="${PM.href('analysis/#sec-regions')}">内訳は分析C 全国の分布へ</a></p>` },
    ];
    el('metrics').innerHTML = items.map(i => `
      <div class="metric" data-key="${i.key}" data-raw="${esc(i.raw)}">
        <p class="metric-label">${esc(i.label)}</p>
        <p class="metric-value">${i.value}<small>${esc(i.unit)}</small></p>
        ${i.value2 ? `<p class="metric-value2">${esc(i.value2)}</p>` : ''}
        ${i.src}
      </div>`).join('');
  }

  const adoptionTip = PM.adoptionTip = d => `<b>${fmtJ(d.t)}</b><br>${esc(d.note)}` +
    `<div class="row">導入自治体<span class="v">${nf(d.municipalities)}</span></div>` +
    (d.users_man != null ? `<div class="row">職員ユーザー<span class="v">${d.users_man}万人</span></div>` : '') +
    `<p class="src">出典：${ext(d.url, d.source)}</p>`;

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

  function renderZoomNotes() {
    const { round10, monthsBetween } = PM;
    el('zoom-notes').innerHTML = PM.ZOOM_NOTES.map(n => `
      <li data-date="${n.m.date}"><span class="k">${n.k}</span><span><span class="d">${fmtJ(n.t)}</span>${esc(n.m.headline)}<br><span class="src">出典：${ext(n.m.url, n.m.source)}</span></span></li>`).join('');
    const a = adoption.find(d => d.date === '2024-11-30'), b = adoption.find(d => d.date === '2025-12-24');
    const p0 = adoption.find(d => d.date === '2025-07-23');
    const rate = (b.municipalities - p0.municipalities) / (d3.timeDay.count(p0.t, b.t) / 30.44);
    el('s05-body').innerHTML = `
      <p>${fmtJ(a.t)}の${nf(a.municipalities)}から${fmtJ(b.t)}の${nf(b.municipalities)}へ、約1年で+${b.municipalities - a.municipalities}。伸びが急になるのは2025年7月以降で、${fmtYM(p0.t)}の${p0.municipalities}から${fmtYM(b.t)}の${b.municipalities}まで、月あたり約${round10(rate)}自治体のペース（+${b.municipalities - p0.municipalities}を約${monthsBetween(p0, b)}か月で。発表値からの単純計算）。</p>
      <p>同じ時期に、自治体が導入判断で求める認証（ISO 27001／ISO 9001／Pマーク）を取り、正社員を倍増させ、ミッションを言語化し、LGWAN接続料の無償化を宣言した。拡大の速度に、組織と信頼の整備を後から追いつかせている。</p>
      <p class="src">番号は下のタイムラインの番号に対応。曲線は発表時点を直線で結んだもので、間の推移は不明。</p>`;
  }

  PM.initAdoption = () => {
    if (el('metrics')) renderMetrics();
    if (el('s00-body')) renderS00Body();
    PM.register(el('chart-adoption'), (n, a) => adoptionChart(n, a, {
      domain: [new Date(2024, 5, 1), new Date(2026, 10, 1)], yMax: 1000, height: nw => nw ? 280 : 340,
      tickMonths: () => 6, chapters: CH.slice(2), noData: true, lastLabel: true, valueLabels: ['2024-08-02', '2025-07-23', '2025-12-24'],
      aria: '導入自治体数の推移（2024年8月〜2026年5月）',
    }));
    if (el('zoom-notes')) renderZoomNotes();
    PM.register(el('chart-zoom'), (n, a) => adoptionChart(n, a, {
      domain: [new Date(2024, 11, 15), new Date(2026, 0, 20)], yMax: 700, height: nw => nw ? 300 : 340,
      tickMonths: nw => nw ? 3 : 2, notes: PM.ZOOM_NOTES, valueLabels: ['2025-05-14', '2025-07-23', '2025-10-02', ['2025-12-24', 'br']],
      aria: '2025年の導入自治体数の拡大図',
    }));
  };
})(window.PM);
