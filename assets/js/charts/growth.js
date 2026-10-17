/* Analysis B — the growth loop (with the revenue layer) and the parallel timeline. */
(function (PM) {
  'use strict';
  const { D, parse, fmtJ, fmtYM, nf, esc, el, dot, ms, adoption, lastAdopt, svgFor, bindTip, CH } = PM;

  // ---------------------------------------------------------------- growth loop
  const evCount = t => D.prefecture_events.filter(e => e.type === t).length;
  const first = adoption[0];
  const NODES = [
    { id: 'free', label: '無料枠', sub: '100アカウント→1,000人', conf: 'claim', solid: true,
      text: '各自治体に無料の利用枠を出し、のちに拡大した。',
      ev: [ms('2024-11-30'), ms('2025-07-23'), ms('2025-08-06', 'ver.2.0'), ms('2025-12-08')] },
    { id: 'train', label: '研修', sub: `研修${evCount('研修')}件`, conf: 'fact', solid: true,
      text: `現地での導入サポート研修。研修の発表は${evCount('研修')}件。`,
      ev: [ms('2024-09-03')] },
    { id: 'stay', label: '定着', sub: '利用状況は未公表', conf: 'unk', solid: false,
      text: '研修のあとに利用が定着しているかは、アクティブ率などの公開情報がなく確かめられない。',
      ev: [] },
    { id: 'agree', label: '協定・広域連携', sub: `協定${evCount('協定')}件`, conf: 'fact', solid: true,
      text: `自治体との連携協定。協定の発表は${evCount('協定')}件で、2026年には複数自治体と同時に結ぶ例も出た。`,
      ev: [ms('2024-11-20'), ms('2026-09-25')] },
    { id: 'next', label: '次の自治体', sub: `約${first.municipalities}→約${nf(lastAdopt.municipalities)}`, conf: 'claim', solid: true,
      text: `導入自治体は${fmtYM(first.t)}の約${first.municipalities}から${fmtYM(lastAdopt.t)}の約${nf(lastAdopt.municipalities)}へ。`,
      ev: [first, lastAdopt] },
  ];
  // links of the loop; solid only where a company release states the link itself
  const EDGES = [
    { from: 'free', to: 'train', solid: true, why: ms('2024-09-03') },
    { from: 'train', to: 'stay', solid: false, why: ms('2024-09-03') },
    { from: 'stay', to: 'agree', solid: false, why: null },
    { from: 'agree', to: 'next', solid: false, why: ms('2026-09-25') },
    { from: 'next', to: 'free', solid: true, why: ms('2024-11-30') },
  ];
  const ONE = D.targets.find(t => t.item === 'Qommons ONE');
  const REVENUE = { label: '収益の層（構想）', sub: 'Qommons ONE ほか新製品', conf: 'unk', ev: [ms('2026-01-05'), ms('2026-05-27')] };

  const evHtml = e => e.headline
    ? `<li><span class="d">${dot(e.date)}</span>${esc(e.headline)}${PM.srcIcon(e.url, e.source, dot(e.date))}</li>`
    : `<li><span class="d">${dot(e.date)}</span>${esc(e.note)}${PM.srcIcon(e.url, e.source, dot(e.date))}</li>`;
  const nodeTip = n => `<b>${esc(n.label)}</b>${PM.conf(n.conf)}<br>${esc(n.text)}` +
    (n.ev.length ? n.ev.map(e => `<p class="src">${dot(e.date)} ${PM.ext(e.url, e.headline || e.note)}</p>`).join('') : '<p class="src">根拠となる公開情報なし</p>');

  function growthChart(node, animate) {
    const W = node.clientWidth, narrow = W < 560;
    const bw = narrow ? 104 : 160, bh = narrow ? 58 : 52;
    const Rx = Math.min(W / 2 - bw / 2 - 2, 230), Ry = narrow ? 118 : 132;
    const top = 74, cx = W / 2, cy = top + bh / 2 + Ry + 8;
    const H = cy + Ry + bh / 2 + 8;
    const svg = svgFor(node, W, H, '成長の型：無料枠→研修→定着→協定・広域連携→次の自治体の循環と、その上の収益の層');
    const defs = svg.append('defs');
    defs.append('marker').attr('id', 'garw').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
      .attr('orient', 'auto-start-reverse').append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', '#111');
    const pos = {};
    NODES.forEach((n, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / NODES.length; pos[n.id] = { x: cx + Rx * Math.cos(a), y: cy + Ry * Math.sin(a) }; });

    // revenue layer on top (dashed: a plan that is not confirmed)
    const rv = svg.append('g').attr('class', 'g-rev').datum(REVENUE);
    rv.append('rect').attr('x', 1).attr('y', 2).attr('width', W - 2).attr('height', 46).attr('fill', '#fff').attr('stroke', '#111').attr('stroke-dasharray', '5 4');
    rv.append('text').attr('class', 'node-t').attr('x', 12).attr('y', 21).text(REVENUE.label);
    rv.append('text').attr('class', 'node-s').attr('x', 12).attr('y', 39).text(REVENUE.sub);
    bindTip(rv, () => `<b>${esc(REVENUE.label)}</b>${PM.conf('unk')}<br>Qommons ONEの目標「${esc(ONE.target)}」に対し、状況は「${esc(ONE.status)}」。` +
      REVENUE.ev.map(e => `<p class="src">${dot(e.date)} ${PM.ext(e.url, e.headline)}</p>`).join(''));
    // the layer sits on the user base in the middle of the loop
    const base = svg.append('g');
    base.append('text').attr('class', 'node-s').attr('x', cx).attr('y', cy - 4).attr('text-anchor', 'middle').text('利用基盤');
    base.append('text').attr('class', 'node-s').attr('x', cx).attr('y', cy + 12).attr('text-anchor', 'middle').text(`約${nf(lastAdopt.municipalities)}自治体・${lastAdopt.users_man}万人`);
    const lx = cx + (narrow ? 0 : 0);
    base.append('path').attr('d', `M${lx},${cy - 18} L${lx},${top + bh + 6}`).attr('stroke', '#111').attr('stroke-dasharray', '4 4').attr('fill', 'none');
    base.append('path').attr('d', `M${lx},${top - 4} L${lx},50`).attr('stroke', '#111').attr('stroke-dasharray', '4 4').attr('fill', 'none').attr('marker-end', 'url(#garw)');

    // loop edges (clipped to the box edges)
    const clip = (a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.min((bw / 2 + 4) / Math.abs(dx || 1e-9), (bh / 2 + 4) / Math.abs(dy || 1e-9));
      return [a.x + dx * t, a.y + dy * t];
    };
    const edges = svg.append('g');
    EDGES.forEach(e => {
      const a = pos[e.from], b = pos[e.to];
      const p0 = clip(a, b), p1 = clip(b, a);
      edges.append('path').attr('class', 'g-edge').attr('data-solid', e.solid).attr('d', `M${p0[0]},${p0[1]} L${p1[0]},${p1[1]}`)
        .attr('stroke', '#111').attr('stroke-width', 1.2).attr('fill', 'none').attr('stroke-dasharray', e.solid ? null : '5 4').attr('marker-end', 'url(#garw)');
    });
    // nodes
    const g = svg.append('g').selectAll('g').data(NODES).join('g').attr('class', 'gnode').attr('data-node', d => d.id).attr('data-solid', d => d.solid)
      .attr('transform', d => `translate(${pos[d.id].x - bw / 2},${pos[d.id].y - bh / 2})`);
    g.append('rect').attr('width', bw).attr('height', bh).attr('fill', '#fff').attr('stroke', '#111').attr('stroke-width', d => d.solid ? 1.2 : 1)
      .attr('stroke-dasharray', d => d.solid ? null : '5 4');
    // sub text wraps after "→" when it does not fit the box
    const subLines = d => (d.sub.length * (narrow ? 10 : 11) > bw - 8 && d.sub.includes('→')) ? [d.sub.slice(0, d.sub.indexOf('→') + 1), d.sub.slice(d.sub.indexOf('→') + 1)] : [d.sub];
    g.append('text').attr('class', 'node-t').attr('x', bw / 2).attr('y', d => bh / 2 - (subLines(d).length > 1 ? 10 : 4)).attr('text-anchor', 'middle').style('font-size', narrow ? '12px' : '14px').text(d => d.label);
    g.each(function (d) {
      const lines = subLines(d);
      lines.forEach((s, i) => d3.select(this).append('text').attr('class', 'node-s').attr('x', bw / 2).attr('y', bh / 2 + (lines.length > 1 ? 6 + i * 14 : 13))
        .attr('text-anchor', 'middle').style('font-size', narrow ? '10px' : '11px').text(s));
    });
    bindTip(g, nodeTip);
    if (animate) { g.attr('opacity', 0).transition().delay((d, i) => i * 120).duration(300).attr('opacity', 1); edges.attr('opacity', 0).transition().delay(600).duration(400).attr('opacity', 1); }
  }

  function renderGrowthList() {
    const edgeText = e => {
      const f = NODES.find(n => n.id === e.from).label, t = NODES.find(n => n.id === e.to).label;
      const basis = e.why ? `${PM.conf(e.solid ? 'claim' : 'unk')}「${esc(e.why.why)}」${PM.srcIcon(e.why.url, e.why.source, dot(e.why.date))}` : `${PM.conf('unk')}つながりを示す公開情報はない。`;
      return `<li><b>${esc(f)} → ${esc(t)}</b>（${e.solid ? '実線' : '破線'}）　${basis}</li>`;
    };
    el('growth-list').innerHTML = `
      <ol class="growth-nodes">${NODES.map(n => `
        <li><p class="gn-h"><b>${esc(n.label)}</b>${PM.conf(n.conf)}<span class="gn-s">${n.solid ? '実線：公開情報で確認できる' : '破線：公開情報では確かめられない'}</span></p>
        <p>${esc(n.text)}</p>${n.ev.length ? `<ul class="gn-ev">${n.ev.map(evHtml).join('')}</ul>` : ''}</li>`).join('')}
        <li><p class="gn-h"><b>${esc(REVENUE.label)}</b>${PM.conf('unk')}<span class="gn-s">破線：構想段階</span></p>
        <p>無料の利用基盤の上に、民間パートナーのアプリ（Qommons ONE）と新製品を重ねる構想。Qommons ONEの目標「${esc(ONE.target)}」に対し、状況は「${esc(ONE.status)}」。</p>
        <ul class="gn-ev">${REVENUE.ev.map(evHtml).join('')}</ul></li>
      </ol>
      <h4 class="sub-s">つながりの根拠</h4>
      <ul class="growth-edges">${EDGES.map(edgeText).join('')}</ul>`;
  }

  // ---------------------------------------------------------------- parallel timeline
  const LANES = [
    { id: 'adopt', label: '導入自治体数' },
    { id: 'fund', label: '累計調達額' },
    { id: 'staff', label: '正社員数・組織' },
    { id: 'cert', label: '認証取得' },
    { id: 'prod', label: '主なプロダクト' },
  ];
  const ORG = [ms('2025-11-05', '正社員'), ms('2025-12-05', 'ミッション')];
  const CERT = [ms('2025-10-09', 'ISO')];
  const PROD = [ms('2021-11-30', 'Surfvote'), ms('2023-07-03', 'ツクヨミ'), ms('2024-03-13', 'DIGITAL COMMONS'), ms('2024-08-02', 'プレビュー'),
    ms('2024-10-29', 'プロダクト版'), ms('2025-08-06', 'ver.2.0'), ms('2026-02-28', '洛索'), ms('2026-05-27', 'Qommons ONE')];
  const SHORT = { '2021-11-30': 'Surfvote PC版', '2023-07-03': 'ツクヨミ', '2024-03-13': 'DIGITAL COMMONS', '2024-08-02': 'QommonsAI プレビュー',
    '2024-10-29': 'プロダクト版', '2025-08-06': 'ver.2.0', '2026-02-28': '洛索', '2026-05-27': 'Qommons ONE ほか', '2025-11-05': '正社員 倍増',
    '2025-12-05': 'ミッション策定', '2025-10-09': 'ISO 27001・9001・Pマーク' };

  function parallelChart(node, animate) {
    const W = node.clientWidth, narrow = W < 560;
    const m = { t: 26, r: narrow ? 8 : 16, b: 22, l: 4 }, lh = narrow ? 56 : 60;
    const iw = W - m.l - m.r, H = m.t + LANES.length * lh + m.b;
    const x = d3.scaleTime().domain([new Date(2021, 9, 1), new Date(2026, 10, 1)]).range([0, iw]);
    const svg = svgFor(node, W, H, '導入自治体数・累計調達額・正社員数・認証取得・主なプロダクトを同じ時間軸に並べた並行タイムライン');
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
    // chapter bands
    CH.forEach((c, i) => {
      const x0 = x(parse(c.from + '-01')), x1 = x(d3.timeMonth.offset(parse(c.to + '-01'), 1));
      g.append('rect').attr('x', x0).attr('y', -20).attr('width', x1 - x0).attr('height', LANES.length * lh + 20).attr('fill', i % 2 ? '#F4F4F4' : '#FFFFFF');
      g.append('text').attr('class', 'lbl-s').attr('x', (x0 + x1) / 2).attr('y', -8).attr('text-anchor', 'middle').text(narrow ? c.n : `第${c.n}章`);
    });
    const laneY = i => i * lh;
    LANES.forEach((l, i) => {
      g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', laneY(i) + lh - 6).attr('y2', laneY(i) + lh - 6).attr('stroke', '#D9D9D9').attr('stroke-width', 0.5);
      g.append('text').attr('class', 'lane-l').attr('x', 2).attr('y', laneY(i) + 12).text(l.label);
    });
    const inner = (i, v, max) => laneY(i) + lh - 8 - (v / max) * (lh - 26);

    // adoption
    const ya = v => inner(0, v, 1000);
    g.append('path').datum(adoption).attr('d', d3.line().x(d => x(d.t)).y(d => ya(d.municipalities))).attr('fill', 'none').attr('stroke', '#67C59F').attr('stroke-width', 2);
    const ad = g.append('g').selectAll('circle').data(adoption).join('circle').attr('class', 'pt').attr('data-date', d => d.date).attr('data-v', d => d.municipalities)
      .attr('cx', d => x(d.t)).attr('cy', d => ya(d.municipalities)).attr('r', 2.5).attr('fill', '#67C59F');
    bindTip(ad, PM.adoptionTip);
    g.append('text').attr('class', 'lbl-s halo').attr('x', x(lastAdopt.t) - 4).attr('y', ya(lastAdopt.municipalities) - 4).attr('text-anchor', 'end').text(`約${nf(lastAdopt.municipalities)}`);
    // cumulative funding (step) + series A (separate marker: no cumulative figure announced)
    const yf = v => inner(1, v, 5e8);
    const fpts = PM.FUND_CUM.concat([{ t: PM.SERIES_A.t, v: 5e8 }]);
    g.append('path').datum(fpts).attr('d', d3.line().curve(d3.curveStepAfter).x(d => x(d.t)).y(d => yf(d.v))).attr('fill', 'none').attr('stroke', '#8A8A8A').attr('stroke-width', 2);
    bindTip(g.append('g').selectAll('circle').data(PM.FUND_CUM).join('circle').attr('class', 'fund-pt').attr('cx', d => x(d.t)).attr('cy', d => yf(d.v)).attr('r', 2.5).attr('fill', '#8A8A8A'),
      d => `<b>${fmtJ(d.t)}</b><br>${esc(d.m.headline)}${PM.conf('claim')}<p class="src">出典：${PM.ext(d.m.url, d.m.source)}</p>`);
    const sa = g.append('g').attr('class', 'fund-sa').attr('transform', `translate(${x(PM.SERIES_A.t)},${yf(5e8)})`).datum(PM.SERIES_A);
    sa.append('path').attr('d', 'M0,-6 L6,0 L0,6 L-6,0 Z').attr('fill', '#fff').attr('stroke', '#8A8A8A').attr('stroke-width', 1.5);
    bindTip(sa, d => `<b>${fmtJ(d.t)}</b><br>${esc(d.m.headline)}${PM.conf('claim')}<br>シリーズA後の累計調達額は発表されていない。<p class="src">出典：${PM.ext(d.m.url, d.m.source)}</p>`);
    g.append('text').attr('class', 'lbl-s halo').attr('x', x(PM.FUND_CUM[PM.FUND_CUM.length - 1].t) - 4).attr('y', yf(5e8) - 6).attr('text-anchor', 'end').text('累計5億円超');
    // event lanes
    const events = (i, list, shape) => {
      const cyL = laneY(i) + lh - 18;
      const s = g.append('g').selectAll('g').data(list).join('g').attr('class', 'ev-mark').attr('transform', d => `translate(${x(parse(d.date))},${cyL})`);
      if (shape === 'sq') s.append('rect').attr('x', -4.5).attr('y', -4.5).attr('width', 9).attr('height', 9).attr('fill', '#111');
      else s.append('circle').attr('r', 4.5).attr('fill', '#fff').attr('stroke', '#111').attr('stroke-width', 1.5);
      bindTip(s, d => `<b>${fmtJ(parse(d.date))}</b><br>${esc(d.headline)}${PM.conf('claim')}<p class="src">出典：${PM.ext(d.url, d.source)}</p>`);
      if (!narrow) {
        // place each label on the first of 3 rows where it does not touch the previous one; flip left at the right edge
        const rowEnd = [-Infinity, -Infinity, -Infinity];
        const marks = list.map(d => x(parse(d.date)));
        list.forEach((d, k) => {
          const px = marks[k];
          const nextMark = k + 1 < marks.length ? marks[k + 1] : Infinity;
          const t = g.append('text').attr('class', 'ev-l halo').text(SHORT[d.date] || '');
          const w = t.node().getComputedTextLength();
          const flip = px + 7 + w > iw;
          const x0 = flip ? px - 7 - w : px + 7;
          let row = rowEnd.findIndex((e, r) => x0 > e + 6 && (r > 0 || flip || x0 + w < nextMark - 8));
          if (row < 0) row = 2;
          rowEnd[row] = x0 + w;
          t.attr('x', flip ? px - 7 : px + 7).attr('text-anchor', flip ? 'end' : 'start').attr('y', cyL + 4 - row * 13);
          if (row) g.append('line').attr('x1', px).attr('x2', px).attr('y1', cyL - 5).attr('y2', cyL + 1 - row * 13).attr('stroke', '#BDBDBD').attr('stroke-width', 0.5);
        });
      }
    };
    events(2, ORG, 'sq');
    events(3, CERT, 'sq');
    events(4, PROD, 'ci');
    // year axis
    const yrs = [2022, 2023, 2024, 2025, 2026];
    g.append('g').selectAll('text').data(yrs).join('text').attr('class', 'tick-label').attr('x', y => x(new Date(y, 0, 1)) + 2).attr('y', LANES.length * lh + 12).text(y => y);
    g.append('g').selectAll('line').data(yrs).join('line').attr('x1', y => x(new Date(y, 0, 1))).attr('x2', y => x(new Date(y, 0, 1)))
      .attr('y1', -20).attr('y2', LANES.length * lh + 2).attr('stroke', '#BDBDBD').attr('stroke-width', 0.5).attr('stroke-dasharray', '2 3');
    if (animate) g.attr('opacity', 0).transition().duration(500).attr('opacity', 1);
  }

  function renderParallelTable() {
    const rows = [
      ...adoption.map(a => ({ lane: '導入自治体数', date: a.date, text: a.note, url: a.url, source: a.source })),
      ...PM.FUND_CUM.map(f => ({ lane: '累計調達額', date: f.date, text: f.m.headline, url: f.m.url, source: f.m.source })),
      { lane: '累計調達額', date: PM.SERIES_A.date, text: PM.SERIES_A.m.headline + '（シリーズA後の累計は未発表）', url: PM.SERIES_A.m.url, source: PM.SERIES_A.m.source },
      ...ORG.map(m => ({ lane: '正社員数・組織', date: m.date, text: m.headline, url: m.url, source: m.source })),
      ...CERT.map(m => ({ lane: '認証取得', date: m.date, text: m.headline, url: m.url, source: m.source })),
      ...PROD.map(m => ({ lane: '主なプロダクト', date: m.date, text: m.headline, url: m.url, source: m.source })),
    ];
    el('parallel-table').innerHTML = `<summary>表で見る（${rows.length}件）</summary>
      <table class="mini files"><thead><tr><th>系列</th><th>日付</th><th>内容</th></tr></thead><tbody>
      ${LANES.map(l => rows.filter(r => r.lane === l.label).map(r => `<tr><td>${esc(r.lane)}</td><td>${dot(r.date)}</td><td>${esc(r.text)}${PM.srcIcon(r.url, r.source, dot(r.date))}</td></tr>`).join('')).join('')}
      </tbody></table>`;
  }

  PM.initGrowth = () => {
    PM.legend('legend-parallel', [{ label: '導入自治体数', color: '#67C59F' }, { label: '累計調達額', color: '#8A8A8A' }, { label: 'シリーズA（累計は未発表）', cls: 'sw-dia' }, { label: '組織・認証', color: '#111' }, { label: 'プロダクト', cls: 'sw-ring' }]);
    if (el('growth-list')) { renderGrowthList(); PM.figNotes('growth', el('chart-growth').closest('figure')); }
    PM.register(el('chart-growth'), growthChart);
    if (el('parallel-table')) { renderParallelTable(); PM.figNotes('parallel', el('chart-parallel').closest('figure')); }
    PM.register(el('chart-parallel'), parallelChart);
  };
})(window.PM);
