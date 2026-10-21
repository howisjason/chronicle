// gen.mjs: writes demo.html from face.html, putting in core.mjs's code
// between its markers, word for word, and the sample PDF from fixture.mjs.
//   bash room/tools/try.sh pdf-words gen.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { samplePdf } from './fixture.mjs';

const core = readFileSync(new URL('./core.mjs', import.meta.url), 'utf8');
const a = core.indexOf('// core:start'), b = core.indexOf('// core:end');
const region = core.slice(a, b + '// core:end'.length);
const face = readFileSync(new URL('./face.html', import.meta.url), 'utf8');
const html = face
  .replace('/*CORE*/', () => region)
  .replace('/*SAMPLE*/', () => samplePdf().toString('base64'));
writeFileSync(new URL('./demo.html', import.meta.url), html);
console.log(`demo.html: ${html.length} chars, core ${region.split('\n').length} lines`);
