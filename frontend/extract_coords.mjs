import { readFileSync } from 'fs';
import { getDocument, GlobalWorkerOptions } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';

GlobalWorkerOptions.workerSrc = new URL('./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

const buf = readFileSync('C:/Users/vadim/Downloads/crm/הצעה סופית לנאות שדה.pdf');
const data = new Uint8Array(buf);

const doc = await getDocument({ data }).promise;
console.log('Pages:', doc.numPages);

for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  console.log(`\n=== Page ${p}  w=${vp.width.toFixed(0)} h=${vp.height.toFixed(0)} ===`);

  const tc = await page.getTextContent();
  for (const item of tc.items) {
    if ('str' in item && item.str.trim()) {
      const tx = item.transform[4];
      const ty = item.transform[5];
      console.log(`  y=${String(ty.toFixed(1)).padStart(7)}  x=${String(tx.toFixed(1)).padStart(7)}  "${item.str}"`);
    }
  }
}
