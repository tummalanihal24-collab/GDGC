// Usage: node render.js out_dir file1.svg file2.svg ...  -> PNG (2x) next to each SVG name in out_dir
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const [outDir, ...files] = process.argv.slice(2);
  const browser = await chromium.launch();
  for (const f of files) {
    const svg = fs.readFileSync(f, 'utf8');
    const m = svg.match(/width="(\d+)" height="(\d+)"/);
    const page = await browser.newPage({ viewport: { width: +m[1], height: +m[2] }, deviceScaleFactor: 2 });
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await page.screenshot({ path: path.join(outDir, path.basename(f, '.svg') + '.png') });
    await page.close();
  }
  await browser.close();
})();
