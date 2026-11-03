import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';

// Embed the built app, styles and fonts so the preview also opens without a server.
const root = resolve('dist');
let html = await readFile(resolve(root, 'index.html'), 'utf8');
const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const stylesheet = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!script || !stylesheet) throw new Error('Expected Vite JavaScript and CSS assets were not found.');
const assetPath = path => resolve(root, path.replace(/^\//, ''));
const js = await readFile(assetPath(script[1]), 'utf8');
const cssPath = assetPath(stylesheet[1]);
let css = await readFile(cssPath, 'utf8');
const refs = [...css.matchAll(/url\(([^)]+)\)/g)];
for (const ref of refs) {
  const url = ref[1].replace(/["']/g, '');
  if (url.startsWith('data:')) continue;
  const path = url.startsWith('/') ? assetPath(url) : resolve(dirname(cssPath), url);
  const data = await readFile(path);
  const mime = url.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
  css = css.replaceAll(ref[0], `url("data:${mime};base64,${data.toString('base64')}")`);
}
const favicon = await readFile('public/favicon.svg');
html = html.replace(script[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`)
  .replace(stylesheet[0], () => `<style>${css}</style>`)
  .replace('href="/favicon.svg"', `href="data:image/svg+xml;base64,${favicon.toString('base64')}"`);
await writeFile(resolve(root, 'index.html'), html);
await writeFile(resolve(root, 'Teamhub.html'), html);
console.log(`Standalone preview: dist/Teamhub.html (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
