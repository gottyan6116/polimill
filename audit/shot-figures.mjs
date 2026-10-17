// Screenshot single figures for close review: node audit/shot-figures.mjs
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const PORT = 3011;
const TARGETS = [
  ['/analysis/', '#sec-growth figure:nth-of-type(1)', 'growth'],
  ['/analysis/', '#sec-growth figure:nth-of-type(2)', 'parallel'],
  ['/analysis/', '#sec-targets figure:nth-of-type(2)', 'projection'],
  ['/chapters/4/', '#chapter', 'chapter4-top'],
];
fs.mkdirSync('audit/screenshots', { recursive: true });
const server = await serve(PORT);
const browser = await chromium.launch();
for (const width of [375, 1440]) {
  for (const [path, sel, name] of TARGETS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'load' });
    await page.evaluate(() => window.PM_renderAll());
    await page.waitForTimeout(300);
    const loc = page.locator(sel).first();
    if (name === 'chapter4-top') {
      await page.evaluate(() => window.scrollTo(0, document.querySelector('.tl').getBoundingClientRect().top + window.scrollY - 200));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `audit/screenshots/fig-${name}@${width}.png` });
    } else {
      await loc.screenshot({ path: `audit/screenshots/fig-${name}@${width}.png` });
    }
    await page.close();
  }
}
await browser.close();
server.close();
console.log('done');
