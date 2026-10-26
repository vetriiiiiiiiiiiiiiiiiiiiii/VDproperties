// Generates web assets from the official logo (brand/vd-properties-logo.png):
// transparent full logo, emblem-only mark, favicon and Apple touch icon.
// Run again after replacing the source file: `node scripts/brand-assets.mjs`
import sharp from "sharp";

const SRC = "brand/vd-properties-logo.png";
const MARK_ROWS = [40, 712]; // emblem sits above the wordmark in the source artwork

/** "Colour to alpha": removes the white background while keeping soft, anti-aliased edges. */
async function whiteToAlpha(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const a = Math.min(1, (255 - Math.min(r, g, b)) / 255 * 1.6);
    if (a <= 0.02) {
      data[i + 3] = 0;
      continue;
    }
    // Un-mix white so colours stay saturated at the edges.
    data[i] = Math.max(0, Math.min(255, (r - 255 * (1 - a)) / a));
    data[i + 1] = Math.max(0, Math.min(255, (g - 255 * (1 - a)) / a));
    data[i + 2] = Math.max(0, Math.min(255, (b - 255 * (1 - a)) / a));
    data[i + 3] = Math.round(a * 255);
  }
  return sharp(data, { raw: info }).png();
}

const meta = await sharp(SRC).metadata();
const transparent = await (await whiteToAlpha(SRC)).toBuffer();

await sharp(transparent).trim({ threshold: 1 }).resize({ width: 1200 }).png({ compressionLevel: 9 }).toFile("public/brand/vd-logo.png");
await sharp(transparent).trim({ threshold: 1 }).resize({ width: 640 }).webp({ quality: 90 }).toFile("public/brand/vd-logo.webp");

const mark = await sharp(transparent)
  .extract({ left: 0, top: MARK_ROWS[0], width: meta.width, height: MARK_ROWS[1] - MARK_ROWS[0] })
  .png()
  .toBuffer();
await sharp(mark).trim({ threshold: 1 }).resize({ height: 400 }).png({ compressionLevel: 9 }).toFile("public/brand/vd-mark.png");
await sharp(mark).trim({ threshold: 1 }).resize({ height: 200 }).webp({ quality: 90 }).toFile("public/brand/vd-mark.webp");

// Square icons on a white tile, so the colourful mark reads on any browser chrome.
const tile = async (size, out) => {
  const inner = await sharp(mark).trim({ threshold: 1 }).resize({ width: Math.round(size * 0.86), height: Math.round(size * 0.86), fit: "inside" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } }).composite([{ input: inner, gravity: "center" }]).png().toFile(out);
};
await tile(512, "src/app/icon.png");
await tile(180, "src/app/apple-icon.png");
console.log("Brand assets written to public/brand and src/app");
