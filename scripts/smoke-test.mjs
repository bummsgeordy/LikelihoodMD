import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const indexPath = path.join(dist, 'index.html');
const infoPath = path.join(dist, 'info', 'vierfeldertafel', 'index.html');

if (!fs.existsSync(indexPath)) throw new Error('dist/index.html fehlt. Bitte zuerst npm run build ausführen.');
if (!fs.existsSync(infoPath)) throw new Error('Info-Unterseite fehlt im dist-Build.');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
if (indexHtml.includes('/src/main.ts')) throw new Error('dist/index.html referenziert /src/main.ts.');
if (!indexHtml.includes('./assets/')) throw new Error('dist/index.html nutzt keine relativen Assets.');

const server = http.createServer((request, response) => {
  const requestUrl = request.url === '/' ? '/index.html' : decodeURIComponent(request.url ?? '/index.html');
  let filePath = path.normalize(path.join(dist, requestUrl));
  if (!filePath.startsWith(dist)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200);
  response.end(fs.readFileSync(filePath));
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
try {
  const appResponse = await fetch(`http://127.0.0.1:${port}/`);
  const infoResponse = await fetch(`http://127.0.0.1:${port}/info/vierfeldertafel/`);
  if (!appResponse.ok) throw new Error(`Startseite liefert HTTP ${appResponse.status}.`);
  if (!infoResponse.ok) throw new Error(`Info-Seite liefert HTTP ${infoResponse.status}.`);
  const appText = await appResponse.text();
  const infoText = await infoResponse.text();
  if (!appText.includes('Likelihood-Ratio-Rechner')) throw new Error('Startseite enthält keinen App-Titel.');
  if (!infoText.includes('Diagnostische Kennzahlen verstehen')) throw new Error('Info-Seite enthält keinen erwarteten Titel.');
  console.log('Smoke-Test bestanden: Startseite, Assets und Info-Unterseite sind erreichbar.');
} finally {
  server.close();
}
