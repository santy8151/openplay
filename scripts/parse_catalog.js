const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '../catalog_raw.txt'), 'utf8');
const lines = raw.split('\n');

const items = [];
let currentLetter = '#';
let i = 0;

function guessCategory(title, url, source) {
  const combined = (title + ' ' + (url || '') + ' ' + (source || '')).toLowerCase();
  if (combined.includes('recomp')) return 'RECOMP';
  if (combined.includes('wasm') || combined.includes('emscripten')) return 'WASM';
  if (combined.includes('webgl') || combined.includes('three')) return 'WEBGL';
  if (combined.includes('ps2') || combined.includes('psp') || combined.includes('n64') || combined.includes('gamecube')) return 'EMULATOR';
  if (combined.includes('doom') || combined.includes('quake') || combined.includes('duke') || combined.includes('retro')) return 'RETRO';
  return 'WASM';
}

function guessTags(title, cat) {
  const t = title.toLowerCase();
  const tags = [cat];
  if (t.includes('doom') || t.includes('quake') || t.includes('strike') || t.includes('halo') || t.includes('call of duty')) tags.push('FPS');
  if (t.includes('mario') || t.includes('celeste') || t.includes('sonic') || t.includes('cuphead') || t.includes('hollow knight')) tags.push('PLATFORM');
  if (t.includes('kart') || t.includes('racing') || t.includes('speed') || t.includes('gt') || t.includes('nfs')) tags.push('RACING');
  if (t.includes('gta') || t.includes('theft') || t.includes('cyberpunk') || t.includes('open')) tags.push('OPEN-WORLD');
  if (t.includes('undertale') || t.includes('diablo') || t.includes('zelda') || t.includes('rpg') || t.includes('pokemon')) tags.push('RPG');
  if (t.includes('fnaf') || t.includes('freddy') || t.includes('slender') || t.includes('fear') || t.includes('horror')) tags.push('HORROR');
  if (t.includes('tekken') || t.includes('street fighter') || t.includes('smash') || t.includes('mortal kombat')) tags.push('FIGHTING');
  tags.push('PORT');
  return Array.from(new Set(tags));
}

while (i < lines.length) {
  let line = lines[i].trim();
  i++;
  if (!line) continue;

  if (line.match(/^[#A-Z] · \d+/)) {
    currentLetter = line.split(' ')[0];
    continue;
  }

  if (line === 'Game' || line === 'Play' || line === 'Source') {
    continue;
  }

  // Check if line is a game entry
  let hasDemo = false;
  let title = line;
  if (title.startsWith('⭐')) {
    hasDemo = true;
    title = title.replace(/^⭐\s*/, '').trim();
  }

  // Look ahead for play url and source url
  let playUrl = undefined;
  let sourceUrl = undefined;

  while (i < lines.length) {
    const nextLine = lines[i].trim();
    if (!nextLine) {
      i++;
      continue;
    }
    if (nextLine.match(/^[#A-Z] · \d+/) || nextLine === 'Game' || nextLine === 'Play' || nextLine === 'Source') {
      break;
    }
    const playMatch = nextLine.match(/\[▶\s*([^\]]+)\]\(([^)]+)\)/);
    const srcMatch = nextLine.match(/\[📦\s*([^\]]+)\]\(([^)]+)\)/);
    if (playMatch) {
      playUrl = playMatch[2];
      i++;
    } else if (srcMatch) {
      sourceUrl = srcMatch[2];
      i++;
    } else {
      // It's the next game
      break;
    }
  }

  const id = 'port.' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const category = guessCategory(title, playUrl, sourceUrl);
  const tags = guessTags(title, category);
  const colors = ['cyan', 'magenta', 'yellow', 'green'];
  const accentColor = colors[items.length % colors.length];

  items.push({
    id,
    title,
    letter: currentLetter,
    playUrl: playUrl || null,
    sourceUrl: sourceUrl || null,
    hasDemo: hasDemo || !!playUrl,
    tagline: `Port nativo para navegador con WebAssembly / WebGL`,
    tags,
    category,
    accentColor
  });
}

const fileContent = `/**
 * Ultimate Catalog of Web Game Ports (Carter54git dataset + OpenPlay Integration)
 * Total ports cataloged: ${items.length}
 */

export interface WebPortItem {
  id: string;
  title: string;
  letter: string;
  playUrl: string | null;
  sourceUrl: string | null;
  hasDemo: boolean;
  tagline: string;
  tags: string[];
  category: 'WASM' | 'WEBGL' | 'RECOMP' | 'EMULATOR' | 'RETRO' | 'CLOUD_STREAM';
  accentColor: 'cyan' | 'magenta' | 'yellow' | 'green';
}

export const WEB_GAME_PORTS: WebPortItem[] = ${JSON.stringify(items, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../apps/client/src/data/webPortsCatalog.ts'), fileContent, 'utf8');
console.log(`Generated webPortsCatalog.ts with ${items.length} games.`);
