// Hand-authored SVG art: fruits for the skewer, the mystery egg, icons.
// One stroke language: chocolate outline (#5B2C1E), 2.5 stroke, white gloss blob.
const INK = '#5B2C1E';
const gloss = (cx, cy, rx = 5, ry = 3.4, rot = -30) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#fff" opacity=".85"/>`;

// Each fruit is drawn in a 48x48 box, centred on the skewer line (y = 24).
export const FRUITS = [
  { name: 'Strawberry', svg: `
    <path d="M24 9c-3-3-8-3-10 0 3 0 5 1 6 3-5 1-10 6-10 13 0 9 7 15 14 15s14-6 14-15c0-7-5-12-10-13 1-2 3-3 6-3-2-3-7-3-10 0z" fill="#EF3E5C" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M17 11c2 2 4 3 7 3s5-1 7-3" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M18 10l6 4 6-4-3-2-3 2-3-2z" fill="#5CC489" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <g fill="#FFE07A"><circle cx="19" cy="24" r="1.3"/><circle cx="29" cy="23" r="1.3"/><circle cx="24" cy="29" r="1.3"/><circle cx="18" cy="32" r="1.3"/><circle cx="30" cy="31" r="1.3"/></g>
    ${gloss(18, 19)}` },
  { name: 'Mandarin', svg: `
    <circle cx="24" cy="25" r="14" fill="#FF9F45" stroke="${INK}" stroke-width="2.5"/>
    <path d="M24 11c1-3 4-4 7-3-1 3-4 4-7 3z" fill="#5CC489" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <g fill="#E07A22"><circle cx="30" cy="30" r="1"/><circle cx="20" cy="31" r="1"/><circle cx="27" cy="20" r="1"/></g>
    ${gloss(18, 19)}` },
  { name: 'Grape', svg: `
    <circle cx="24" cy="25" r="13" fill="#A98BEA" stroke="${INK}" stroke-width="2.5"/>
    <path d="M24 12c0-3 1-5 3-6" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M30 31c-2 2-5 3-8 2" fill="none" stroke="#7C5FC9" stroke-width="2" stroke-linecap="round"/>
    ${gloss(19, 19)}` },
  { name: 'Kiwi', svg: `
    <circle cx="24" cy="25" r="14" fill="#8ED26C" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="24" cy="25" r="5" fill="#F4F7D9"/>
    <g fill="${INK}"><circle cx="24" cy="16.5" r="1.1"/><circle cx="32" cy="22" r="1.1"/><circle cx="31" cy="31" r="1.1"/><circle cx="24" cy="33.5" r="1.1"/><circle cx="17" cy="31" r="1.1"/><circle cx="16" cy="22" r="1.1"/></g>
    ${gloss(17, 18, 4, 2.6)}` },
  { name: 'Blueberry', svg: `
    <circle cx="24" cy="25" r="12.5" fill="#5D7FE0" stroke="${INK}" stroke-width="2.5"/>
    <path d="M21 14l3 2 3-2-1 3-2 1-2-1z" fill="#3D58B0" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    ${gloss(19, 20)}` },
  { name: 'Melon', svg: `
    <rect x="11" y="12" width="26" height="26" rx="9" fill="#9BE3B8" stroke="${INK}" stroke-width="2.5"/>
    <path d="M16 19c3 3 13 3 16 0M16 27c3 3 13 3 16 0" fill="none" stroke="#5FBF88" stroke-width="2" stroke-linecap="round"/>
    ${gloss(18, 18)}` },
];

export const fruitSVG = (i, extra = '') =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" ${extra}>${FRUITS[i % FRUITS.length].svg}</svg>`;

// Empty slot on the skewer: dashed sticker outline.
export const emptySlot = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="25" r="13" fill="#FFF8F2" stroke="#C99A86" stroke-width="2.5" stroke-dasharray="4 4"/></svg>`;

// Egg coloured by rarity: { base, spots: [a, b, c] }.
export const eggArt = ({ base = '#FFF6E8', spots = ['#7FD8A6', '#FFD44F', '#5D7FE0'] } = {}) => `
<svg viewBox="0 0 64 76" aria-hidden="true">
  <ellipse cx="32" cy="70" rx="18" ry="4" fill="#5B2C1E" opacity=".12"/>
  <path d="M32 4C18 4 8 26 8 44c0 15 11 25 24 25s24-10 24-25C56 26 46 4 32 4z" fill="${base}" stroke="${INK}" stroke-width="3"/>
  <circle cx="22" cy="30" r="5" fill="${spots[0]}"/><circle cx="40" cy="24" r="3.5" fill="${spots[1]}"/>
  <circle cx="42" cy="46" r="6" fill="${spots[2]}"/><circle cx="21" cy="52" r="3.5" fill="${spots[0]}"/>
  <circle cx="33" cy="38" r="2.5" fill="${spots[1]}"/>
  <ellipse cx="20" cy="18" rx="6" ry="3.5" transform="rotate(-35 20 18)" fill="#fff"/>
</svg>`;

export const coinSVG = `
<svg viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="13" fill="#FFD44F" stroke="${INK}" stroke-width="2.5"/>
  <circle cx="16" cy="16" r="8" fill="none" stroke="#E9A92A" stroke-width="2"/>
  <path d="M14 12.5c1-1.2 3-1.2 4 0M16 11v10" stroke="#C9821C" stroke-width="2" stroke-linecap="round" fill="none"/>
  <ellipse cx="11" cy="10" rx="3" ry="1.8" transform="rotate(-35 11 10)" fill="#fff" opacity=".9"/>
</svg>`;

const icon = (d, extra = '') =>
  `<svg viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`;

export const ICONS = {
  home: icon('<path d="M4 13 14 5l10 8"/><path d="M7 11v12h14V11"/><path d="M12 23v-6h4v6"/>'),
  pets: icon('<ellipse cx="14" cy="18.5" rx="5.5" ry="4.5"/><circle cx="7.5" cy="12" r="2.2"/><circle cx="20.5" cy="12" r="2.2"/><circle cx="11" cy="7.5" r="2.2"/><circle cx="17" cy="7.5" r="2.2"/>'),
  shop: icon('<path d="M9 4 4 8l3 4 2-1v13h10V11l2 1 3-4-5-4c-1 2-3 3-5 3s-4-1-5-3z"/>'),
  quests: icon('<path d="M14 3.5l3 6.3 6.8.8-5 4.7 1.3 6.8L14 18.8l-6.1 3.3 1.3-6.8-5-4.7 6.8-.8z"/>'),
  ranks: icon('<path d="M9 4h10v6a5 5 0 0 1-10 0z"/><path d="M9 6H5a4 4 0 0 0 4 5M19 6h4a4 4 0 0 1-4 5"/><path d="M14 15v4M10 24h8M11 24c0-3 1-5 3-5s3 2 3 5"/>'),
  // Two footprints (big front pad + small heel), filled so they read as steps, not '0_0' (kid dry view, 17 Nov).
  feet: icon('<g fill="currentColor" stroke="none"><ellipse cx="8.6" cy="11" rx="3.5" ry="5" transform="rotate(-12 8.6 11)"/><ellipse cx="7.6" cy="20.6" rx="2.5" ry="2.8"/><ellipse cx="19.6" cy="6.6" rx="3.5" ry="5" transform="rotate(12 19.6 6.6)"/><ellipse cx="20.6" cy="16.2" rx="2.5" ry="2.8"/></g>'),
  me: icon('<circle cx="14" cy="9.5" r="4.5"/><path d="M5.5 24c.8-5 4.2-7.5 8.5-7.5s7.7 2.5 8.5 7.5"/>'),
  crown: icon('<path d="M5 21h18M6 18 4.5 8.5l5.5 4.5L14 6l4 7 5.5-4.5L22 18z"/>'),
  chevron: icon('<path d="M11 7l7 7-7 7"/>'),
  clock: icon('<circle cx="14" cy="15" r="9"/><path d="M14 10v5l3 2"/><path d="M11 3h6"/>'),
  back: icon('<path d="M17 7l-7 7 7 7"/>'),
  shield: icon('<path d="M14 3l9 3v7c0 6-4 10-9 12-5-2-9-6-9-12V6z"/><path d="M10 14l3 3 5-6"/>'),
  bell: icon('<path d="M8 19V13a6 6 0 0 1 12 0v6l2 2H6z"/><path d="M12 24a2 2 0 0 0 4 0"/>'),
};
