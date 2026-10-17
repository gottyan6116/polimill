/* Site chrome shared by every page: navigation, chapter pager, footer, legacy-anchor redirect.
   The page list is defined once here. */
(function (PM) {
  'use strict';
  const { esc, el } = PM;

  const PAGES = [
    { id: 'top', path: '', label: 'トップ', short: 'トップ' },
    ...PM.CH.map(c => ({ id: 'ch' + c.n, path: c.path, label: `第${c.n}章 ${c.name}`, short: String(c.n), period: c.period })),
    { id: 'analysis', path: 'analysis/', label: '分析', short: '分析', sub: [
      ['sec-composition', 'A 発信構成'], ['sec-targets', 'B 目標と実績'], ['sec-regions', 'C 全国の分布'], ['sec-questions', 'D 入社後に確認したい問い'],
    ] },
    { id: 'archive', path: 'archive/', label: 'アーカイブ', short: 'アーカイブ' },
    { id: 'method', path: 'method/', label: 'データと方法', short: '方法', sub: [
      ['sec-sources', '出典'], ['sec-labels', '確度ラベル'], ['sec-themes', 'テーマ分類'], ['sec-calc', '計算方法'], ['sec-notes', '図の注記'], ['sec-files', 'データファイル'],
    ] },
  ];
  PM.PAGES = PAGES;

  const body = document.body;
  const currentId = body.dataset.page === 'chapter' ? 'ch' + body.dataset.chapter : body.dataset.page;
  const current = PAGES.find(p => p.id === currentId);

  // old single-page anchors (/#s02 …) → new pages
  const LEGACY = {
    s01: 'analysis/#sec-composition', s02: 'chapters/1/', s03: 'chapters/2/', s04: 'chapters/3/', s05: 'chapters/4/',
    s06: 'chapters/5/', s07: 'analysis/#sec-regions', s08: 'analysis/#sec-targets', s09: 'archive/',
  };
  const legacy = currentId === 'top' && LEGACY[window.location.hash.slice(1)];
  if (legacy) window.location.replace(PM.href(legacy));
  if (currentId === 'top') window.addEventListener('hashchange', () => {
    const to = LEGACY[window.location.hash.slice(1)];
    if (to) window.location.replace(PM.href(to));
  });

  function renderNav() {
    const head = el('site-head');
    if (head) {
      head.innerHTML = currentId === 'top' ? '' : `<div class="masthead masthead-s"><p class="kicker"><a href="${PM.href('')}">Polimill 5年の年表　2021.10–2026.10</a></p></div>`;
      head.insertAdjacentHTML('beforeend', `
        <nav class="jumpbar" aria-label="ページ">
          <span class="jumpbar-current" id="jumpbar-current">${esc(current.label)}</span>
          <ol class="jumpbar-list">
            ${PAGES.map(p => `<li${p.id.startsWith('ch') ? ' class="ch"' : ''}><a href="${PM.href(p.path)}"${p.id === currentId ? ' class="on" aria-current="page"' : ''} aria-label="${esc(p.label)}">${esc(p.short)}</a></li>`).join('')}
          </ol>
        </nav>`);
    }
    const side = el('sidenav');
    if (side) {
      side.innerHTML = `<ol>${PAGES.map(p => `
        <li><a href="${PM.href(p.path)}"${p.id === currentId ? ' class="on" aria-current="page"' : ''}><span class="n">${p.id.startsWith('ch') ? esc(p.short) : ''}</span>${esc(p.id.startsWith('ch') ? p.label.replace(/^第\d章 /, '第' + p.short + '章 ') : p.label)}</a>
        ${p.id === currentId && p.sub ? `<ol class="sub">${p.sub.map(([id, l]) => `<li><a href="#${id}" data-sec="${id}">${esc(l)}</a></li>`).join('')}</ol>` : ''}</li>`).join('')}</ol>`;
    }
  }

  // highlight the section in view (pages with several sections)
  function trackSections() {
    const secs = [...document.querySelectorAll('main .sec[data-label]')];
    if (secs.length < 2) return;
    const cur = el('jumpbar-current');
    const onScroll = () => {
      const y = window.innerHeight * 0.3;
      let active = secs[0];
      secs.forEach(s => { if (s.getBoundingClientRect().top <= y) active = s; });
      if (cur) cur.textContent = `${current.label}　${active.dataset.label}`;
      document.querySelectorAll('.sidenav .sub a').forEach(a => a.classList.toggle('on', a.dataset.sec === active.id));
    };
    window.addEventListener('scroll', PM.debounce(onScroll, 50), { passive: true });
    onScroll();
  }

  function renderPager() {
    const pager = el('pager');
    if (!pager) return;
    const i = PAGES.findIndex(p => p.id === currentId);
    const prev = PAGES[i - 1], next = PAGES[i + 1];
    pager.innerHTML = `
      ${prev ? `<a class="prev" href="${PM.href(prev.path)}"><span>前へ</span>${esc(prev.label)}</a>` : '<span></span>'}
      ${next ? `<a class="next" href="${PM.href(next.path)}"><span>次へ</span>${esc(next.label)}</a>` : '<span></span>'}`;
  }

  function renderFooter() {
    const main = document.querySelector('main');
    if (!main) return;
    main.insertAdjacentHTML('beforeend', `
      <footer class="foot">
        <p>出典：Polimill株式会社 自社サイト（polimill.jp）および PR TIMES 掲載の同社リリース。収録期間 2021年10月26日〜2026年10月6日。テーマ分類は暫定。</p>
        <p><a href="${PM.href('method/')}">データと方法</a>　<a href="${PM.href('archive/')}">アーカイブ（全699件）</a></p>
      </footer>`);
  }

  PM.initSite = () => {
    if (!current || legacy) return;
    renderNav();
    renderPager();
    renderFooter();
    trackSections();
  };
})(window.PM);
