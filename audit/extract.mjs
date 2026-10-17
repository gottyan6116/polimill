// Extract every piece of user-visible text from every page, including text that only
// appears on interaction (tooltips, the prefecture panel, the full archive list).
//   node audit/extract.mjs audit/before.txt
// Writes <out> (text lines) and <out minus .txt>-links.tsv (href<TAB>text).
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve, listPages } from './serve.mjs';

const out = process.argv[2] || 'audit/after.txt';
const linksOut = out.replace(/\.txt$/, '') + '-links.tsv';
const WIDTHS = [1440, 375];
const PORT = 3011;

const server = await serve(PORT);
const browser = await chromium.launch();
const lines = [];
const links = new Map();

for (const pagePath of listPages()) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`http://localhost:${PORT}${pagePath}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.PM_renderAll === 'function');
    const res = await page.evaluate(async () => {
      const norm = s => s.replace(/[ \t　]+/g, ' ').split('\n').map(x => x.trim()).filter(Boolean);
      window.PM_renderAll();
      if (window.PM_archiveShowAll) window.PM_archiveShowAll();
      const wallBtn = document.getElementById('wall-more');
      if (wallBtn && !wallBtn.hidden) wallBtn.click();
      await new Promise(r => setTimeout(r, 300));
      const t = [];
      t.push(...norm(document.title));
      const desc = document.querySelector('meta[name="description"]');
      if (desc) t.push(...norm(desc.content));
      t.push(...norm(document.body.innerText));
      document.querySelectorAll('svg text').forEach(n => t.push(...norm(n.textContent)));
      document.querySelectorAll('[aria-label]').forEach(n => t.push(...norm(n.getAttribute('aria-label'))));
      document.querySelectorAll('option').forEach(n => t.push(...norm(n.textContent)));
      const hrefs = [];
      const grabLinks = root => root.querySelectorAll('a[href]').forEach(a => hrefs.push([a.getAttribute('href'), a.textContent.trim().replace(/\s+/g, ' ')]));
      grabLinks(document);
      // prefecture panel for every tile
      for (const tile of document.querySelectorAll('g.tile')) {
        tile.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const panel = document.getElementById('tile-panel');
        if (panel) { t.push(...norm(panel.innerText)); grabLinks(panel); }
      }
      // every tooltip trigger (bindTip marks them with cursor:pointer)
      const tip = document.querySelector('.tip');
      if (tip) {
        const triggers = [...document.querySelectorAll('svg [style*="cursor: pointer"]')];
        for (const el of triggers) {
          const r = el.getBoundingClientRect();
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
          if (getComputedStyle(tip).display !== 'none') { t.push(...norm(tip.innerText)); grabLinks(tip); }
        }
        document.body.click();
      }
      return { t, hrefs };
    });
    lines.push(`### ${pagePath} @${width}`, ...res.t);
    res.hrefs.forEach(([h, txt]) => links.set(h + '\t' + txt, (links.get(h + '\t' + txt) || 0) + 1));
    await page.close();
  }
}

fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
fs.writeFileSync(linksOut, [...links.keys()].sort().join('\n') + '\n', 'utf8');
console.log(`pages=${listPages().length} lines=${lines.length} uniqueLinks=${links.size} -> ${out}, ${linksOut}`);
await browser.close();
server.close();
