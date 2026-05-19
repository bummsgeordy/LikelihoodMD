import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const distPath = join(process.cwd(), 'dist');
const indexPath = join(distPath, 'index.html');
const infoPath = join(distPath, 'info', 'vierfeldertafel', 'index.html');
const manifestPath = join(distPath, 'manifest.webmanifest');
const serviceWorkerPath = join(distPath, 'sw.js');
const icon192Path = join(distPath, 'icons', 'icon-192.png');
const icon512Path = join(distPath, 'icons', 'icon-512.png');
if (!existsSync(indexPath)) {
  console.error('dist/index.html fehlt. Bitte zuerst npm run build ausführen.');
  process.exit(1);
}

if (!existsSync(infoPath)) {
  console.error('dist/info/vierfeldertafel/index.html fehlt. Die Info-Unterseite wurde nicht in den Pages-Build kopiert.');
  process.exit(1);
}

for (const [filePath, label] of [
  [manifestPath, 'manifest.webmanifest'],
  [serviceWorkerPath, 'sw.js'],
  [icon192Path, 'icons/icon-192.png'],
  [icon512Path, 'icons/icon-512.png']
]) {
  if (!existsSync(filePath)) {
    console.error(`dist/${label} fehlt. Die PWA-Dateien wurden nicht in den Pages-Build kopiert.`);
    process.exit(1);
  }
}

const html = readFileSync(indexPath, 'utf8');
if (html.includes('/src/main.ts') || html.includes('src/main.ts')) {
  console.error('dist/index.html referenziert noch src/main.ts statt gebauter Assets.');
  process.exit(1);
}

if (!html.includes('./assets/')) {
  console.error('dist/index.html enthält keine relativen ./assets/-Referenzen für GitHub Pages.');
  process.exit(1);
}

if (!html.includes('./manifest.webmanifest') || !html.includes('./icons/apple-touch-icon.png')) {
  console.error('dist/index.html enthält nicht die erwarteten PWA-/iOS-Metadaten.');
  process.exit(1);
}

const infoHtml = readFileSync(infoPath, 'utf8');
if (!infoHtml.includes('Diagnostische Kennzahlen verstehen') || !infoHtml.includes('Vierfeldertafel diagnostischer Tests')) {
  console.error('Info-Unterseite enthält nicht die erwarteten Inhalte.');
  process.exit(1);
}

const manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes('"display": "standalone"') || !manifest.includes('./icons/icon-192.png')) {
  console.error('manifest.webmanifest enthält nicht die erwarteten PWA-Angaben.');
  process.exit(1);
}

const serviceWorker = readFileSync(serviceWorkerPath, 'utf8');
if (!serviceWorker.includes('CACHE_VERSION') || !serviceWorker.includes('precacheApp')) {
  console.error('sw.js enthält nicht die erwartete Offline-Cache-Logik.');
  process.exit(1);
}

console.log('GitHub-Pages-Build geprüft: relative Assets, Info-Unterseite und PWA-Dateien sind vorhanden.');
