import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const manifest = JSON.parse(
  fs.readFileSync("dist/.vite/manifest.json", "utf8"),
);
for (const entry of ["index.html", "simulation/index.html"]) {
  const files = new Set();
  const visit = (key) => {
    const chunk = manifest[key];
    if (!chunk) throw new Error("Bundle-Verweis fehlt: " + key);
    if (files.has(chunk.file)) return;
    files.add(chunk.file);
    (chunk.imports ?? []).forEach(visit);
  };
  visit(entry);
  const sizes = [...files].map((file) =>
    fs.readFileSync(path.join("dist", file)),
  );
  const raw = sizes.reduce((sum, b) => sum + b.byteLength, 0),
    gzip = sizes.reduce((sum, b) => sum + gzipSync(b).byteLength, 0);
  if (raw > 600000 || gzip > 120000)
    throw new Error(
      entry +
        ": initialer statischer Importgraph überschreitet 600000/120000 B: " +
        raw +
        "/" +
        gzip,
    );
  console.log(
    entry +
      ": " +
      raw +
      " B roh, " +
      gzip +
      " B gzip; " +
      files.size +
      " statisch benötigte JS-Dateien.",
  );
}
if (fs.readdirSync("dist/assets").some((f) => f.endsWith(".map")))
  throw new Error("Produktions-Sourcemaps gefunden.");
