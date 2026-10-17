/* Analysis B — targets vs actuals; Analysis D — questions to confirm after joining. */
(function (PM) {
  'use strict';
  const { D, parse, fmtJ, nf, esc, ext, el, dot, ms, adoption, lastAdopt, svgFor, firstNum } = PM;

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
    const { round10, monthsBetween } = PM;
    const A = d => adoption.find(a => a.date === d);
    const p1 = A('2025-07-23'), p2 = A('2025-12-24'), p3 = lastAdopt;
    const r1 = (p2.municipalities - p1.municipalities) / (d3.timeDay.count(p1.t, p2.t) / 30.44);
    const r2 = (p3.municipalities - p2.municipalities) / (d3.timeDay.count(p2.t, p3.t) / 30.44);
    const one = D.targets.find(t => t.item === 'Qommons ONE'), launch = ms('2026-05-27');
    const sv2 = D.targets.find(t => t.item === 'Surfvote 2.0'), rep = ms('2025-05-14');
    const lastNews = d3.max(D.news, n => n.date);
    const Q = [
      { c: 'est', q: '導入数の伸び（2025年下期 月約60 → 2026年前半 月約40）は鈍化か、定着重視への意図的な転換か。アクティブ率はどうか。',
        s: `根拠：${fmtJ(p1.t)} ${p1.municipalities} → ${fmtJ(p2.t)} ${p2.municipalities}（${monthsBetween(p1, p2)}か月で+${p2.municipalities - p1.municipalities}、月約${round10(r1)}）、→ ${fmtJ(p3.t)} ${p3.municipalities}（${monthsBetween(p2, p3)}か月で+${p3.municipalities - p2.municipalities}、月約${round10(r2)}）。${ext(p1.url, '7月')}／${ext(p2.url, '12月')}／${ext(p3.url, '5月')}の発表値から単純計算。` },
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

  PM.initTargets = () => {
    if (el('targets-num')) renderTargets();
    if (el('questions')) renderQuestions();
  };
})(window.PM);
