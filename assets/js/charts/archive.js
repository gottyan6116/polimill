/* Archive page — all 699 articles with filters. Supports ?month=YYYY-MM from the monthly chart. */
(function (PM) {
  'use strict';
  const { D, parse, fmtYM, esc, ext, el, dot, THEMES, TCOLOR, TLABEL } = PM;

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
    tag.addEventListener('click', e => {
      if (e.target.id !== 'archive-month-clear') return;
      month = ''; apply();
      const u = new URL(window.location.href); u.searchParams.delete('month'); history.replaceState(null, '', u);
    });
    window.PM_filterMonth = k => {
      month = /^\d{4}-\d{2}$/.test(k) ? k : '';
      ['f-theme', 'f-year', 'f-source', 'f-q'].forEach(id => { el(id).value = ''; });
      apply();
      el('archive-top').scrollIntoView({ behavior: PM.REDUCED ? 'auto' : 'smooth' });
    };
    ['f-theme', 'f-year', 'f-source'].forEach(id => el(id).addEventListener('change', apply));
    el('f-q').addEventListener('input', PM.debounce(apply, 150));
    el('archive-more').addEventListener('click', () => { shown += PAGE; draw(); });
    window.PM_archiveShowAll = () => { shown = list.length; draw(); };
    const qm = new URLSearchParams(window.location.search).get('month');
    if (qm && /^\d{4}-\d{2}$/.test(qm)) { month = qm; apply(); } else draw();
  }

  PM.initArchive = () => { if (el('archive')) renderArchive(); };
})(window.PM);
