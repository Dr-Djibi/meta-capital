import fs from 'node:fs';
import zlib from 'node:zlib';

const width = 1024;
const height = 1024;
const pixels = Buffer.alloc(width * height * 4);

function color(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
}

function setPixel(x, y, rgba) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const index = (y * width + x) * 4;
  pixels[index] = rgba[0];
  pixels[index + 1] = rgba[1];
  pixels[index + 2] = rgba[2];
  pixels[index + 3] = rgba[3];
}

function circle(cx, cy, radius, rgba) {
  const radiusSquared = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radiusSquared) setPixel(x, y, rgba);
    }
  }
}

function strokeCircle(cx, cy, radius, thickness, rgba) {
  const outer = radius * radius;
  const inner = (radius - thickness) ** 2;
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const distance = (x - cx) ** 2 + (y - cy) ** 2;
      if (distance <= outer && distance >= inner) setPixel(x, y, rgba);
    }
  }
}

function line(x1, y1, x2, y2, thickness, rgba) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i += 1) {
    const progress = steps === 0 ? 0 : i / steps;
    circle(Math.round(x1 + (x2 - x1) * progress), Math.round(y1 + (y2 - y1) * progress), thickness / 2, rgba);
  }
}

const background = color('#08111f');
const panel = color('#10233b');
const teal = color('#35d6b2');
const blue = color('#60a5fa');
pixels.fill(0);
for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) setPixel(x, y, background);
circle(512, 512, 360, panel);
strokeCircle(512, 512, 270, 34, teal);
line(350, 660, 350, 470, 42, blue);
line(350, 660, 470, 660, 42, blue);
line(470, 660, 470, 400, 42, teal);
line(470, 660, 590, 660, 42, teal);
line(590, 660, 590, 330, 42, teal);
line(590, 330, 730, 330, 42, teal);
line(730, 330, 690, 290, 42, teal);
line(730, 330, 690, 370, 42, teal);

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  let value = 0xffffffff;
  for (const byte of Buffer.concat([typeBuffer, data])) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  crc.writeUInt32BE((value ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

const rows = [];
for (let y = 0; y < height; y += 1) rows.push(Buffer.concat([Buffer.from([0]), pixels.subarray(y * width * 4, (y + 1) * width * 4)]));
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk('IHDR', (() => { const data = Buffer.alloc(13); data.writeUInt32BE(width, 0); data.writeUInt32BE(height, 4); data[8] = 8; data[9] = 6; return data; })()),
  pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
  pngChunk('IEND', Buffer.alloc(0)),
]);

fs.mkdirSync('assets/images', { recursive: true });
fs.writeFileSync('assets/images/meta-capital-icon.png', png);
fs.writeFileSync('assets/images/meta-capital-splash.png', png);
console.log('Generated Meta Capital icon assets.');
