/* Chapter pages — key figure under the chapter heading, and the milestone timeline. */
(function (PM) {
  'use strict';
  const { D, fmtYM, nf, esc, ext, dot, ms, adoption, lastAdopt, msIndex } = PM;

  function renderChapterStats() {
    const A = d => adoption.find(a => a.date === d);
    const fund = ms('2022-12-13', '約1.3億円'), a100 = A('2024-11-30'), a150 = A('2025-05-14'), a600 = A('2025-12-24');
    const S = {
      1: { v: '約1.3億円', l: '累計調達額（2022年12月）', src: PM.conf('claim') + PM.srcIcon(fund.url, fund.source, PM.dot(fund.date)) },
      2: { v: `${PM.svPeriod.length}本`, l: `この期間のSurfvote記事（月平均${(PM.svPeriod.length / PM.ch2Months.length).toFixed(1)}本）`, src: PM.conf('fact') + '0_all_news_699.csv の暫定分類で集計' },
      3: { v: a100.note, l: `プロダクト版リリースの翌月に到達（${fmtYM(a100.t)}）`, src: PM.conf('claim') + PM.srcIcon(a100.url, a100.source, PM.dot(a100.date)) },
      4: { v: `${a150.municipalities} → ${a600.municipalities}`, l: `導入自治体（${fmtYM(a150.t)} → ${fmtYM(a600.t)}）`, src: PM.conf('claim') + PM.srcIcon(a150.url, a150.source, PM.dot(a150.date)) + PM.srcIcon(a600.url, a600.source, PM.dot(a600.date)) },
      5: { v: `約${nf(lastAdopt.municipalities)}`, l: `導入自治体（${fmtYM(lastAdopt.t)}、最新の発表値）`, src: PM.conf('claim') + PM.srcIcon(lastAdopt.url, lastAdopt.source, PM.dot(lastAdopt.date)) },
    };
    document.querySelectorAll('.chapter[data-chapter]').forEach(sec => {
      const n = +sec.dataset.chapter, st = S[n], head = sec.querySelector('.ch-head');
      head.insertAdjacentHTML('afterend', `<div class="ch-stat" data-chapter="${n}"><b>${esc(st.v)}</b><span>${esc(st.l)}<span class="src">${st.src}</span></span></div>`);
    });
  }

  function renderTimelines() {
    document.querySelectorAll('.tl[data-chapter]').forEach(ol => {
      const n = +ol.dataset.chapter;
      ol.innerHTML = D.milestones.filter(m => m.chapter === n).map(m => `
        <li class="${PM.keyMilestones.has(m) ? 'key' : ''}" data-date="${m.date}">
          <p class="tl-date"><span class="idx">${msIndex.get(m)}</span>${dot(m.date)}</p>
          <p class="tl-head">${esc(m.headline)}${PM.srcIcon(m.url, m.source, dot(m.date))}</p>
          <p class="tl-why">${esc(m.why)}</p>
        </li>`).join('');
    });
  }

  // top page: five chapters on one proportional strip, each linking to its page
  function renderMiniTimeline() {
    const total = PM.monthRows.length;
    const span = c => PM.monthRows.filter(r => r.k >= c.from && r.k <= c.to).length;
    PM.el('minitl').innerHTML = `
      <div class="mini-strip" aria-hidden="true">${PM.CH.map(c => `<a href="${PM.href(c.path)}" tabindex="-1" style="flex-grow:${span(c)}"><span>${c.n}</span></a>`).join('')}</div>
      <div class="mini-years" aria-hidden="true">${[2022, 2023, 2024, 2025, 2026].map(y => `<span style="left:${PM.monthRows.findIndex(r => r.k === y + '-01') / total * 100}%">${y}</span>`).join('')}</div>
      <ol class="mini-list">${PM.CH.map(c => `
        <li><a href="${PM.href(c.path)}"><span class="mn">第${c.n}章</span><span class="mt">${esc(c.name)}<small>${esc(c.period)}</small></span><span class="mm">${esc(c.msg)}</span></a></li>`).join('')}
      </ol>`;
  }

  PM.initTimeline = () => {
    renderTimelines();
    renderChapterStats();
    if (PM.el('minitl')) renderMiniTimeline();
  };
})(window.PM);
