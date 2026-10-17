/* Method page — sources, confidence labels, theme classification, calculation formulas, figure notes. */
(function (PM) {
  'use strict';
  const { D, parse, fmtJ, nf, esc, el, adoption, lastAdopt, THEMES } = PM;

  function renderSources() {
    const groups = d3.groups(D.news, n => n.source).map(([s, list]) => ({ s, n: list.length, from: d3.min(list, x => x.date), to: d3.max(list, x => x.date) }));
    el('method-sources').innerHTML = `
      <table class="mini files"><thead><tr><th>出典の表記</th><th>件数（全${D.news.length}件中）</th><th>記事の日付の範囲</th></tr></thead><tbody>
      ${groups.map(g => `<tr><td>${esc(g.s)}</td><td>${g.n}</td><td>${fmtJ(parse(g.from))}〜${fmtJ(parse(g.to))}</td></tr>`).join('')}
      </tbody></table>
      <p class="src">マイルストーン・導入自治体数・目標と実績の各データにも、同じ表記の出典名とURLが付いている。マイルストーンでは「PR TIMES」とだけ書かれたものが1件ある（DATA_NOTES.md）。</p>
      <p>各ページでは、出典を小さなリンクアイコンで示す。アイコンにマウスを重ねるか一度タップすると出典名が出て、もう一度タップすると原文が開く。</p>`;
  }

  function renderLabels() {
    const ex = {
      fact: '発信本数、研修・協定の件数、記事の日付、リリース文面上の表記',
      claim: '導入自治体数、職員ユーザー数、調達額、評価額、公言目標',
      est: '月あたりの導入ペース、倍率、目標比、発表から逆算した開発開始時期',
      unk: 'Qommons ONEの正式提供の状況、Surfvote 2.0、2026年6月以降の導入数',
    };
    el('method-labels').innerHTML = Object.entries(PM.CONF).map(([k, c]) => `
      <div class="lbl-row"><dt>${PM.conf(k)}</dt><dd>${esc(c.desc)}。<span class="src">例：${esc(ex[k])}</span></dd></div>`).join('');
  }

  function renderThemes() {
    const cnt = k => D.news.filter(n => n.theme === k).length;
    el('method-themes').innerHTML = `
      <table class="mini files"><thead><tr><th>テーマ</th><th>件数</th><th>図での表示</th></tr></thead><tbody>
      ${THEMES.map(t => `<tr><td>${esc(t.key)}</td><td>${cnt(t.key)}</td><td><span class="sw" style="background:${t.color}"></span> ${esc(t.label)}</td></tr>`).join('')}
      </tbody></table>
      <p>分類は元データ（<code>0_all_news_699.csv</code>）の「テーマ（暫定分類）」列をそのまま使う。分類の基準は元データに記載がなく、暫定のものとして扱う。色は全ページで固定（Surfvoteはグレー、QommonsAIは #67C59F）。</p>`;
  }

  function renderCalc() {
    const A = d => adoption.find(a => a.date === d);
    const p1 = A('2025-07-23'), p2 = A('2025-12-24'), p3 = lastAdopt, first = adoption[0];
    const mo = (a, b) => d3.timeDay.count(a.t, b.t) / 30.44;
    const rate = (a, b) => (b.municipalities - a.municipalities) / mo(a, b);
    const t25 = D.targets.find(t => t.item.startsWith('2025年 ')), t26 = D.targets.find(t => t.item.startsWith('2026年'));
    const pct = t => Math.round(PM.firstNum(t.actual) / PM.firstNum(t.target) * 100);
    el('method-calc').innerHTML = `
      <ol class="calc">
        <li><b>月あたりの導入ペース</b>${PM.conf('est')}
          <p>（後の時点の導入自治体数 − 前の時点の導入自治体数）÷（2時点の間の日数 ÷ 30.44）。表示は10単位に丸める。</p>
          <p class="src">${fmtJ(p1.t)} ${p1.municipalities} → ${fmtJ(p2.t)} ${p2.municipalities}：${d3.timeDay.count(p1.t, p2.t)}日（約${mo(p1, p2).toFixed(1)}か月）で+${p2.municipalities - p1.municipalities}、月${rate(p1, p2).toFixed(1)} → 月約${PM.round10(rate(p1, p2))}<br>
          ${fmtJ(p2.t)} ${p2.municipalities} → ${fmtJ(p3.t)} ${p3.municipalities}：${d3.timeDay.count(p2.t, p3.t)}日（約${mo(p2, p3).toFixed(1)}か月）で+${p3.municipalities - p2.municipalities}、月${rate(p2, p3).toFixed(1)} → 月約${PM.round10(rate(p2, p3))}</p></li>
        <li><b>倍率</b>${PM.conf('est')}
          <p>最新の導入自治体数 ÷ 最初の値。${nf(p3.municipalities)} ÷ ${first.municipalities} = ${Math.round(p3.municipalities / first.municipalities)}倍（${fmtJ(first.t)}〜${fmtJ(p3.t)}）。</p></li>
        <li><b>目標比</b>${PM.conf('est')}
          <p>実績 ÷ 公言目標。2025年：${PM.firstNum(t25.actual)} ÷ ${nf(PM.firstNum(t25.target))} = ${pct(t25)}%。2026年：${PM.firstNum(t26.actual)} ÷ ${nf(PM.firstNum(t26.target))} = ${pct(t26)}%（${fmtJ(parse(t26.actual_as_of))}時点）。</p></li>
        <li><b>開発開始（2024.3）</b>${PM.conf('est')}
          <p>${esc(PM.STEPS[0].note)}。</p></li>
        <li><b>章ごとの発信本数と比率</b>${PM.conf('fact')}
          <p>章の期間に含まれる記事の本数を数え、テーマ別の本数 ÷ 章の総本数で比率を出す。月平均は総本数 ÷ 章の月数。</p></li>
        <li><b>論点の壁の抽出</b>${PM.conf('fact')}
          <p>第2章の期間のSurfvote記事${PM.svPeriod.length}件を日付順に並べ、i番目（i = 0〜${PM.WALL_N - 1}）に 四捨五入(i ×（${PM.svPeriod.length} − 1）÷ ${PM.WALL_N - 1}) 番目の記事を選ぶ。</p></li>
      </ol>`;
  }

  function renderNotes() {
    el('method-notes').innerHTML = Object.values(PM.NOTES).map(n => `
      <div class="note-group"><h3 class="sub-s"><a href="${PM.href(n.path)}">${esc(n.page)}</a>　${esc(n.fig)}</h3>${n.items.map(h => `<p>${h}</p>`).join('')}</div>`).join('');
  }

  PM.initMethod = () => {
    if (!el('method-sources')) return;
    renderSources(); renderLabels(); renderThemes(); renderCalc(); renderNotes();
  };
})(window.PM);
