import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'dist');
const indexPath = path.join(outputRoot, 'index.html');

function requireFile(relativePath) {
  const resolved = path.resolve(outputRoot, relativePath);
  if (!resolved.startsWith(outputRoot + path.sep) || !existsSync(resolved)) {
    throw new Error(`Missing deploy asset: ${relativePath}`);
  }
  return resolved;
}

const html = readFileSync(requireFile('index.html'), 'utf8');
if (html.includes('/src/main.jsx')) {
  throw new Error('Vite source entry is still referenced in dist/index.html');
}
if (!/<script\b[^>]*type="module"[^>]*src="\/assets\/[^\"]+\.js"/.test(html)) {
  throw new Error('Compiled Vite JavaScript entry is missing from dist/index.html');
}

const kitScript = html.indexOf('<script src="/diamonds-kit.js"></script>');
const appScript = html.search(/<script\b[^>]*type="module"[^>]*src="\/assets\//);
if (kitScript < 0 || kitScript > appScript) {
  throw new Error('Diamonds kit must load synchronously before the React entry');
}

for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(\/[^"]+)"/g)) {
  const assetPath = decodeURIComponent(match[1].split(/[?#]/, 1)[0]).slice(1);
  requireFile(assetPath);
}

const manifest = JSON.parse(readFileSync(requireFile('manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons ?? []) {
  requireFile(icon.src.replace(/^\//, ''));
}

const redirects = readFileSync(requireFile('_redirects'), 'utf8').trim();
if (redirects !== '/* /index.html 200') {
  throw new Error('Netlify SPA redirect is missing or invalid');
}

console.log('Deploy output verified: compiled JavaScript, public assets, and SPA redirect are present.');
