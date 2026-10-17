// Compare two extractions: every line of <before> must still exist somewhere in <after>.
//   node audit/compare.mjs audit/before.txt audit/after.txt [audit/diff-report.md]
// A line counts as kept when its text (whitespace removed) appears as a substring of the
// whole after-corpus, so text that was merged into a longer line or re-wrapped still counts.
import fs from 'node:fs';

const [beforeF = 'audit/before.txt', afterF = 'audit/after.txt', reportF = 'audit/diff-report.md'] = process.argv.slice(2);
const read = f => fs.readFileSync(f, 'utf8').split('\n').filter(l => l && !l.startsWith('### '));
const squash = s => s.replace(/\s+/g, '');
const before = read(beforeF), after = read(afterF);
const corpus = squash(after.join('\n'));

const count = arr => arr.reduce((m, l) => m.set(l, (m.get(l) || 0) + 1), new Map());
const bCount = count(before), aCount = count(after);
const missingAll = [...bCount.keys()].filter(l => !corpus.includes(squash(l)));
// intended removals (renumbering, nav labels, approved wording changes) with the reason for each
const expected = fs.existsSync('audit/expected-removals.json') ? JSON.parse(fs.readFileSync('audit/expected-removals.json', 'utf8')) : {};
const missing = missingAll.filter(l => !(l in expected));
const explained = missingAll.filter(l => l in expected);

// links: every before href must still be linked
const links = f => new Set(fs.readFileSync(f.replace(/\.txt$/, '-links.tsv'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')[0]));
const bl = links(beforeF), al = links(afterF);
const lostAll = [...bl].filter(h => !al.has(h));
const lostLinks = lostAll.filter(h => !(h in expected));
const lostExplained = lostAll.filter(h => h in expected);

// lines whose number of occurrences dropped (e.g. repeated source notes after consolidation)
const fewer = [...bCount.entries()].filter(([l, n]) => (aCount.get(l) || 0) < n && corpus.includes(squash(l)))
  .map(([l, n]) => [l, n, aCount.get(l) || 0]).sort((a, b) => (b[1] - b[2]) - (a[1] - a[2]));

const md = [
  '# 文言の差分レポート', '',
  `- 比較元：\`${beforeF}\`（ユニーク ${bCount.size} 行）`,
  `- 比較先：\`${afterF}\`（ユニーク ${aCount.size} 行）`,
  `- **消えた文言（理由の記録なし）：${missing.length} 行**`,
  `- 意図した変更として記録済み：文言 ${explained.length} 行、リンク ${lostExplained.length} 件（\`audit/expected-removals.json\`）`,
  `- 消えたリンク先（理由の記録なし）：${lostLinks.length} 件`, '',
  '## 消えた文言（理由の記録なし）', '', ...(missing.length ? missing.map(l => `- ${l}`) : ['なし']), '',
  '## 消えたリンク先（理由の記録なし）', '', ...(lostLinks.length ? lostLinks.map(h => `- \`${h}\``) : ['なし']), '',
  '## 意図した変更（番号・ナビ・承認済みの文言変更）', '', '| 移行前の文言・リンク | 理由 |', '|---|---|',
  ...explained.concat(lostExplained).map(l => `| ${l.split('|').join('/')} | ${expected[l]} |`), '',
  '## 出現回数が減った文言（文言自体は残っている）', '',
  '抽出は1ページを375px・1440pxの2幅で行い、ツールチップと都道府県パネルの中身も含むため、回数は表示回数の目安。', '',
  '| 文言 | 移行前 | 移行後 |', '|---|---:|---:|',
  ...fewer.slice(0, 60).map(([l, b, a]) => `| ${l.replace(/\|/g, '\\|').slice(0, 80)} | ${b} | ${a} |`),
  fewer.length > 60 ? `\nほか ${fewer.length - 60} 行` : '', '',
];
fs.writeFileSync(reportF, md.join('\n'), 'utf8');
console.log(`missing=${missing.length} lostLinks=${lostLinks.length} explained=${explained.length + lostExplained.length} fewer=${fewer.length} -> ${reportF}`);
missing.forEach(l => console.log('  - ' + l));
lostLinks.forEach(h => console.log('  link - ' + h));
