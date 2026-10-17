/* Analysis C — 47 prefecture tile map. */
(function (PM) {
  'use strict';
  const { D, parse, fmtJ, esc, ext, el, dot, svgFor } = PM;

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
    tiles.on('pointermove', (ev, d) => { if (ev.pointerType === 'mouse' && !PM.isPinned()) PM.showTip(`<b>${esc(d.name)}</b><div class="row">研修<span class="v">${d.train}</span></div><div class="row">協定<span class="v">${d.agree}</span></div>`, ev); })
      .on('pointerleave', ev => { if (ev.pointerType === 'mouse' && !PM.isPinned()) PM.hideTip(); });
    if (animate) tiles.attr('opacity', 0).transition().delay(d => (TILE_POS[d.name][0] + TILE_POS[d.name][1]) * 30).duration(300).attr('opacity', 1);
  }

  function renderTilesText() {
    PM.legend('legend-tiles', BUCKETS.map(b => ({ label: b.label, color: b.color })).concat([{ label: '協定あり', cls: 'sw-dot' }]));
    const top = prefList.slice().sort((a, b) => b.total - a.total).slice(0, 3);
    const zero = prefList.filter(p => p.total === 0);
    const withAgree = prefList.filter(p => p.agree > 0);
    selectedPref = top[0]; renderPanel(top[0]);
    el('s07-body').innerHTML = `
      <p>研修・協定の発表は${prefList.length - zero.length}都道府県に及ぶ。最も多いのは${top.map(p => `${p.name}（${p.total}件）`).join('、')}。協定は${withAgree.length}道府県で${d3.sum(prefList, p => p.agree)}件。</p>
      <p>まだ発表がないのは${zero.length}県：${zero.map(p => p.name).join('、')}。中国・四国・九州の一部に空白が残る。</p>
      <p class="src">件数は 3_prefecture_summary（研修・協定）による。タイルの配置は地理に近い模式配置。タイルをタップすると件数と最新の発表が右（モバイルでは下）に出る。</p>`;
  }

  PM.initTiles = () => {
    if (!el('chart-tiles')) return;
    renderTilesText();
    PM.register(el('chart-tiles'), tileChart);
  };
})(window.PM);
