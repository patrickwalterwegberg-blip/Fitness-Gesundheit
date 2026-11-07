import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import {createHash} from 'node:crypto';
import {loadEnv} from 'vite';

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
const inlineScript=js.replace(/<\/script/gi,'<\\/script');
const scriptHash=createHash('sha256').update(inlineScript).digest('base64');
const env={...loadEnv('production',process.cwd(),'VITE_'),...process.env};
const project=env.VITE_SUPABASE_URL?new URL(env.VITE_SUPABASE_URL):null;
const backendOrigins=project?[project.origin,...(project.hostname.endsWith('.supabase.co')?[`https://${project.hostname.replace(/\.supabase\.co$/,'.storage.supabase.co')}`]:[])]:[];
const policy=["default-src 'none'",`script-src 'self' 'sha256-${scriptHash}'`,"style-src 'self' 'unsafe-inline'","font-src 'self' data:",`img-src 'self' data: blob: ${backendOrigins.join(' ')}`,`connect-src 'self' ${backendOrigins.join(' ')} ${project?'wss://'+project.host:''}`,`media-src 'self' blob: ${backendOrigins.join(' ')}`,"object-src blob:","frame-src blob: https://fg-gmbh-statistiken-2026.pwalter98.chatgpt.site","worker-src 'self' blob:","base-uri 'none'","form-action 'self'"].join('; ');
html = html.replace(script[0], () => `<script type="module">${inlineScript}</script>`)
  .replace(stylesheet[0], () => `<style>${css}</style>`)
  .replace('href="/favicon.svg"', `href="data:image/svg+xml;base64,${favicon.toString('base64')}"`);
// Meta policies also work on GitHub Pages, which has no per-repository custom
// response headers. frame-ancestors/HSTS must be configured at the hosting layer.
html=html.replace(/(<meta charset="UTF-8"\s*\/?>)/i,`$1\n    <meta name="referrer" content="no-referrer" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
await writeFile(resolve(root, 'index.html'), html);
await writeFile(resolve(root, 'Teamhub.html'), html);
// Dedicated, fresh entry URL for staff; authentication redirects keep the
// existing allowlisted app root.
await writeFile(resolve(root, 'login.html'), html);
console.log(`Standalone preview: dist/Teamhub.html (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
