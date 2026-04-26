/**
 * Regenerate public/og-image.png from public/og-image.svg.
 *
 * Run with: npm run og:gen
 *
 * The PNG is what gets served as og:image to social-network crawlers
 * (Twitter, Facebook, iMessage…) since most don't support SVG og images.
 * The SVG is the canonical source — edit it then re-run this script.
 */

import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, "../public/og-image.svg");
const pngPath = resolve(__dirname, "../public/og-image.png");

const svg = readFileSync(svgPath, "utf-8");
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: { loadSystemFonts: true },
});
const pngData = resvg.render();
writeFileSync(pngPath, pngData.asPng());

const size = statSync(pngPath).size;
console.log(`✓ og-image.png written (${(size / 1024).toFixed(1)} KB, 1200×630)`);
