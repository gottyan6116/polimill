/* Analysis A — monthly stacked news bars with adoption overlay. */
(function (PM) {
  'use strict';
  const { D, parse, fmtYM, keyM, nf, esc, ext, el, dot, adoption, lastAdopt, svgFor, bindTip, THEMES, TCOLOR, QA_KEYS, CH, months, monthRows } = PM;

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

    // chapter band: each band links to its chapter page
    CH.forEach((c, i) => {
      const x0 = x(c.from), x1 = x(c.to) + x.bandwidth();
      const a = g.append('a').attr('class', 'band-link').attr('href', PM.href(c.path)).attr('aria-label', `第${c.n}章 ${c.name} へ移動`);
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
    bindTip(g.append('g').selectAll('circle').data(ad).join('circle').attr('cx', d => d.px).attr('cy', d => d.py).attr('r', 9).attr('fill', 'transparent'), d => PM.adoptionTip(d.a));

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

  // first month from which QommonsAI-related posts exceed Surfvote in every month that has posts
  PM.crossMonth = (() => {
    let cross = null;
    for (let i = monthRows.length - 1; i >= 0; i--) {
      const r = monthRows[i];
      if (r.total === 0) continue;
      if (d3.sum(QA_KEYS, k => r[k]) > r.Surfvote) cross = r; else break;
    }
    return cross;
  })();

  function renderS01Body() {
    const rows = CH.map(c => {
      const rs = monthRows.filter(r => r.k >= c.from && r.k <= c.to);
      const total = d3.sum(rs, r => r.total), sv = d3.sum(rs, r => r.Surfvote), qa = d3.sum(rs, r => d3.sum(QA_KEYS, k => r[k]));
      return { c, total, avg: total / rs.length, sv: sv / total, qa: qa / total };
    });
    const pct = v => Math.round(v * 100) + '%';
    const cross = PM.crossMonth;
    const total = d3.sum(monthRows, r => r.total);
    const pv1 = PM.ms('2025-08-06', 'PV'), pv2 = PM.ms('2025-12-31', 'PV');
    el('s01-body').innerHTML = `
      <table class="mini"><thead><tr><th>章</th><th>本数</th><th>月平均</th><th>Surfvote</th><th>QommonsAI系</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><a href="${PM.href(r.c.path)}">第${r.c.n}章</a></td><td>${r.total}</td><td>${r.avg.toFixed(1)}</td><td>${pct(r.sv)}</td><td>${pct(r.qa)}</td></tr>`).join('')}
      <tr><td>計</td><td>${total}</td><td>${(total / monthRows.length).toFixed(1)}</td><td></td><td></td></tr>
      </tbody></table>
      <p class="src">QommonsAI系＝QommonsAI・QommonsAI研修・自治体協定の合計。テーマ分類は元データの暫定分類による。データのない月も0として横軸に含める（全${monthRows.length}か月）。</p>
      <p>第2章までは発信の大半がSurfvoteの投票記事だった。${cross ? `${fmtYM(cross.m)}以降は、QommonsAI関連の発信が毎月Surfvoteを上回っている。` : ''}発信の総量は第3〜4章で月10本前後まで細り、第5章で月15本前後に戻った。</p>
      <p class="src">ここで言えるのは「発信の主役」の移り変わりまで。Surfvote自体は続いており、${ext(pv1.url, dot(pv1.date) + ' ' + pv1.headline)}、${ext(pv2.url, dot(pv2.date) + ' ' + pv2.headline)}。</p>`;
  }

  PM.initMonthly = () => {
    if (!el('chart-monthly')) return;
    PM.legend('legend-monthly', THEMES.map(t => ({ label: t.label, color: t.color })).concat([{ label: '導入自治体数（右目盛）', cls: 'sw-line' }, { label: 'PR TIMES出典の月（棒の下の点）', color: '#111', cls: 'sw-pr' }, { label: 'マイルストーン', cls: 'sw-tri' }]));
    renderS01Body();
    PM.register(el('chart-monthly'), monthlyChart);
  };
})(window.PM);
