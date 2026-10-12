// 生成 App 图标、PWA 图标与 iOS 启动图：node scripts/gen-icons.mjs
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');

function iconSvg({ rounded = false } = {}) {
  const r = rounded ? 230 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF8F45"/>
      <stop offset="1" stop-color="#FF4527"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#8a1a00" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" rx="${r}" fill="url(#bg)"/>
  <rect width="1024" height="1024" rx="${r}" fill="url(#shine)"/>
  <g transform="translate(512 512) rotate(-35) scale(1.2) translate(-512 -512)" fill="#ffffff" filter="url(#sh)">
    <rect x="300" y="490" width="424" height="44" rx="22"/>
    <rect x="336" y="362" width="66" height="300" rx="30"/>
    <rect x="622" y="362" width="66" height="300" rx="30"/>
    <rect x="262" y="414" width="58" height="196" rx="26"/>
    <rect x="704" y="414" width="58" height="196" rx="26"/>
    <rect x="228" y="480" width="40" height="64" rx="16"/>
    <rect x="756" y="480" width="40" height="64" rx="16"/>
  </g>
</svg>`;
}

function splashSvg(w, h, dark) {
  const size = Math.round(w * 0.24);
  const x = Math.round((w - size) / 2);
  const y = Math.round((h - size) / 2 - h * 0.04);
  const bg = dark ? '#000000' : '#F2F2F7';
  const inner = iconSvg({ rounded: true })
    .replace('<svg ', `<svg x="${x}" y="${y}" width="${size}" height="${size}" `)
    .replace(/ width="1024" height="1024"(?=>)/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${bg}"/>
  ${inner}
</svg>`;
}

async function png(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
}

await mkdir(path.join(pub, 'splash'), { recursive: true });

await writeFile(path.join(pub, 'favicon.svg'), iconSvg({ rounded: true }));
await png(iconSvg(), 180, path.join(pub, 'apple-touch-icon.png'));
await png(iconSvg(), 192, path.join(pub, 'pwa-192.png'));
await png(iconSvg(), 512, path.join(pub, 'pwa-512.png'));
await png(iconSvg(), 512, path.join(pub, 'pwa-maskable-512.png'));

const splashSizes = [
  [1320, 2868],
  [1290, 2796],
  [1206, 2622],
  [1179, 2556],
  [1170, 2532],
];
for (const [w, h] of splashSizes) {
  for (const dark of [true, false]) {
    const file = path.join(pub, 'splash', `splash-${w}x${h}-${dark ? 'dark' : 'light'}.png`);
    await sharp(Buffer.from(splashSvg(w, h, dark))).png({ compressionLevel: 9, palette: true }).toFile(file);
  }
}

console.log('icons & splash generated');
