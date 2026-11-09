/**
 * Ultimate Catalog of Web Game Ports (Carter54git dataset + OpenPlay Integration)
 * Total ports cataloged: 212
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

export const WEB_GAME_PORTS: WebPortItem[] = [
  {
    "id": "port.1994",
    "title": "Девятка (1994)",
    "letter": "#",
    "playUrl": "https://rgc.zone/ports/nine-1994/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.3",
    "title": "-3",
    "letter": "#",
    "playUrl": "https://gn-math.dev/?id=816",
    "sourceUrl": "https://github.com/aukak/-3",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.b",
    "title": "-b",
    "letter": "#",
    "playUrl": null,
    "sourceUrl": "https://github.com/web-ports/baldi-mods/tree/main/-b",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.20-minutes-till-dawn",
    "title": "20 Minutes Till Dawn",
    "letter": "#",
    "playUrl": "https://gn-math.dev/?id=819",
    "sourceUrl": "https://github.com/web-ports/20-minutes",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.3d-pinball-for-windows-space-cadet",
    "title": "3D Pinball for Windows - Space Cadet",
    "letter": "#",
    "playUrl": "https://ksylvestre.itch.io/space-cadet-pinball",
    "sourceUrl": "https://github.com/k4zmu2a/SpaceCadetPinball",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.60-seconds",
    "title": "60 Seconds!",
    "letter": "#",
    "playUrl": null,
    "sourceUrl": "https://github.com/usheje883-maker/60-Seconds-Webport",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.a2-racer-iv-de-politie-slaat-terug",
    "title": "A2 Racer IV: De Politie slaat terug",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/NostalgiaRealm/A2-Racer-4",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.abuse",
    "title": "Abuse",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/midzer/abuse",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.ages-of-conflict",
    "title": "Ages of Conflict",
    "letter": "A",
    "playUrl": "https://wasm.rip/files/aoc/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.albion",
    "title": "Albion",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/IS4Code/Albion",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.alley-cat",
    "title": "Alley Cat",
    "letter": "A",
    "playUrl": "https://petarov.github.io/alleycat.exe/",
    "sourceUrl": "https://github.com/petarov/alleycat.exe",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.alone-in-the-dark-aitd",
    "title": "Alone in the Dark (aitd)",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/xesf/aitd",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.amanda-the-adventurer",
    "title": "Amanda The Adventurer",
    "letter": "A",
    "playUrl": "https://gn-math.github.io/web-port/amanda-the-adventurer/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/amanda-the-adventurer",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.amazing-alex",
    "title": "Amazing Alex",
    "letter": "A",
    "playUrl": "https://nomadic-ua.itch.io/amazing-alex",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.american-mcgee-s-alice",
    "title": "American McGee’s Alice",
    "letter": "A",
    "playUrl": "https://github.com/yselimarslan98-dot/alice-web",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.ambidextro",
    "title": "Ambidextro",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/chromecrash/Ambidextro-browser-port",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.among-us",
    "title": "Among Us",
    "letter": "A",
    "playUrl": "https://wasm.rip/files/amongus/index.html",
    "sourceUrl": "https://github.com/wasmdotrip/AmongUsPort",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.anarch",
    "title": "Anarch",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://gitlab.com/drummyfish/anarch",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.andy-s-apple-farm",
    "title": "Andy's Apple Farm",
    "letter": "A",
    "playUrl": "https://gn-math.github.io/web-port/andys-apple-farm/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/andys-apple-farm",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.angband",
    "title": "Angband",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/angband/angband",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.angry-birds-2",
    "title": "Angry Birds 2",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/Reeyuki/angry2",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.angry-birds-epic-v3-0-1",
    "title": "Angry Birds Epic v3.0.1",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/DarkTerraYT/EpicWeb",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.animal-crossing",
    "title": "Animal Crossing",
    "letter": "A",
    "playUrl": "https://rgc.zone/ports/ac-webport-main/index.html",
    "sourceUrl": "https://github.com/web-ports/ac-gamecube",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "EMULATOR",
      "PORT"
    ],
    "category": "EMULATOR",
    "accentColor": "yellow"
  },
  {
    "id": "port.animal-crossing-gamecube",
    "title": "Animal Crossing (GAMECUBE)",
    "letter": "A",
    "playUrl": "https://gn-math.dev/?id=828",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "EMULATOR",
      "PORT"
    ],
    "category": "EMULATOR",
    "accentColor": "green"
  },
  {
    "id": "port.another-world-another-world-suite",
    "title": "Another World (another-world-suite)",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/malandrin/another-world-suite",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.anton-blast-demo",
    "title": "Anton Blast Demo",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/burnedpopcorn/Anton-Blast-Demo-Web-Port",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.antonblast",
    "title": "Antonblast",
    "letter": "A",
    "playUrl": "https://gn-math.dev/?id=711",
    "sourceUrl": "https://github.com/web-ports/antonblast",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.apes-vs-helium",
    "title": "Apes vs Helium",
    "letter": "A",
    "playUrl": "https://gn-math.dev/?id=783",
    "sourceUrl": "https://github.com/bubbls/UGS-Assets/tree/main/apesvshelium",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.apotheon",
    "title": "Apotheon",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/degloved-net/Apotheon",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.apotris",
    "title": "Apotris",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://gitea.com/akouzoukos/apotris",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.arcade-games-arcade-js",
    "title": "Arcade games (arcade-js)",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/qarl/arcade-js",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.arco",
    "title": "Arco",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/degloved-net/arco",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.arthur-s-nightmare",
    "title": "Arthur's Nightmare",
    "letter": "A",
    "playUrl": "https://gn-math.dev/?id=645",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.arx-fatalis-arxwasm-demo",
    "title": "Arx Fatalis (Arxwasm Demo)",
    "letter": "A",
    "playUrl": "https://wasm.continuation-labs.com/arxdemo/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.arx-fatalis-rgc-zone",
    "title": "Arx Fatalis (rgc.zone)",
    "letter": "A",
    "playUrl": "https://rgc.zone/ports/arxweb/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.astromenace",
    "title": "AstroMenace",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/midzer/astromenace",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.asylum",
    "title": "Asylum",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/GMH-Code/Asylum",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.atlantis-the-lost-tales",
    "title": "Atlantis: The Lost Tales",
    "letter": "A",
    "playUrl": "https://ripleyxlr8.github.io/atlantis-native/",
    "sourceUrl": "https://github.com/ripleyXLR8/atlantis-native",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.atomiks",
    "title": "Atomiks",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/midzer/atomiks",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.axis-2005",
    "title": "AXIS (2005)",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/reikop/axis-web",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.azimuth",
    "title": "Azimuth",
    "letter": "A",
    "playUrl": null,
    "sourceUrl": "https://github.com/midzer/azimuth",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.backyard-baseball-97",
    "title": "Backyard Baseball '97",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/degloved-net/backyard-baseball-97",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.bad-parenting-1",
    "title": "Bad Parenting 1",
    "letter": "B",
    "playUrl": "https://gn-math.dev/?id=166",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.bad-piggies",
    "title": "Bad Piggies",
    "letter": "B",
    "playUrl": "https://gn-math.dev/?id=752",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.balatro",
    "title": "Balatro",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/W0W53R/web-balatro",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.baldi-balds-the-universe",
    "title": "Baldi Balds The Universe",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/reeyuki/baldiBaldsTheUniverse",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.baldi-s-basics-birthday-bash",
    "title": "Baldi's Basics Birthday Bash",
    "letter": "B",
    "playUrl": "https://wasm.rip/files/birthdaybash/index.html",
    "sourceUrl": "https://github.com/woahhcrackers/BirthdayBashWeb",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.baldi-s-basics-classic-remastered",
    "title": "Baldi's Basics Classic Remastered",
    "letter": "B",
    "playUrl": "https://gn-math.github.io/web-port/baldi-remaster/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/baldi-remaster",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.baldi-s-basics-plus",
    "title": "Baldi's Basics Plus",
    "letter": "B",
    "playUrl": "https://gn-math.github.io/web-port/baldi-plus/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/baldi-plus",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.baldi-s-basics-minus-3",
    "title": "Baldi's Basics: Minus 3",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/aukak/-3",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.ballerburg-sdl",
    "title": "Ballerburg SDL",
    "letter": "B",
    "playUrl": "https://baller.tuxfamily.org/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.banished-unbanished",
    "title": "Banished (unbanished)",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/tanepiper/unbanished",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.bat-to-bed-demo",
    "title": "Bat to Bed Demo",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/gays-studio/BatToBed-DEMO-webport",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.bat-to-the-heavens",
    "title": "Bat to the Heavens",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/gays-studio/bat-to-the-heavens",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.battle-city",
    "title": "Battle City",
    "letter": "B",
    "playUrl": "https://battle-city.berrry.app/",
    "sourceUrl": "https://github.com/vgrichina/battlecity",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.battle-stadium-d-o-n",
    "title": "Battle Stadium D.O.N",
    "letter": "B",
    "playUrl": "https://battlestadium.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.beat-banger",
    "title": "Beat Banger",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/ajtabjs/bbport",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.beatblock",
    "title": "Beatblock",
    "letter": "B",
    "playUrl": "https://gn-math.dev/?id=787",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.beatblock",
    "title": "Beatblock",
    "letter": "B",
    "playUrl": "https://wasm.rip/files/beatblock/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.before-close",
    "title": "Before Close",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/xxuep/before-close-webport",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.bendy-and-the-ink-machine",
    "title": "Bendy and The Ink Machine",
    "letter": "B",
    "playUrl": "https://gn-math.github.io/web-port/bendy/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/bendy",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.bendy-and-the-ink-machine-2",
    "title": "Bendy and The Ink Machine (2)",
    "letter": "B",
    "playUrl": "https://wasm.rip/files/BATIM/index.html",
    "sourceUrl": "https://github.com/slqntdevss/BATIMFullPort",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.bendy-and-the-ink-machine-3",
    "title": "Bendy and The Ink Machine (3)",
    "letter": "B",
    "playUrl": "https://gn-math.github.io/web-port/bendy/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/bendy",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.bendy-and-the-ink-machine-4",
    "title": "Bendy and The Ink Machine (4)",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/web-ports/bendy-and-the-ink-machine",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.bendy-and-the-ink-machine-5",
    "title": "Bendy and The Ink Machine (5)",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/woahhcrackers/BATIMWeb",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.bendy-and-the-ink-machine-all-chapters",
    "title": "Bendy and the Ink Machine: ALL CHAPTERS",
    "letter": "B",
    "playUrl": "https://gn-math.dev/?id=803",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.beneath-a-steel-sky-scummweb",
    "title": "Beneath a Steel Sky (ScummWeb)",
    "letter": "B",
    "playUrl": "https://scummweb.tsilva.eu/beneath-a-steel-sky/play",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.bergentruck-201x",
    "title": "BERGENTRUCK 201x",
    "letter": "B",
    "playUrl": "https://gn-math.github.io/web-port/bergentruck/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/bergentruck",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.bermuda-syndrome",
    "title": "Bermuda Syndrome",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/cyxx/bermuda",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.bfdi-branches",
    "title": "BFDI: Branches",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/highestage/web-port-games/tree/main/bfdi-branches",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.the-binding-of-isaac-repentance",
    "title": "The Binding of Isaac: Repentance",
    "letter": "B",
    "playUrl": "https://tboi.online/",
    "sourceUrl": "https://github.com/chiikabu/the-browsing-of-isaac",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.biolab-disaster",
    "title": "Biolab Disaster",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/phoboslab/high_biolab",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.a-bite-at-freddy-s",
    "title": "A Bite at Freddy's",
    "letter": "B",
    "playUrl": "https://gn-math.dev/?id=258",
    "sourceUrl": "https://github.com/freebuisness/assets/tree/main/258",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "HORROR",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.black-hole-fishing",
    "title": "Black Hole Fishing",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/mynamescrax/gamesforaetheris/tree/main/blackholefishing",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.blobby-volley-2",
    "title": "Blobby Volley 2",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/danielknobe/blobbyvolley2",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.bloboats",
    "title": "Bloboats",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/midzer/bloboats",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.block-blast",
    "title": "Block Blast",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/SomeRandomFella/portsandrips/tree/master/blockblast-port",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.blood-one-unit-whole-blood-notblood-chosen",
    "title": "Blood: One Unit Whole Blood (NotBlood-Chosen)",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/AdrianPol-projects/NotBlood-Chosen",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.bloodmoney",
    "title": "BLOODMONEY!",
    "letter": "B",
    "playUrl": "https://gn-math.github.io/web-port/bloodmoney/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/bloodmoney",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.boil-noodles-at-night",
    "title": "boil Noodles at Night",
    "letter": "B",
    "playUrl": "https://wasm.rip/files/boilnoodles/index.html",
    "sourceUrl": "https://github.com/SomeRandomFella/portsandrips/tree/master/boilnoodles",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.bombermaaan",
    "title": "Bombermaaan",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/midzer/Bombermaaan",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.bottleship-nfs-underground-2-xiii-far-cry-mafia-the-bard-s-tale",
    "title": "BottleShip (NFS Underground 2, XIII, Far Cry, Mafia, The Bard's Tale…)",
    "letter": "B",
    "playUrl": null,
    "sourceUrl": "https://github.com/jenissimo/bottleship",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RACING",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.brawlhalla",
    "title": "Brawlhalla",
    "letter": "B",
    "playUrl": "https://truffled.lol/games/brawlhalla/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.brotato",
    "title": "Brotato",
    "letter": "B",
    "playUrl": "https://gn-math.dev/?id=723",
    "sourceUrl": "https://github.com/BlueGameMC/BrotatoWeb",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.brotato-2",
    "title": "Brotato (2)",
    "letter": "B",
    "playUrl": "https://wasm.rip/files/bpac/index.html",
    "sourceUrl": "https://github.com/gays-studio/brotato-webport/",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.brutal-doom",
    "title": "Brutal Doom",
    "letter": "B",
    "playUrl": "https://rgc.zone/ports/brutaldoom/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "RETRO",
      "FPS",
      "PORT"
    ],
    "category": "RETRO",
    "accentColor": "magenta"
  },
  {
    "id": "port.buckshot-roulette",
    "title": "Buckshot Roulette",
    "letter": "B",
    "playUrl": "https://gn-math.github.io/web-port/buckshot-roulette/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/buckshot-roulette",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.burnout-3-takedown",
    "title": "Burnout 3: Takedown",
    "letter": "B",
    "playUrl": "https://burnout3.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.caesar-iii",
    "title": "Caesar III",
    "letter": "C",
    "playUrl": null,
    "sourceUrl": "https://github.com/bvschaik/julius",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.call-of-duty-web-collection",
    "title": "Call of Duty Web Collection",
    "letter": "C",
    "playUrl": "https://cod-webports.pages.dev/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FPS",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.call-of-duty-black-ops-zombies",
    "title": "Call of Duty: Black Ops Zombies",
    "letter": "C",
    "playUrl": "http://vel.gg/bo1z",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FPS",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.call-of-duty-black-ops-zombies-2",
    "title": "Call of Duty: Black Ops Zombies (2)",
    "letter": "C",
    "playUrl": "https://vel.gg/bsz",
    "sourceUrl": "https://github.com/AllanLotta/bo1-zombies-coop",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FPS",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.call-of-duty-modern-warfare-2",
    "title": "Call of Duty: Modern Warfare 2",
    "letter": "C",
    "playUrl": "https://ovz-game-production.up.railway.app/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FPS",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.carmageddon",
    "title": "Carmageddon",
    "letter": "C",
    "playUrl": "https://rgc.zone/ports/carmaweb/index.html",
    "sourceUrl": "https://github.com/Carter54git/dethrace-ported-to-web",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.castle-crashers",
    "title": "Castle Crashers",
    "letter": "C",
    "playUrl": "https://truffled.lol/games/castle/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.cave-story",
    "title": "Cave Story",
    "letter": "C",
    "playUrl": "https://rgc.zone/ports/cavestory/index.html",
    "sourceUrl": "https://github.com/midzer/nxengine-evo",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.celeste",
    "title": "Celeste",
    "letter": "C",
    "playUrl": "https://gn-math.dev/?id=623",
    "sourceUrl": "https://github.com/MercuryWorkshop/celeste-wasm",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PLATFORM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.celeste-2",
    "title": "Celeste (2)",
    "letter": "C",
    "playUrl": "https://celeste.r58playz.dev/",
    "sourceUrl": "https://github.com/web-ports/celeste",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PLATFORM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.celeste-64",
    "title": "Celeste 64",
    "letter": "C",
    "playUrl": null,
    "sourceUrl": "https://github.com/MercuryWorkshop/Celeste64",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PLATFORM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.class-of-09",
    "title": "Class of '09",
    "letter": "C",
    "playUrl": "https://gn-math.github.io/web-port/class-of-09/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/class-of-09",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.clustertruck",
    "title": "Clustertruck",
    "letter": "C",
    "playUrl": "https://wasm.rip/files/ClusterTruck/clustertruck.html",
    "sourceUrl": "https://github.com/wasmdotrip/Clustertruck-Port",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.command-conquer-red-alert-2",
    "title": "Command & Conquer: Red Alert 2",
    "letter": "C",
    "playUrl": "https://chronodivide.com/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.commander-keen",
    "title": "Commander Keen",
    "letter": "C",
    "playUrl": "https://www.jamesfmackenzie.com/chocolatekeen/",
    "sourceUrl": "https://github.com/jamesfmackenzie/chocolatekeen",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.counter-strike-half-life",
    "title": "Counter Strike & Half Life",
    "letter": "C",
    "playUrl": "https://pixelsuft.github.io/hl/",
    "sourceUrl": "https://github.com/Pixelsuft/hl",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FPS",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.counter-strike-1-6",
    "title": "Counter Strike 1.6",
    "letter": "C",
    "playUrl": "https://csjs.live/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FPS",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.counter-strike-2-cs2go-three-js",
    "title": "Counter-Strike 2 (cs2go, Three.js)",
    "letter": "C",
    "playUrl": "https://cs2go.3kh0.net/",
    "sourceUrl": "https://github.com/3kh0/cs2go",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WEBGL",
      "FPS",
      "PORT"
    ],
    "category": "WEBGL",
    "accentColor": "magenta"
  },
  {
    "id": "port.crash-team-racing-turbocharged",
    "title": "Crash Team Racing Turbocharged",
    "letter": "C",
    "playUrl": "https://ctr.cmzi.uk/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RACING",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.cuphead",
    "title": "Cuphead",
    "letter": "C",
    "playUrl": "https://gn-math.github.io/web-port/cuphead/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/cuphead",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PLATFORM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.cut-the-rope-dx",
    "title": "Cut the Rope DX",
    "letter": "C",
    "playUrl": "https://yell0wsuit.github.io/cuttherope-dx/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.cyberpunk-2077",
    "title": "Cyberpunk 2077",
    "letter": "C",
    "playUrl": "https://cyberpunk2077.lol/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "OPEN-WORLD",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.dead-plate",
    "title": "Dead Plate",
    "letter": "D",
    "playUrl": "https://gn-math.github.io/web-port/dead-plate/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/dead-plate",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.deltarune",
    "title": "Deltarune",
    "letter": "D",
    "playUrl": "https://gn-math.github.io/web-port/deltatraveler/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/deltatraveler",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.diablo",
    "title": "Diablo",
    "letter": "D",
    "playUrl": "https://d07riv.github.io/diabloweb/",
    "sourceUrl": "https://github.com/d07RiV/diabloweb",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RPG",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.diablo-ii-lord-of-destruction-d2-web",
    "title": "Diablo II: Lord of Destruction (D2-Web)",
    "letter": "D",
    "playUrl": "https://diablo2.virtastic.app/",
    "sourceUrl": "https://github.com/Virtastic/d2-web",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RPG",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.diddy-kong-racing-golden-balloon",
    "title": "Diddy Kong Racing (Golden Balloon)",
    "letter": "D",
    "playUrl": "https://akratch.github.io/golden-balloon/",
    "sourceUrl": "https://github.com/akratch/goldenballoon",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RACING",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.doom",
    "title": "Doom",
    "letter": "D",
    "playUrl": "https://raz0red.github.io/webprboom/",
    "sourceUrl": "https://github.com/midzer/chocolate-doom",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "RETRO",
      "FPS",
      "PORT"
    ],
    "category": "RETRO",
    "accentColor": "green"
  },
  {
    "id": "port.doom-3",
    "title": "Doom 3",
    "letter": "D",
    "playUrl": "https://gn-math.dev/?id=626",
    "sourceUrl": "https://github.com/web-ports/doom-3",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "RETRO",
      "FPS",
      "PORT"
    ],
    "category": "RETRO",
    "accentColor": "cyan"
  },
  {
    "id": "port.dragon-ball-z-budokai-tenkaichi-3",
    "title": "Dragon Ball Z: Budokai Tenkaichi 3",
    "letter": "D",
    "playUrl": "https://dragonballbt3.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.duke-nukem-3d",
    "title": "Duke Nukem 3D",
    "letter": "D",
    "playUrl": "https://midzer.de/wasm/duke3d/",
    "sourceUrl": "https://github.com/midzer/BelgianChocolateDuke3D",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.dune-ii",
    "title": "Dune II",
    "letter": "D",
    "playUrl": "https://dune2js.com/",
    "sourceUrl": "https://github.com/midzer/OpenDUNE",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.eaglercraft",
    "title": "Eaglercraft",
    "letter": "E",
    "playUrl": "https://rgc.zone/ports/eaglecarftg/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.the-elder-scrolls-iii-morrowind-openmw",
    "title": "The Elder Scrolls III: Morrowind (OpenMW)",
    "letter": "E",
    "playUrl": "https://morrowind.virtastic.app/",
    "sourceUrl": "https://github.com/Virtastic/openmw-web",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "OPEN-WORLD",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.fallout",
    "title": "Fallout",
    "letter": "F",
    "playUrl": "https://gn-math.dev/?id=585",
    "sourceUrl": "https://github.com/midzer/fallout1-ce",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.fear-hunger",
    "title": "Fear & Hunger",
    "letter": "F",
    "playUrl": "https://gn-math.dev/?id=706",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "HORROR",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.fears-to-fathom",
    "title": "Fears To Fathom",
    "letter": "F",
    "playUrl": "https://gn-math.github.io/web-port/fears-to-fathom/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/fears-to-fathom",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "HORROR",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.fez",
    "title": "FEZ",
    "letter": "F",
    "playUrl": "https://wasm.rip/files/FEZ/fez.html",
    "sourceUrl": "https://github.com/degloved-net/FEZ",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.fifa-14-psp",
    "title": "FIFA 14 (PSP)",
    "letter": "F",
    "playUrl": "https://fifa14.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "EMULATOR",
      "PORT"
    ],
    "category": "EMULATOR",
    "accentColor": "yellow"
  },
  {
    "id": "port.fifa-street-2",
    "title": "FIFA Street 2",
    "letter": "F",
    "playUrl": "https://fifastreet2.fun/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.five-nights-at-freddy-s",
    "title": "Five Nights at Freddy's",
    "letter": "F",
    "playUrl": "https://gn-math.dev/?id=38",
    "sourceUrl": "https://github.com/irv77/hd_fnaf/tree/main/1",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "HORROR",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.five-nights-at-freddy-s-2",
    "title": "Five Nights at Freddy's 2",
    "letter": "F",
    "playUrl": "https://gn-math.dev/?id=39",
    "sourceUrl": "https://github.com/irv77/hd_fnaf/tree/main/2",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "HORROR",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.flatout-2",
    "title": "FlatOut 2",
    "letter": "F",
    "playUrl": "https://itch.io/event/46481004",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.freeciv-freeciv-web",
    "title": "Freeciv (Freeciv-web)",
    "letter": "F",
    "playUrl": "https://webciv.org/webclient/?action=new&type=singleplayer",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.geometry-dash",
    "title": "Geometry Dash",
    "letter": "G",
    "playUrl": "https://gn-math.dev/?id=785",
    "sourceUrl": "https://github.com/AlexBoops/geometry-dash-webport",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.getting-over-it",
    "title": "Getting Over It",
    "letter": "G",
    "playUrl": "https://gn-math.github.io/web-port/getting-over-it/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/getting-over-it",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.god-of-war-chains-of-olympus",
    "title": "God of War: Chains of Olympus",
    "letter": "G",
    "playUrl": "https://godofwarchains.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.god-of-war-ghost-of-sparta",
    "title": "God of War: Ghost of Sparta",
    "letter": "G",
    "playUrl": "https://godofwarsparta.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.goldeneye-007-goldenweb64",
    "title": "GoldenEye 007 (GoldenWeb64)",
    "letter": "G",
    "playUrl": "https://goldenweb64.com/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.gorilla-tag",
    "title": "Gorilla Tag",
    "letter": "G",
    "playUrl": "https://gn-math.dev/?id=668",
    "sourceUrl": "https://github.com/web-ports/gorilla-tag",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.gran-turismo-4",
    "title": "Gran Turismo 4",
    "letter": "G",
    "playUrl": "https://granturismo4.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.grand-theft-auto-2",
    "title": "Grand Theft Auto 2",
    "letter": "G",
    "playUrl": "https://m1stermo.github.io/gta2/",
    "sourceUrl": "https://github.com/M1sterMo/gta2-browser",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "OPEN-WORLD",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.grand-theft-auto-iii-wasm-rip",
    "title": "Grand Theft Auto III (wasm.rip)",
    "letter": "G",
    "playUrl": "https://wasm.rip/files/gta3/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "OPEN-WORLD",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.grand-theft-auto-vice-city-revc-wasm-ltd",
    "title": "Grand Theft Auto: Vice City (revc.wasm.ltd)",
    "letter": "G",
    "playUrl": "https://revc.wasm.ltd/",
    "sourceUrl": "https://github.com/origami-ltd/wasm-revc",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "OPEN-WORLD",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.gta-v-gta5-web-webgpu",
    "title": "GTA V (gta5-web, WebGPU)",
    "letter": "G",
    "playUrl": "https://hammadshakeelai.github.io/gta5-web/",
    "sourceUrl": "https://github.com/hammadshakeelai/gta5-web",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RACING",
      "OPEN-WORLD",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.guitar-hero-iii-browser-edition",
    "title": "Guitar Hero III (Browser Edition)",
    "letter": "G",
    "playUrl": "https://gh3.thediaryofchris.net/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.half-life-2",
    "title": "Half Life 2",
    "letter": "H",
    "playUrl": "https://hl2.slqnt.dev/",
    "sourceUrl": "https://github.com/AlexBoops/half-life-2-port",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.half-life-and-counter-strike-1-6-webxash",
    "title": "Half-Life and Counter-Strike 1.6 (WebXash)",
    "letter": "H",
    "playUrl": "https://x8bitrain.github.io/webXash/",
    "sourceUrl": "https://github.com/x8bitrain/webXash",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FPS",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.halo-combat-evolved",
    "title": "Halo: Combat Evolved",
    "letter": "H",
    "playUrl": "https://mitchellhynes.com/halo/halo.html",
    "sourceUrl": "https://github.com/ecumene/web-halo",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FPS",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.harry-potter-and-the-chamber-of-secrets",
    "title": "Harry Potter and the Chamber of Secrets",
    "letter": "H",
    "playUrl": "https://hp2.mihaimateias.com/",
    "sourceUrl": "https://github.com/cefege/harry-potter-2-chamber-of-secrets-pc",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.hollow-knight",
    "title": "Hollow Knight",
    "letter": "H",
    "playUrl": "https://gn-math.dev/?id=468",
    "sourceUrl": "https://github.com/aukak/hollow-knight",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PLATFORM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.hollow-knight-silksong",
    "title": "Hollow Knight: Silksong",
    "letter": "H",
    "playUrl": "https://gn-math.dev/?id=771",
    "sourceUrl": "https://github.com/web-ports/hollow-knight-silksong",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PLATFORM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.hotline-miami",
    "title": "Hotline Miami",
    "letter": "H",
    "playUrl": "https://gn-math.github.io/web-port/hotline-miami/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/hotline-miami",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.inscryption",
    "title": "Inscryption",
    "letter": "I",
    "playUrl": "https://wasm.rip/files/inscryption/index.html",
    "sourceUrl": "https://github.com/Reeyuki/InscryptionWebport",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.iron-lung",
    "title": "Iron Lung",
    "letter": "I",
    "playUrl": "https://gn-math.dev/?id=705",
    "sourceUrl": "https://github.com/web-ports/iron-lung",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.jak-and-daxter-the-lost-frontier",
    "title": "Jak and Daxter: The Lost Frontier",
    "letter": "J",
    "playUrl": "https://jakdaxterlostfrontier.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.jazz-jackrabbit-2",
    "title": "Jazz Jackrabbit 2",
    "letter": "J",
    "playUrl": null,
    "sourceUrl": "https://github.com/deathkiller/jazz2-native",
    "hasDemo": false,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.just-shapes-beats",
    "title": "Just Shapes & Beats",
    "letter": "J",
    "playUrl": "https://gn-math.dev/?id=826",
    "sourceUrl": "https://github.com/web-ports/jsab",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.karlson",
    "title": "Karlson",
    "letter": "K",
    "playUrl": "https://gn-math.github.io/web-port/karlson/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/karlson",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.kindergarten-1-2",
    "title": "Kindergarten 1 & 2",
    "letter": "K",
    "playUrl": "https://gn-math.github.io/web-port/kindergarten/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/kindergarten",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.kingdom-hearts-chain-of-memories",
    "title": "Kingdom Hearts: Chain of Memories",
    "letter": "K",
    "playUrl": "https://replicom.dev/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.kirby-the-amazing-mirror",
    "title": "Kirby & The Amazing Mirror",
    "letter": "K",
    "playUrl": "https://sh1ftmaker.github.io/katam-port/",
    "sourceUrl": "https://github.com/sh1ftmaker/katam-port",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.the-legend-of-zelda-twilight-princess-dusklight",
    "title": "The Legend of Zelda: Twilight Princess (Dusklight)",
    "letter": "L",
    "playUrl": "https://dusklight.pages.dev/",
    "sourceUrl": "https://github.com/caribbeansc/dusklight",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RPG",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.lego-island",
    "title": "LEGO Island",
    "letter": "L",
    "playUrl": "https://isle.pizza/",
    "sourceUrl": "https://github.com/isledecomp/isle.pizza",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.lethal-company",
    "title": "Lethal Company",
    "letter": "L",
    "playUrl": "https://wasm.rip/files/lethal/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.limbo",
    "title": "Limbo",
    "letter": "L",
    "playUrl": "https://truffled.lol/games/limbo/index.html",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.marvel-vs-capcom-2",
    "title": "Marvel vs. Capcom 2",
    "letter": "M",
    "playUrl": "https://marvelvscapcom2.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.metal-gear-solid-shadow-moses-web",
    "title": "Metal Gear Solid (Shadow Moses Web)",
    "letter": "M",
    "playUrl": "https://mgs.ravenlight.net/",
    "sourceUrl": "https://github.com/vjravenlight/shadow-moses-web",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.midnight-club-3-dub-edition",
    "title": "Midnight Club 3: DUB Edition",
    "letter": "M",
    "playUrl": "https://midnighhtclub3.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.minecraft-1-8-8-eaglercraftx",
    "title": "Minecraft 1.8.8 (EaglercraftX)",
    "letter": "M",
    "playUrl": "https://wasmarcade.com/minecraft",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.mortal-kombat-shaolin-monks",
    "title": "Mortal Kombat: Shaolin Monks",
    "letter": "M",
    "playUrl": "https://mortalkombatsm.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FIGHTING",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.need-for-speed-most-wanted-2005",
    "title": "Need for Speed: Most Wanted (2005)",
    "letter": "N",
    "playUrl": "https://iker3329.github.io/nfsmw-webport/",
    "sourceUrl": "https://github.com/Iker3329/nfsmw-webport",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RACING",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.need-for-speed-underground-2",
    "title": "Need for Speed: Underground 2",
    "letter": "N",
    "playUrl": "https://nfsu2.xyz/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RACING",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.needy-streamer-overload",
    "title": "Needy Streamer Overload",
    "letter": "N",
    "playUrl": "https://gn-math.dev/?id=708",
    "sourceUrl": "https://github.com/web-ports/needy-streamer-overload",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.omori",
    "title": "OMORI",
    "letter": "O",
    "playUrl": "https://gn-math.github.io/web-port/omori-fixed/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/omori-fixed",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.oneshot-world-machine-edition",
    "title": "Oneshot: World Machine Edition",
    "letter": "O",
    "playUrl": "https://wasm.rip/files/oneshot-wme/index.html",
    "sourceUrl": "https://github.com/MercuryWorkshop/webshot",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.openttd",
    "title": "OpenTTD",
    "letter": "O",
    "playUrl": "https://openttdonline.com/play/",
    "sourceUrl": "https://github.com/OpenTTD/OpenTTD",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "OPEN-WORLD",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.people-playground",
    "title": "People Playground",
    "letter": "P",
    "playUrl": "https://gn-math.github.io/web-port/people-playground/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/people-playground",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.pizza-tower",
    "title": "Pizza Tower",
    "letter": "P",
    "playUrl": "https://gn-math.github.io/web-port/pizza-tower/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/pizza-tower",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.plants-vs-zombies-goty-edition",
    "title": "Plants vs Zombies: GOTY Edition",
    "letter": "P",
    "playUrl": "https://gn-math.dev/?id=842",
    "sourceUrl": "https://github.com/wszqkzqk/PvZ-Portable",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.portal",
    "title": "Portal",
    "letter": "P",
    "playUrl": "https://yikes.pw/portal/",
    "sourceUrl": "https://github.com/weliveinhell/source-engine",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.prince-of-persia",
    "title": "Prince of Persia",
    "letter": "P",
    "playUrl": "https://princejs.com/",
    "sourceUrl": "https://github.com/midzer/SDLPoP",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.quake",
    "title": "Quake",
    "letter": "Q",
    "playUrl": "https://qwasm.m-h.org.uk/",
    "sourceUrl": "https://github.com/GMH-Code/Qwasm",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FPS",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.quake-iii-arena-q3js",
    "title": "Quake III Arena (q3js)",
    "letter": "Q",
    "playUrl": "https://q3js.com/",
    "sourceUrl": "https://github.com/lklacar/q3js",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "RETRO",
      "FPS",
      "PORT"
    ],
    "category": "RETRO",
    "accentColor": "magenta"
  },
  {
    "id": "port.raft",
    "title": "RAFT",
    "letter": "R",
    "playUrl": "https://gn-math.github.io/web-port/raft/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/raft",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.ratchet-clank",
    "title": "Ratchet & Clank",
    "letter": "R",
    "playUrl": "https://re-rac.github.io/",
    "sourceUrl": "https://github.com/re-rac/rerac",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.resident-evil-4",
    "title": "Resident Evil 4",
    "letter": "R",
    "playUrl": "https://residentevil4.online/",
    "sourceUrl": null,
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.rimworld",
    "title": "Rimworld",
    "letter": "R",
    "playUrl": "https://wasm.rip/files/rimworld/index.html",
    "sourceUrl": "https://github.com/SomeRandomFella/portsandrips/tree/master/rimworld",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.s-t-a-l-k-e-r-call-of-pripyat-zonevm",
    "title": "S.T.A.L.K.E.R.: Call of Pripyat (ZoneVM)",
    "letter": "S",
    "playUrl": "https://zonevm.btr.pm/",
    "sourceUrl": "https://github.com/x8BitRain/zone-vm",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.scp-containment-breach",
    "title": "SCP: Containment Breach",
    "letter": "S",
    "playUrl": "https://wasm.rip/files/scp/index.html",
    "sourceUrl": "https://github.com/larpinguser/q8j",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.shadow-warrior",
    "title": "Shadow Warrior",
    "letter": "S",
    "playUrl": "https://rgc.zone/ports/8775-swarrior/run.html",
    "sourceUrl": "https://github.com/midzer/jfsw",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.the-simpsons-hit-run-web-port",
    "title": "The Simpsons: Hit & Run (Web Port)",
    "letter": "S",
    "playUrl": "https://vheissu.github.io/hit-and-run-web/",
    "sourceUrl": "https://github.com/Vheissu/hit-and-run-web",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.slender-the-eight-pages",
    "title": "Slender: The Eight Pages",
    "letter": "S",
    "playUrl": "https://gn-math.github.io/web-port/slender/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/slender",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "HORROR",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.sonic-mania",
    "title": "Sonic Mania",
    "letter": "S",
    "playUrl": "https://gn-math.dev/?id=590",
    "sourceUrl": "https://github.com/VinMannie/SonicManiaWeb",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PLATFORM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.star-wars-empire-at-war-browser-edition",
    "title": "Star Wars: Empire at War (Browser Edition)",
    "letter": "S",
    "playUrl": "https://playeaw.com/",
    "sourceUrl": "https://github.com/Glenn332/Empire-At-War-Browser-Edition",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.stardew-valley",
    "title": "Stardew Valley",
    "letter": "S",
    "playUrl": "https://gn-math.dev/?id=789",
    "sourceUrl": "https://github.com/degloved-net/stardew-wasm",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.super-mario-64-sm64coopdx-in-browser",
    "title": "Super Mario 64 (sm64coopdx in browser)",
    "letter": "S",
    "playUrl": "https://b1t64.github.io/m64-dl6t2g/",
    "sourceUrl": "https://github.com/B1T64/m64-dl6t2g",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PLATFORM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.super-smash-bros-smash-fun",
    "title": "Super Smash Bros. (smash.fun)",
    "letter": "S",
    "playUrl": "https://smash.fun/",
    "sourceUrl": "https://github.com/turtlesoupy/opensmash",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "FIGHTING",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.tekken-5-dark-resurrection-recomp",
    "title": "Tekken 5: Dark Resurrection (Recomp)",
    "letter": "T",
    "playUrl": "https://tkdr-recomp.pages.dev/",
    "sourceUrl": "https://github.com/gasparegas/tkdr-recomp",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "RECOMP",
      "FIGHTING",
      "PORT"
    ],
    "category": "RECOMP",
    "accentColor": "cyan"
  },
  {
    "id": "port.terraria",
    "title": "Terraria",
    "letter": "T",
    "playUrl": "https://gn-math.dev/?id=669",
    "sourceUrl": "http://github.com/mercuryWorkshop/terraria-wasm",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.that-s-not-my-neighbor",
    "title": "That's Not My Neighbor",
    "letter": "T",
    "playUrl": "https://gn-math.github.io/web-port/thats-not-my-neighbor/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/thats-not-my-neighbor",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.tomb-raider",
    "title": "Tomb Raider",
    "letter": "T",
    "playUrl": "http://xproger.info/projects/OpenLara/",
    "sourceUrl": "https://github.com/XProger/OpenLara",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.ultrakill-prelude",
    "title": "Ultrakill Prelude",
    "letter": "U",
    "playUrl": "https://gn-math.github.io/web-port/ultrakill/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/ultrakill",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.undertale",
    "title": "Undertale",
    "letter": "U",
    "playUrl": "https://gn-math.github.io/web-port/undertale/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/undertale",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RPG",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.undertale-yellow",
    "title": "Undertale Yellow",
    "letter": "U",
    "playUrl": "https://gn-math.github.io/web-port/undertale-yellow/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/undertale-yellow",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "RPG",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.untitled-goose-game",
    "title": "Untitled Goose Game",
    "letter": "U",
    "playUrl": "https://gn-math.dev/?id=718",
    "sourceUrl": "https://github.com/web-ports/untitled-goose-game",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.virtua-fighter",
    "title": "Virtua Fighter",
    "letter": "V",
    "playUrl": "https://vf1-recomp.pages.dev/",
    "sourceUrl": "https://github.com/mr-finster/vf1-recomp",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "RECOMP",
      "PORT"
    ],
    "category": "RECOMP",
    "accentColor": "cyan"
  },
  {
    "id": "port.vvvvvv",
    "title": "VVVVVV",
    "letter": "V",
    "playUrl": "https://stelight.games/play/webports/stellite.games/stellite/vvvvvv/",
    "sourceUrl": "https://github.com/midzer/vvvvvv",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.webfishing",
    "title": "Webfishing",
    "letter": "W",
    "playUrl": "https://gn-math.github.io/web-port/web-fishing/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/web-fishing",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.wipeout",
    "title": "WipEout",
    "letter": "W",
    "playUrl": "https://phoboslab.org/wipegame/",
    "sourceUrl": "https://github.com/phoboslab/wipeout-rewrite",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  },
  {
    "id": "port.wolfenstein-3d-html5-lazarv",
    "title": "Wolfenstein 3D (HTML5, lazarv)",
    "letter": "W",
    "playUrl": "https://wolf3d.wadcmd.com/",
    "sourceUrl": "https://github.com/lazarv/wolf3d",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "cyan"
  },
  {
    "id": "port.yandere-simulator",
    "title": "Yandere Simulator",
    "letter": "Y",
    "playUrl": "https://gn-math.github.io/web-port/yandere-simulator/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/yandere-simulator",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "magenta"
  },
  {
    "id": "port.your-only-move-is-hustle",
    "title": "Your Only Move is Hustle",
    "letter": "Y",
    "playUrl": "https://gn-math.dev/?id=776",
    "sourceUrl": "https://github.com/webporting/Your-Only-Move-Is-HUSTLE",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "yellow"
  },
  {
    "id": "port.yume-nikki",
    "title": "Yume Nikki",
    "letter": "Y",
    "playUrl": "https://gn-math.github.io/web-port/yume-nikki/",
    "sourceUrl": "https://github.com/genizy/web-port/tree/main/yume-nikki",
    "hasDemo": true,
    "tagline": "Port nativo para navegador con WebAssembly / WebGL",
    "tags": [
      "WASM",
      "PORT"
    ],
    "category": "WASM",
    "accentColor": "green"
  }
];
