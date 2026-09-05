import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const distPath = join(process.cwd(), 'dist');
const indexPath = join(distPath, 'index.html');
const infoPath = join(distPath, 'info', 'vierfeldertafel', 'index.html');
const ckdInfoPath = join(distPath, 'info', 'ckd-risiko', 'index.html');
const simulationPath = join(distPath, 'simulation', 'index.html');
const manifestPath = join(distPath, 'manifest.webmanifest');
const serviceWorkerPath = join(distPath, 'sw.js');
const faviconPath = join(distPath, 'favicon.svg');
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

if (!existsSync(ckdInfoPath)) {
  console.error('dist/info/ckd-risiko/index.html fehlt. Die CKD-Unterseite wurde nicht in den Pages-Build kopiert.');
  process.exit(1);
}

if (!existsSync(simulationPath)) {
  console.error('dist/simulation/index.html fehlt. Die Simulations-Unterseite wurde nicht in den Pages-Build kopiert.');
  process.exit(1);
}

for (const [filePath, label] of [
  [manifestPath, 'manifest.webmanifest'],
  [serviceWorkerPath, 'sw.js'],
  [faviconPath, 'favicon.svg'],
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

if (!html.includes('./manifest.webmanifest') || !html.includes('./icons/apple-touch-icon.png') || !html.includes('./favicon.svg')) {
  console.error('dist/index.html enthält nicht die erwarteten PWA-/iOS-Metadaten.');
  process.exit(1);
}

const infoHtml = readFileSync(infoPath, 'utf8');
if (!infoHtml.includes('Diagnostische Kennzahlen verstehen') || !infoHtml.includes('Vierfeldertafel diagnostischer Tests')) {
  console.error('Info-Unterseite enthält nicht die erwarteten Inhalte.');
  process.exit(1);
}

const ckdInfoHtml = readFileSync(ckdInfoPath, 'utf8');
if (!ckdInfoHtml.includes('CKD-Risiko nach eGFR und Albuminurie') || !ckdInfoHtml.includes('KDIGO')) {
  console.error('CKD-Unterseite enthält nicht die erwarteten Inhalte.');
  process.exit(1);
}

const simulationHtml = readFileSync(simulationPath, 'utf8');
if (!simulationHtml.includes('Interaktive Testsimulation') || !simulationHtml.includes('Reale Orientierungswerte')) {
  console.error('Simulations-Unterseite enthält nicht die erwarteten Inhalte.');
  process.exit(1);
}

const manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes('"display": "standalone"') || !manifest.includes('./icons/icon-192.png')) {
  console.error('manifest.webmanifest enthält nicht die erwarteten PWA-Angaben.');
  process.exit(1);
}

const serviceWorker = readFileSync(serviceWorkerPath, 'utf8');
if (serviceWorker.includes("'development-v7'") || serviceWorker.includes('const BUILD_ASSETS = [];')) {
  console.error('sw.js enthält noch Entwicklungsplatzhalter statt einer Revision und gebauter Offline-Assets.');
  process.exit(1);
}
if (!serviceWorker.includes('CACHE_VERSION') || !serviceWorker.includes('precacheApp')) {
  console.error('sw.js enthält nicht die erwartete Offline-Cache-Logik.');
  process.exit(1);
}

if (!serviceWorker.includes('./simulation/index.html') || !serviceWorker.includes('./info/ckd-risiko/index.html') || !serviceWorker.includes('./favicon.svg')) {
  console.error('sw.js enthält die Simulations-/CKD-Unterseite oder das Favicon nicht im App-Shell-Cache.');
  process.exit(1);
}

console.log('GitHub-Pages-Build geprüft: relative Assets, Info-/CKD-/Simulations-Unterseiten und PWA-Dateien sind vorhanden.');
