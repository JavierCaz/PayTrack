// Generates the PayTrack logo SVGs and every app icon PNG from a single source.
// Requires ImageMagick 7 (`magick`) built with librsvg.
// Usage: node scripts/generate-icons.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = join(root, 'assets', 'images');
const logoDir = join(root, 'assets', 'logo');
mkdirSync(logoDir, { recursive: true });

const BRAND = '#4F46E5';
const C = {
  crust: '#F6B941',
  crustEdge: '#C46F14',
  cut: '#E8473F', // filling visible at the cut slice
  ink: '#1E1B4B',
  white: '#FFFFFF',
  shoe: '#FFFFFF',
};

// Pie geometry (1024 canvas): body is a pie chart with one slice exploded out.
const cx = 500, cy = 440, r = 250;
const rad = (d) => (d * Math.PI) / 180;
const pt = (a, rr = r, ox = 0, oy = 0) => [cx + ox + rr * Math.cos(rad(a)), cy + oy + rr * Math.sin(rad(a))].map((n) => n.toFixed(1)).join(',');
const sliceFrom = -90, sliceTo = -30;
const off = 42, mid = rad((sliceFrom + sliceTo) / 2);
const ox = off * Math.cos(mid), oy = off * Math.sin(mid);
const bodyPath = `M${cx},${cy} L${pt(sliceTo)} A${r},${r} 0 1,1 ${pt(sliceFrom)} Z`;
const slicePath = `M${(cx + ox).toFixed(1)},${(cy + oy).toFixed(1)} L${pt(sliceFrom, r, ox, oy)} A${r},${r} 0 0,1 ${pt(sliceTo, r, ox, oy)} Z`;

// In mono mode the face is punched out of the body with a mask so it stays readable.
function character({ mono = false } = {}) {
  const fill = (c) => (mono ? C.white : c);
  const limb = mono ? C.white : C.ink;
  return `
  <g stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- speed lines -->
    <g stroke="${C.white}" stroke-width="26" opacity="${mono ? 1 : 0.75}">
      <path d="M70 340 H190"/><path d="M40 450 H200"/><path d="M90 560 H200"/>
    </g>
    <!-- back limbs -->
    <path d="M300 520 L215 455 L185 515" stroke="${limb}" stroke-width="30"/>
    <path d="M440 670 L380 775 L285 770" stroke="${limb}" stroke-width="34"/>
  </g>
  ${mono ? '' : `<ellipse cx="470" cy="905" rx="230" ry="22" fill="#000" opacity="0.18"/>`}
  <g stroke-linejoin="round" ${mono ? 'mask="url(#face)"' : ''}>
    <path d="${bodyPath}" fill="${fill(C.crust)}" stroke="${fill(C.crustEdge)}" stroke-width="${mono ? 0 : 22}"/>
    <path d="${slicePath}" fill="${fill(C.crust)}" stroke="${fill(C.crustEdge)}" stroke-width="${mono ? 0 : 22}"/>
  </g>
  ${mono ? '' : `
  <!-- filling peeking out of the cut -->
  <path d="M${cx},${cy} L${pt(sliceTo, r - 14)}" stroke="${C.cut}" stroke-width="12" stroke-linecap="round"/>
  <path d="M${cx},${cy} L${pt(sliceFrom, r - 14)}" stroke="${C.cut}" stroke-width="12" stroke-linecap="round"/>`}
  ${mono ? '' : faceShapes()}
  <g stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- front limbs -->
    <path d="M560 668 L655 735 L630 835" stroke="${limb}" stroke-width="34"/>
    <path d="M735 520 L815 560 L850 495" stroke="${limb}" stroke-width="30"/>
  </g>
  <!-- shoes & gloves -->
  <g fill="${fill(C.shoe)}" stroke="${limb}" stroke-width="12">
    <path d="M600 820 h70 a30 30 0 0 1 30 30 v6 h-110 z"/>
    <path d="M255 755 h70 a30 30 0 0 1 30 30 v6 h-110 z" transform="rotate(55 285 770)"/>
    <circle cx="185" cy="520" r="24"/>
    <circle cx="852" cy="488" r="24"/>
  </g>`;
}

function faceShapes(color) {
  const ink = color ?? C.ink;
  const eye = color ?? C.white;
  return `
    <ellipse cx="395" cy="455" rx="36" ry="44" fill="${eye}"/>
    <ellipse cx="510" cy="465" rx="36" ry="44" fill="${eye}"/>
    <circle cx="410" cy="462" r="17" fill="${ink}"/>
    <circle cx="525" cy="472" r="17" fill="${ink}"/>
    <path d="M355 395 L425 410 M480 415 L550 410" stroke="${ink}" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M405 545 q55 48 115 4" stroke="${ink}" stroke-width="16" stroke-linecap="round" fill="${color ? 'none' : '#8E2B22'}"/>`;
}

// Visual center of the character, used to center it on each canvas.
const ART_CX = 455, ART_CY = 525;

function svg({ size = 1024, scale = 1, background = null, rounded = false, mono = false }) {
  const tx = size / 2 - ART_CX * scale, ty = size / 2 - ART_CY * scale;
  const bg = background
    ? `<rect width="${size}" height="${size}" ${rounded ? `rx="${size * 0.22}"` : ''} fill="${background}"/>`
    : '';
  const defs = mono
    ? `<defs><mask id="face" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
        <rect width="1024" height="1024" fill="#fff"/>${faceShapes('#000')}</mask></defs>`
    : '';
  const art = character({ mono });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${defs}${bg}
<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${scale})">${art}</g>
</svg>
`;
}

function render(name, svgText, px) {
  const src = join(logoDir, `${name}.svg`);
  writeFileSync(src, svgText);
  return (out, size = px) => {
    execFileSync('magick', ['-background', 'none', '-density', '300', src, '-resize', `${size}x${size}`, '-strip', join(imagesDir, out)]);
    console.log(`✓ ${out} (${size}px)`);
  };
}

// iOS / generic icon: full-bleed brand square (OS applies the mask).
render('icon', svg({ scale: 0.86, background: BRAND }), 1024)('icon.png');
// Standalone mark on transparent background (splash, docs, marketing).
const logo = render('logo', svg({ scale: 0.9 }), 1024);
logo('splash-icon.png', 1024);
// In-app logo (Settings > About).
logo('logo.png', 256);
// Favicon: rounded brand square.
render('favicon', svg({ scale: 0.9, background: BRAND, rounded: true }), 48)('favicon.png', 48);
// Android adaptive icon: foreground must sit inside the ~66% safe zone.
render('android-foreground', svg({ scale: 0.66 }), 1024)('android-icon-foreground.png', 512);
render('android-background', `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BRAND}"/></svg>`, 1024)('android-icon-background.png', 512);
render('android-monochrome', svg({ scale: 0.66, mono: true }), 1024)('android-icon-monochrome.png', 432);
