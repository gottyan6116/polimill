/* Analysis B — targets vs actuals; Analysis D — questions to confirm after joining. */
(function (PM) {
  'use strict';
  const { D, parse, fmtJ, fmtYM, nf, esc, ext, el, dot, ms, adoption, lastAdopt, svgFor, firstNum } = PM;

  function renderTargets() {
    PM.legend('legend-targets', [{ label: '目標（破線枠）', cls: 'sw-dash' }, { label: '実績（塗り）', color: '#67C59F' }, { label: '期中修正後の目標', color: '#111', cls: '' }]);
    const num = D.targets.filter(t => t.item.includes('導入自治体数'));
    const revised = num.find(t => t.item.includes('期中修正'));
    const main = num.filter(t => t !== revised);
    el('targets-num').innerHTML = main.map((t, i) => `
      <div class="trow" data-item="${esc(t.item)}">
        <h4>${esc(t.item)}<span class="status">${esc(t.status)}</span>${PM.conf('est')}</h4>
        <div class="tbar" id="tbar-${i}"></div>
        <p class="src">目標：${esc(t.target)}（${fmtJ(parse(t.stated_on))}表明）${PM.conf('claim')}${PM.srcIcon(t.target_url, '目標の発表', fmtJ(parse(t.stated_on)))}</p>
        <p class="src">実績：${esc(t.actual)}（${fmtJ(parse(t.actual_as_of))}時点）${PM.conf('claim')}${PM.srcIcon(t.actual_url, '実績の発表', fmtJ(parse(t.actual_as_of)))}</p>
        ${t.item.startsWith('2025') && revised ? `<p class="src">期中修正：${fmtJ(parse(revised.stated_on))}に「${esc(revised.target)}」へ。実績「${esc(revised.actual)}」で「${esc(revised.status)}」。${PM.conf('claim')}${PM.srcIcon(revised.target_url, '修正の発表', fmtJ(parse(revised.stated_on)))}${PM.srcIcon(revised.actual_url, '実績の発表', fmtJ(parse(revised.actual_as_of)))}</p>` : ''}
      </div>`).join('');
    main.forEach((t, i) => PM.register(el('tbar-' + i), (node, animate) => targetBar(node, animate, t, t.item.startsWith('2025') ? revised : null)));

    const qual = D.targets.filter(t => !num.includes(t));
    el('targets-qual').innerHTML = qual.map(t => {
      const cls = t.status.startsWith('未確認') ? 'pending' : t.status.includes('達成') ? 'done' : '';
      return `<li data-item="${esc(t.item)}">
        <div class="q-head"><span class="q-item">${esc(t.item)}</span><span class="q-status ${cls}">${esc(t.status)}</span>${PM.conf(t.status.startsWith('未確認') ? 'unk' : 'claim')}</div>
        <dl><dt>目標</dt><dd>${esc(t.target)}<span class="src">　${fmtJ(parse(t.stated_on))}表明</span>${PM.srcIcon(t.target_url, '目標の発表', fmtJ(parse(t.stated_on)))}</dd>
        <dt>実績</dt><dd>${esc(t.actual)}${t.actual_as_of ? `<span class="src">　${fmtJ(parse(t.actual_as_of))}時点</span>` : ''}${t.actual_url ? PM.srcIcon(t.actual_url, '実績の発表', t.actual_as_of ? fmtJ(parse(t.actual_as_of)) : '') : ''}</dd></dl>
      </li>`;
    }).join('');
  }

  function renderQuestions() {
    const { round5, monthsBetween } = PM;
    const A = d => adoption.find(a => a.date === d);
    const p1 = A('2025-07-23'), p2 = A('2025-12-24'), p3 = lastAdopt;
    const r1 = (p2.municipalities - p1.municipalities) / (d3.timeDay.count(p1.t, p2.t) / 30.44);
    const r2 = (p3.municipalities - p2.municipalities) / (d3.timeDay.count(p2.t, p3.t) / 30.44);
    const one = D.targets.find(t => t.item === 'Qommons ONE'), launch = ms('2026-05-27');
    const sv2 = D.targets.find(t => t.item === 'Surfvote 2.0'), rep = ms('2025-05-14');
    const lastNews = d3.max(D.news, n => n.date);
    const Q = [
      { c: 'est', q: '導入数の伸び（2025年下期 月約60 → 2026年前半 月約45）は鈍化か、定着重視への意図的な転換か。アクティブ率はどうか。',
        s: `根拠：${fmtJ(p1.t)} ${p1.municipalities} → ${fmtJ(p2.t)} ${p2.municipalities}（${monthsBetween(p1, p2)}か月で+${p2.municipalities - p1.municipalities}、月約${round5(r1)}）、→ ${fmtJ(p3.t)} ${p3.municipalities}（${monthsBetween(p2, p3)}か月で+${p3.municipalities - p2.municipalities}、月約${round5(r2)}）。${ext(p1.url, '7月')}／${ext(p2.url, '12月')}／${ext(p3.url, '5月')}の発表値から単純計算。` },
      { c: 'unk', q: '無料モデルの収益化：Qommons ONE など新製品群の提供状況と売上構成。',
        s: `根拠：Qommons ONEの目標「${esc(one.target)}」に対し、状況は「${esc(one.status)}」。${ext(launch.url, dot(launch.date) + ' 新サービス初公開')}` },
      { c: 'unk', q: '2026年6月以降、導入数の発表がない理由と最新値。',
        s: `根拠：導入数の最終発表は${fmtJ(p3.t)}（${esc(p3.note)}）。収録記事は${fmtJ(parse(lastNews))}まであるが、その間に導入数の更新はない。${ext(p3.url, '最終発表')}` },
      { c: 'fact', q: '2025年4月前後の体制転換の経緯と、Surfvoteの今後の位置づけ。',
        s: `根拠：${ext(rep.url, dot(rep.date) + ' 「' + rep.why + '」')}／Surfvote 2.0の目標「${esc(sv2.target)}」は「${esc(sv2.status)}」。` },
    ];
    el('questions').innerHTML = Q.map(x => `<li>${esc(x.q)}${PM.conf(x.c)}<span class="src">${x.s}</span></li>`).join('');
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

  // ---------- pace projection from the last announcement (estimate) ----------
  const GOAL = 1200;
  PM.PACES = [40, 50].map(p => {
    const monthsNeeded = (GOAL - lastAdopt.municipalities) / p;
    const reach = d3.timeMonth.offset(lastAdopt.t, Math.ceil(monthsNeeded));
    const yearEnd = new Date(2026, 11, 31);
    const atYearEnd = lastAdopt.municipalities + p * (d3.timeDay.count(lastAdopt.t, yearEnd) / 30.44);
    return { p, monthsNeeded, reach, atYearEnd };
  });

  function projectionChart(node, animate) {
    const W = node.clientWidth, narrow = W < 560;
    const H = narrow ? 300 : 340, m = { t: 20, r: narrow ? 10 : 20, b: 26, l: 40 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = d3.scaleTime().domain([new Date(2024, 6, 1), new Date(2027, 5, 30)]).range([0, iw]);
    const y = d3.scaleLinear().domain([0, 1300]).range([ih, 0]);
    const svg = svgFor(node, W, H, '導入自治体数の発表値と、2026年5月の約800から月40・月50で伸びた場合の試算線');
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
    const yt = [400, 800, 1200];
    g.append('g').attr('class', 'grid').selectAll('line').data(yt).join('line').attr('x1', 0).attr('x2', iw).attr('y1', y).attr('y2', y);
    g.append('g').selectAll('text').data(yt).join('text').attr('class', 'tick-label').attr('x', -6).attr('y', d => y(d) + 3).attr('text-anchor', 'end').text(nf);
    const xa = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(narrow ? 12 : 6)).tickFormat(PM.yearMonthTick).tickSize(3));
    xa.select('.domain').attr('stroke', '#111');
    // targets (dashed squares at the year end they refer to)
    const t25 = D.targets.find(t => t.item.startsWith('2025年 ')), t26 = D.targets.find(t => t.item.startsWith('2026年'));
    const goals = [{ t: new Date(2025, 11, 31), v: firstNum(t25.target), label: `2025年目標 ${nf(firstNum(t25.target))}超`, src: t25 },
      { t: new Date(2026, 11, 31), v: firstNum(t26.target), label: `2026年目標 ${nf(firstNum(t26.target))}`, src: t26 }];
    const gg = g.append('g').selectAll('g').data(goals).join('g').attr('class', 'goal').attr('transform', d => `translate(${x(d.t)},${y(d.v)})`);
    gg.append('rect').attr('x', -5).attr('y', -5).attr('width', 10).attr('height', 10).attr('fill', '#fff').attr('stroke', '#111').attr('stroke-dasharray', '2 2');
    gg.append('text').attr('class', 'lbl-s halo').attr('x', -8).attr('y', -8).attr('text-anchor', 'end').text(d => d.label);
    PM.bindTip(gg, d => `<b>${esc(d.src.item)}</b>${PM.conf('claim')}<br>目標：${esc(d.src.target)}（${fmtJ(parse(d.src.stated_on))}表明）<p class="src">出典：${ext(d.src.target_url, '目標の発表')}</p>`);
    // announced values
    const line = d3.line().x(d => x(d.t)).y(d => y(d.municipalities));
    g.append('path').datum(adoption).attr('d', line).attr('fill', 'none').attr('stroke', '#67C59F').attr('stroke-width', 2);
    PM.bindTip(g.append('g').selectAll('circle').data(adoption).join('circle').attr('class', 'pt').attr('data-date', d => d.date).attr('data-v', d => d.municipalities)
      .attr('cx', d => x(d.t)).attr('cy', d => y(d.municipalities)).attr('r', 3).attr('fill', '#fff').attr('stroke', '#2F7D5B'), PM.adoptionTip);
    // projections (estimate): dashed grey lines up to 1,200
    const pj = g.append('g');
    PM.PACES.forEach((p, i) => {
      pj.append('path').attr('class', 'proj').attr('data-pace', p.p).attr('data-reach', PM.keyM(p.reach))
        .attr('d', `M${x(lastAdopt.t)},${y(lastAdopt.municipalities)} L${x(p.reach)},${y(GOAL)}`)
        .attr('stroke', '#6B6B6B').attr('stroke-width', 1.5).attr('stroke-dasharray', i ? '2 3' : '6 4').attr('fill', 'none');
      pj.append('circle').attr('cx', x(p.reach)).attr('cy', y(GOAL)).attr('r', 3).attr('fill', '#6B6B6B');
      pj.append('text').attr('class', 'lbl-s halo').attr('x', x(p.reach) - 6).attr('y', y(GOAL) + (i ? 16 : 30)).attr('text-anchor', 'end')
        .text(`月${p.p}：${PM.fmtYM(p.reach)}ごろ`);
    });
    pj.append('text').attr('class', 'lbl-s halo').attr('x', x(lastAdopt.t) + 6).attr('y', y(lastAdopt.municipalities) + 16).text('試算');
    if (animate) pj.attr('opacity', 0).transition().delay(300).duration(600).attr('opacity', 1);
  }

  function renderProjectionText() {
    const [a, b] = PM.PACES;
    el('projection-text').innerHTML = `
      <p>${fmtYM(lastAdopt.t)}の約${nf(lastAdopt.municipalities)}から月${a.p}自治体ずつ増えると1,200に届くのは${PM.fmtYM(a.reach)}ごろ、月${b.p}なら${PM.fmtYM(b.reach)}ごろ。2026年末の時点では、それぞれ約${nf(PM.round10(a.atYearEnd))}・約${nf(PM.round10(b.atYearEnd))}。${PM.conf('est')}</p>`;
  }

  PM.initTargets = () => {
    PM.legend('legend-projection', [{ label: '導入自治体数（発表値）', color: '#67C59F' }, { label: '月40の試算', cls: 'sw-dash-l' }, { label: '月50の試算', cls: 'sw-dot-l' }, { label: '公言目標', cls: 'sw-goal' }]);
    if (el('projection-text')) { renderProjectionText(); PM.figNotes('projection', el('chart-projection').closest('figure')); }
    PM.register(el('chart-projection'), projectionChart);
    if (el('targets-num')) renderTargets();
    if (el('questions')) renderQuestions();
  };
})(window.PM);
