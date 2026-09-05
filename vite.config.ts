import { defineConfig } from "vite";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "revisioned-offline-assets",
      writeBundle() {
        const assets = readdirSync("dist/assets")
          .filter((name) => !name.endsWith(".map"))
          .sort()
          .map((name) => "./assets/" + name);
        const shell = [
          "index.html",
          "simulation/index.html",
          "info/ckd-risiko/index.html",
          "info/vierfeldertafel/index.html",
          "favicon.svg",
          "manifest.webmanifest",
          "icons/icon-192.png",
          "icons/icon-512.png",
          "icons/apple-touch-icon.png",
        ];
        const hash = createHash("sha256");
        for (const file of [...assets, ...shell]) {
          hash.update(file).update(readFileSync("dist/" + file));
        }
        hash.update(readFileSync("public/sw.js"));
        const revision = hash.digest("hex").slice(0, 16);
        const worker = readFileSync("public/sw.js", "utf8")
          .replace("'development-v7'", JSON.stringify(revision))
          .replace(
            "const BUILD_ASSETS = [];",
            "const BUILD_ASSETS = " + JSON.stringify(assets) + ";",
          );
        writeFileSync("dist/sw.js", worker);
      },
    },
  ],
  build: {
    manifest: true,
    rollupOptions: {
      input: { main: "index.html", simulation: "simulation/index.html" },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
  },
});
