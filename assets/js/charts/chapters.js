/* Chapter visuals: 1 funding staircase, 2 wall of issues, 3 launch steps, 5 ecosystem diagram.
   (Chapter 4's zoomed curve lives in adoption.js.) */
(function (PM) {
  'use strict';
  const { D, parse, fmtJ, fmtYM, keyM, nf, esc, ext, el, dot, ms, svgFor, bindTip, msIndex, yearMonthTick } = PM;

  // ---------- chapter 1: cumulative funding staircase ----------
  function fundingChart(node, animate) {
    const FUNDING = PM.FUNDING;
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
    g.append('g').selectAll('text').data(yt).join('text').attr('class', 'tick-label').attr('x', -6).attr('y', d => y(d) + 3).attr('text-anchor', 'end').text(d => d ? PM.yen(d) + '円' : '');
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
    el('s02-body').innerHTML = `
      <p>最初のプロダクトは行政向けではなく、市民が社会課題に投票する政策提言SNS「Surfvote」だった。2022年末には投票結果を3省へ提出し、奈良県田原本町との「Surfvoteローカル」も始まる。この時期の調達は累計約1.3億円まで。</p>
`;
  }

  // ---------- chapter 2: wall of issues + milestone strip ----------
  function wallStrip(node, animate) {
    const ch2Months = PM.ch2Months;
    const W = node.clientWidth;
    const H = 110, m = { t: 26, r: 4, b: 20, l: 4 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = d3.scaleBand().domain(ch2Months.map(r => r.k)).range([0, iw]).paddingInner(0.18);
    const y = d3.scaleLinear().domain([0, 32]).range([ih, 0]);
    const svg = svgFor(node, W, H, '第2章の月別Surfvote記事数とマイルストーン');
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
    g.append('rect').attr('x', 0).attr('width', iw).attr('y', y(30)).attr('height', y(20) - y(30)).attr('fill', '#4A4A4A').attr('fill-opacity', 0.08);
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
      g.append('line').attr('x1', px).attr('x2', px).attr('y1', -10 - lift * 12).attr('y2', ih).attr('stroke', '#111').attr('stroke-width', 1);
      const k = g.append('g').datum(mm).attr('transform', `translate(${px},${-16 - lift * 12})`);
      k.append('circle').attr('r', 7).attr('fill', '#fff').attr('stroke', '#111');
      k.append('text').attr('text-anchor', 'middle').attr('y', 3.5).style('font-size', '9px').attr('fill', '#111').text(msIndex.get(mm));
      bindTip(k, d => `<b>${fmtJ(parse(d.date))}</b><br>${esc(d.headline)}<p class="src">出典：${ext(d.url, d.source)}</p>`);
    });
    bindTip(g.append('g').selectAll('rect').data(ch2Months).join('rect').attr('x', r => x(r.k)).attr('width', x.step()).attr('y', 0).attr('height', ih).attr('fill', 'transparent'),
      r => `<b>${fmtYM(r.m)}</b><div class="row">Surfvote記事<span class="v">${r.Surfvote}本</span></div><div class="row">全テーマ計<span class="v">${r.total}本</span></div>`);
    if (animate) bars.attr('y', ih).attr('height', 0).transition().delay((d, i) => i * 25).duration(400).attr('y', r => y(r.Surfvote)).attr('height', r => ih - y(r.Surfvote));
  }

  function renderWall() {
    const { ch2Months, svPeriod, WALL_N } = PM;
    const w = el('wall');
    w.innerHTML = PM.wallItems.map(n => `<span class="w-item"><time datetime="${n.date}">${d3.timeFormat('%y.%m')(parse(n.date))}</time>${ext(n.url, n.title)}</span>`).join('');
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
`;
  }

  // ---------- chapter 3: process steps ----------
  function renderSteps() {
    el('steps').innerHTML = PM.STEPS.map(s => `
      <li class="${s.tag ? 'el' : ''}">
        <span class="dot"></span>
        <time>${esc(s.when)}</time>
        <span class="st-label">${esc(s.label)}${s.note ? PM.fnRef('ch3', 1) : ''}${PM.srcIcon(s.m.url, s.m.source, PM.dot(s.m.date))}</span>
        ${s.tag ? `<span class="tag ${s.tag[1]}">${esc(s.tag[0])}</span>` : ''}${s.note ? PM.conf('est') : ''}
      </li>`).join('');
    const why = ms('2024-11-20').why;
    el('steps-sum').innerHTML = `<b>2024年11月、研修・協定・無料枠の3要素が揃う。</b>　マイルストーンの記述では「${esc(why)}」。以後の拡大はこの型の繰り返しになる。`;
    const rep = ms('2025-05-14');
    const yokota = D.news.find(n => n.title.includes('横田えり'));
    const both = D.news.find(n => n.title.includes('伊藤あやめ') && n.title.includes('谷口野乃花'));
    el('s04-body').innerHTML = `
      <p>2024年3月の「DIGITAL COMMONS」無料提供を経て、8月にQommonsAIのプレビュー版を約50の自治体・省庁へ。9月に現地研修、10月にプロダクト版、11月に初の包括連携協定と「100アカウントまで無料」。製品と同時に、売り方の型まで4か月ほどで揃えている。</p>
      ${PM.footnotes('ch3', [
        `${PM.conf('est')}${esc(PM.STEPS[0].note)}。`,
        `${PM.conf('fact')}注記：代表表記が2025年4月前後に横田えり氏→伊藤あやめ氏・谷口野乃花氏へ（リリース文面上の表記による）。<br><span class="src">参照：${ext(yokota.url, dot(yokota.date) + ' 横田えり氏の表記')}　／　${ext(rep.url, dot(rep.date) + ' 「' + rep.why + '」')}${both ? '　／　' + ext(both.url, dot(both.date) + ' 伊藤・谷口両氏の表記') : ''}</span>`,
      ])}`;
    const title = document.querySelector('.ch-title');
    if (title) title.insertAdjacentHTML('beforeend', PM.fnRef('ch3', 2));
  }

  // ---------- chapter 5: ecosystem diagram ----------
  function ecoChart(node) {
    const ECO = PM.ECO;
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
    const ECO = PM.ECO;
    const names = { T: '上・国', C: '中央・QommonsAI', L: '左・自治体', R: '右・民間パートナー', B: '下・新製品' };
    el('eco-src').innerHTML = ['T', 'C', 'L', 'R', 'B'].map(k => `<li>${names[k]}：${ECO[k].src.map(s => s.headline
      ? ext(s.url, dot(s.date) + ' ' + s.headline)
      : s.target_url ? ext(s.target_url, dot(s.stated_on) + ' ' + s.item + 'の目標「' + s.target + '」')
      : ext(s.url, dot(s.date) + ' ' + s.note)).join('　／　')}</li>`).join('');
    const outage = ms('2026-06-23');
    const sa = ms('2026-01-19');
    el('s06-body').innerHTML = `
      <p>2026年は、無料で広げた自治体の利用基盤の上に、民間パートナーのアプリ（Qommons ONE）と新製品群を重ねる構想が前面に出た。1月のシリーズA（${esc(sa.headline.replace(/^シリーズAで/, ''))}）は、マイルストーンの記述では「${esc(sa.why)}」とされる。</p>
      <p>一方で6月には${esc(outage.headline)}。${esc(outage.why)}。</p>
`;
  }

  PM.initChapters = () => {
    if (el('s02-body')) { renderS02Body(); PM.figNotes('funding', el('chart-funding').closest('figure')); }
    PM.register(el('chart-funding'), fundingChart);
    if (el('wall')) { renderWall(); PM.figNotes('wall', el('wall').closest('figure')); }
    PM.register(el('chart-wallstrip'), wallStrip);
    if (el('steps')) renderSteps();
    if (el('eco-src')) { renderEcoSrc(); PM.figNotes('eco', el('chart-eco').closest('figure')); }
    PM.register(el('chart-eco'), ecoChart);
  };
})(window.PM);
