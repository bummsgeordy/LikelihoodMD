import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const indexPath = join(process.cwd(), 'dist', 'index.html');
if (!existsSync(indexPath)) {
  console.error('dist/index.html fehlt. Bitte zuerst npm run build ausführen.');
  process.exit(1);
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

console.log('GitHub-Pages-Build geprüft: dist/index.html nutzt gebaute relative Assets.');
