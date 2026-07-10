import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const assetsDirectory = path.join(process.cwd(), 'dist', 'assets');
const mainBundles = fs
  .readdirSync(assetsDirectory)
  .filter(file => /^index-.*\.js$/.test(file));

if (mainBundles.length !== 1) {
  throw new Error(`Genau ein initiales JavaScript-Bundle erwartet, gefunden: ${mainBundles.length}.`);
}

const bundle = fs.readFileSync(path.join(assetsDirectory, mainBundles[0]));
const rawLimit = 600_000;
const gzipLimit = 120_000;
const gzipBytes = gzipSync(bundle).byteLength;

if (bundle.byteLength > rawLimit || gzipBytes > gzipLimit) {
  throw new Error(
    `Initialbundle überschreitet das Budget: ${bundle.byteLength} B roh, ${gzipBytes} B gzip; erlaubt ${rawLimit}/${gzipLimit} B.`
  );
}

console.log(`Bundle-Budget eingehalten: ${bundle.byteLength} B roh, ${gzipBytes} B gzip.`);
