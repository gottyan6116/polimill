// Run the in-page self-check (?check) on every page at mobile and desktop width.
//   node audit/check-all.mjs [--shots]   (--shots also saves full-page screenshots to audit/screenshots/)
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve, listPages } from './serve.mjs';

const PORT = 3011;
const WIDTHS = [375, 1440];
const shots = process.argv.includes('--shots');
if (shots) fs.mkdirSync('audit/screenshots', { recursive: true });

const server = await serve(PORT);
const browser = await chromium.launch();
let fail = 0;
const required = new Set(['2a', '2f', '2g', '2h', '2i', '2j', '2k', '2l', '2m', '3', '4', '4b', '5c']);
const seen = new Set();

for (const p of listPages()) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://localhost:${PORT}${p}?check`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.PM_CHECK, null, { timeout: 30000 });
    const r = await page.evaluate(() => window.PM_CHECK);
    r.results.forEach(x => seen.add(x.name.split(' ')[0]));
    const bad = r.results.filter(x => !x.pass);
    fail += bad.length + errors.length;
    console.log(`${bad.length || errors.length ? 'FAIL' : 'ok  '} ${p.padEnd(14)} @${width}  ${r.pass}/${r.total}` +
      bad.map(x => `\n       ${x.name}  ${x.detail}`).join('') + errors.map(e => `\n       console: ${e}`).join(''));
    if (shots) {
      await page.evaluate(() => { const c = document.getElementById('check-result'); if (c) c.remove(); });
      const name = (p === '/' ? 'top' : p.replace(/^\/|\/$/g, '').replace(/\//g, '-')) + `@${width}.png`;
      await page.screenshot({ path: `audit/screenshots/${name}`, fullPage: true });
    }
    await page.close();
  }
}
const missing = [...required].filter(k => !seen.has(k));
if (missing.length) { fail += missing.length; console.log('FAIL checks never ran on any page:', missing.join(', ')); }
console.log(fail ? `\n${fail} problem(s)` : '\nall pages pass');
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
