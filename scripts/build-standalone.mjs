// Produces a single self-contained HTML file: the whole app (all JS modules
// bundled into one plain script, no ES module imports) plus the compiled
// Tailwind CSS and the vendored JSZip, all inlined. This avoids the
// `file://` restriction that blocks cross-file <script type="module">
// imports, so the result can be emailed, put on a USB stick, or just
// double-clicked — no server, no hosting, no install.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const bundleResult = await build({
  entryPoints: [path.join(root, 'js/app.js')],
  bundle: true,
  format: 'iife',
  write: false,
  minify: true,
  legalComments: 'none',
});
const appJS = bundleResult.outputFiles[0].text;

const tailwindCSS = fs.readFileSync(path.join(root, 'css/tailwind.css'), 'utf-8');
const jszipJS = fs.readFileSync(path.join(root, 'vendor/jszip.min.js'), 'utf-8');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>GameForge Studio (Standalone)</title>
<meta name="description" content="A complete browser-based game design & development studio. Fully self-contained: no backend, no account, no network calls, no server required — just open this file." />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎮</text></svg>" />
<style>
${tailwindCSS}
</style>
</head>
<body>
<div id="app"></div>
<div id="toast-root" class="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 items-end"></div>
<div id="modal-root"></div>
<script>
${jszipJS}
</script>
<script>
${appJS}
</script>
</body>
</html>
`;

const outPath = path.join(root, 'gameforge-standalone.html');
fs.writeFileSync(outPath, html);
const sizeKB = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`Wrote ${outPath} (${sizeKB} KB)`);
