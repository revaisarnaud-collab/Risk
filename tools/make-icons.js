// Génère assets/icon-192.png et assets/icon-512.png sans aucune dépendance.
// Lancer avec : npm run icons
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const INK = hex('#1b1309');
const BRASS = hex('#c9a24a');
const RED = hex('#a3201b');
const BLUE = hex('#1f4597');
const IVORY = hex('#f3e6c8');
const PIPS = { 3: [2, 4, 6], 5: [0, 2, 4, 6, 8] };

function roundedBox(px, py, half, r) {
  const qx = Math.abs(px) - half + r;
  const qy = Math.abs(py) - half + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

// Couleur d'un dé (ou null) au point (x, y), coordonnées 0..1.
function die(x, y, cx, cy, angle, color, value) {
  const c = Math.cos(-angle), s = Math.sin(-angle);
  const px = (x - cx) * c - (y - cy) * s;
  const py = (x - cx) * s + (y - cy) * c;
  const half = 0.17;
  const d = roundedBox(px, py, half, 0.045);
  if (d > 0.012) return null;
  if (d > 0) return INK; // liseré sombre autour du dé
  for (const i of PIPS[value]) {
    const gx = ((i % 3) - 1) * 0.095;
    const gy = (Math.floor(i / 3) - 1) * 0.095;
    if (Math.hypot(px - gx, py - gy) < 0.032) return IVORY;
  }
  return color;
}

function colorAt(x, y) {
  const r = Math.hypot(x - 0.5, y - 0.5);
  let col = INK;
  if (r > 0.4 && r < 0.425) col = BRASS;
  return (
    die(x, y, 0.6, 0.6, 0.18, BLUE, 3) ??
    die(x, y, 0.4, 0.4, -0.22, RED, 5) ??
    col
  );
}

function render(size) {
  const SS = 4;
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colorAt((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
        }
      }
      for (let k = 0; k < 3; k++) row[1 + px * 3 + k] = Math.round(acc[k] / (SS * SS));
    }
    rows.push(row);
  }
  return png(size, Buffer.concat(rows));
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits par canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../assets/icon-${size}.png`, import.meta.url), render(size));
  console.log(`assets/icon-${size}.png`);
}
