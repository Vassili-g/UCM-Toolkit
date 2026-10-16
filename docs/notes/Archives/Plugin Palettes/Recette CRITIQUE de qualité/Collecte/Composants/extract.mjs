/**
 * Lit les fichiers de `sources/` (et ceux repris de ../Surfaces/, ../Radix/ et
 * ../Figma/) sans exécuter aucun code téléchargé, puis écrit
 * `processed/composants.json` et met à jour les tableaux du fichier
 * `../ANALYSE-COMPOSANTS-A-SURFACE.md` entre les marqueurs
 * `<!-- tableau:type -->` et `<!-- ecart:type -->`.
 * Chaque couleur vient d'un fichier du dépôt, avec le nom du jeton, la valeur
 * publiée et le fichier d'origine. Les valeurs calculées (composition d'une
 * couleur translucide sur son support, couche d'état, formules de Material UI,
 * conversion oklch vers sRGB, contraste WCAG 2) sont signalées comme telles.
 * Usage : node Collecte/Composants/extract.mjs (après fetch.mjs)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dossier, parId } from './lib.mjs';
import { lignes as radix } from './radix.mjs';
import { lignes as atlassian } from './atlassian.mjs';
import { lignes as primer } from './primer.mjs';
import { lignes as polaris } from './polaris.mjs';
import { lignes as fluent } from './fluent.mjs';
import { lignes as m3 } from './m3.mjs';
import { lignes as mui } from './mui.mjs';
import { lignes as spectrum } from './spectrum.mjs';
import { lignes as tremor } from './tremor.mjs';
import { lignes as carbon } from './carbon.mjs';
import { lignes as untitled } from './untitled.mjs';

const ORDRE = ['Radix Themes', 'Atlassian', 'GitHub Primer', 'Shopify Polaris', 'Microsoft Fluent 2', 'Material 3', 'Material UI', 'Adobe Spectrum 2', 'Tremor (Tailwind CSS)', 'IBM Carbon', 'Untitled UI (kit Figma)'];
const TYPES = [
  ['badge-discret', 'Badge discret'],
  ['badge-plein', 'Badge plein'],
  ['alerte', 'Alerte ou bannière en ligne'],
  ['bouton-teinte', 'Bouton teinté'],
  ['bouton-plein', 'Bouton plein, survol et appui'],
];
/** Tons montrés dans les tableaux du fichier Markdown (le JSON porte tous les tons). */
const TONS_AFFICHES = new Set(['danger', 'success', 'warning', 'neutre', 'marque', 'secondaire', 'primaire']);

const brutes = [
  ...radix(), ...atlassian(), ...primer(), ...polaris(), ...fluent(), ...m3(), ...mui(), ...spectrum(), ...tremor(), ...carbon(), ...untitled(),
];
/** Ordre : système, puis variante dans l'ordre d'apparition, puis ton, puis thème. */
const ORDRE_TONS = ['danger', 'success', 'warning', 'info', 'neutre', 'marque', 'secondaire', 'primaire'];
const ORDRE_THEMES = ['clair', 'sombre', 'white', 'g10', 'g90', 'g100'];
const premiere = new Map();
brutes.forEach((l, i) => {
  const k = `${l.systeme}|${l.type}|${l.composant}|${l.variante}`;
  if (!premiere.has(k)) premiere.set(k, i);
});
const toutes = [...brutes].sort((a, b) => (
  ORDRE.indexOf(a.systeme) - ORDRE.indexOf(b.systeme)
  || premiere.get(`${a.systeme}|${a.type}|${a.composant}|${a.variante}`) - premiere.get(`${b.systeme}|${b.type}|${b.composant}|${b.variante}`)
  || ORDRE_TONS.indexOf(a.ton) - ORDRE_TONS.indexOf(b.ton)
  || ORDRE_THEMES.indexOf(a.theme) - ORDRE_THEMES.indexOf(b.theme)
));

/* ------------------------------------------------------------------ écart de pas */

const ECHELLES = {
  tailwind: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
};
const numero = (pas) => {
  if (pas === undefined) return null;
  const m = String(pas).match(/^a?(\d+)(?:\/\d+)?$/);
  return m ? +m[1] : null;
};
/**
 * Écart entre le pas du fond et celui du texte. Compté quand l'échelle est
 * numérotée ; sinon les deux pas nommés sont donnés sans écart.
 */
function ecart(l) {
  const f = l.fond?.pas;
  const t = l.texte?.pas;
  if (f === undefined || t === undefined) return null;
  if (['25', 'layer-2'].includes(String(f)) || /^(white|black|blanc|contrast|14)$/.test(String(t)) || String(f) === String(t)) return null;
  const nf = numero(String(f).replace('ton ', ''));
  const nt = numero(String(t).replace('ton ', ''));
  const alpha = /\/\d+$/.test(String(f)) ? ` (fond à ${String(f).split('/')[1]} %)` : '';
  if (nf === null || nt === null) return { fond: f, texte: t, ecart: 'échelle nommée, écart non compté' };
  if (l.systeme === 'Radix Themes') return { fond: f, texte: t, ecart: `${nt - nf} crans (échelle 1 à 12)` };
  if (l.systeme.startsWith('Tremor') || l.systeme.startsWith('Untitled')) {
    const e = ECHELLES.tailwind;
    const i = e.indexOf(nf);
    const j = e.indexOf(nt);
    if (i < 0 || j < 0) return null;
    const d = j - i;
    return { fond: f, texte: t, ecart: `${Math.abs(d)} cran${Math.abs(d) > 1 ? 's' : ''}${d < 0 ? ', texte plus clair que le fond' : ''}${alpha}, échelle 50 à 950` };
  }
  if (l.systeme === 'Adobe Spectrum 2') return { fond: f, texte: t, ecart: `${(nt - nf) / 100} crans de 100 (fond dans l'échelle du ton, texte dans celle du gris)` };
  if (l.systeme === 'Material 3') return { fond: f, texte: t, ecart: `${Math.abs(nt - nf)} tons (échelle tonale 0 à 100)` };
  return { fond: f, texte: t, ecart: 'échelle nommée, écart non compté' };
}

/* ------------------------------------------------------------------ tableaux */

const VERSIONS = {
  'Radix Themes': () => '3.3.0',
  Atlassian: (l) => ({ Lozenge: 'lozenge 17.0.5', 'Section message': 'section-message 10.2.6', Button: 'button 25.4.7' }[l.composant] ?? 'tokens 20.4.1'),
  'GitHub Primer': () => 'react 38.40.1',
  'Shopify Polaris': () => '13.9.5',
  'Microsoft Fluent 2': (l) => ({ Badge: 'react-badge 9.5.6', MessageBar: 'react-message-bar 9.7.7', Button: 'react-button 9.11.1' }[l.composant]),
  'Material 3': () => '@material/web 2.5.0',
  'Material UI': () => '9.5.0',
  'Adobe Spectrum 2': () => 's2 740c6c5, jetons 14.15.0',
  'Tremor (Tailwind CSS)': () => 'ca4d588, Tailwind 4.1.3',
  'IBM Carbon': () => 'themes 11.83.0',
  'Untitled UI (kit Figma)': () => 'kit v2.0',
};
const cle = (l) => `${l.systeme}|${l.composant}|${l.variante}`;

const hexAff = (e) => {
  const h = e.hex ?? e.hexCalcule;
  return h ? `${h}${e.translucide || e.calcule ? '~' : ''}` : '?';
};
const alphaAff = (e) => (e.translucide && e.alpha !== undefined && e.alpha > 0 ? ` α${Math.round(e.alpha * 100)} %` : '');

/** Cellule d'une couleur : jeton, hexa, pas. */
function cellule(e) {
  if (!e) return '-';
  if (!e.token && e.note) return `(${e.note})`;
  const jeton = e.token.length > 46 ? `${e.token.slice(0, 45)}…` : e.token;
  const pas = e.pas !== undefined ? ` [${e.pas}]` : '';
  return `\`${jeton}\` ${hexAff(e)}${alphaAff(e)}${pas}`;
}
/** Cellule d'un état : fond, texte si présent, ou la note. */
function celluleEtat(s) {
  if (!s) return '-';
  if (!s.fond) return s.note ? `(${s.note})` : '-';
  const t = s.texte ? `, texte ${hexAff(s.texte)}` : '';
  const f = s.filtre ? `, plus \`filter: ${s.filtre}\`` : '';
  return `${cellule(s.fond)}${t}${f}`;
}
const num = (x) => (x === undefined ? '-' : x.toFixed(2));

function tableau(type) {
  const rows = toutes.filter((l) => l.type === type && TONS_AFFICHES.has(l.ton));
  const avecEtats = type === 'bouton-teinte' || type === 'bouton-plein';
  const entete = ['Système, composant, variante', 'Thème', 'Ton', 'Fond', 'Texte', 'Contour']
    .concat(avecEtats ? ['Survol', 'Appui'] : [])
    .concat(['Texte/fond', 'Fond/page', 'Fond/carte']);
  const lignes = [`| ${entete.join(' | ')} |`, `|${entete.map(() => '---').join('|')}|`];
  for (const l of rows) {
    const v = VERSIONS[l.systeme]?.(l);
    const nom = `${l.systeme} ${v ?? ''} : ${l.composant} ${l.variante}`.replace(/\s+/g, ' ');
    const cols = [nom, l.theme, l.ton, cellule(l.fond), cellule(l.texte), l.contour ? `${cellule(l.contour)}${l.contour.epaisseur ? ` (${l.contour.epaisseur})` : ''}` : '-'];
    if (avecEtats) cols.push(celluleEtat(l.survol), celluleEtat(l.appui));
    cols.push(num(l.contrasteTexteFond), num(l.contrasteFondPage), num(l.contrasteFondCarte));
    lignes.push(`| ${cols.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`);
  }
  return lignes.join('\n');
}

function tableauEcarts(type) {
  const groupes = new Map();
  for (const l of toutes.filter((x) => x.type === type && TONS_AFFICHES.has(x.ton))) {
    const e = ecart(l);
    if (!e) continue;
    const famille = l.variante.replace(/ (danger|success|warning)$/, '').replace(/color=\w+/, 'color=ton');
    const k = `${l.systeme}|${l.composant}|${famille}|${l.theme}|${e.fond}|${e.texte}`;
    const g = groupes.get(k) ?? { l, e, famille, tons: new Set() };
    g.tons.add(l.ton);
    groupes.set(k, g);
  }
  if (groupes.size === 0) return '_Aucun pas de fond et de texte comparables dans ce type : les systèmes lus n\'ont ni échelle numérotée ni pas nommé pour les deux._';
  const lignes = ['| Système, composant, variante | Thème | Tons | Pas du fond | Pas du texte | Écart |', '|---|---|---|---|---|---|'];
  for (const { l, e, famille, tons } of groupes.values()) {
    lignes.push(`| ${l.systeme} : ${l.composant} ${famille} | ${l.theme} | ${[...tons].join(', ')} | ${e.fond} | ${e.texte} | ${e.ecart} |`);
  }
  return lignes.join('\n');
}

/* ------------------------------------------------------------------ écriture */

mkdirSync(new URL('processed/', dossier), { recursive: true });
const sortie = {
  genereLe: 'extract.mjs (voir ../ANALYSE-COMPOSANTS-A-SURFACE.md)',
  methode: 'Valeurs lues dans sources/ et dans les fichiers repris ; hexa calculé = composition d\'une couleur translucide sur son support, couche d\'état, formule de Material UI ou conversion oklch ; contraste = WCAG 2, luminance relative standard, arrondi à 0,01.',
  sources: Object.values(parId).map((s) => ({ id: s.id, version: s.revision, fichier: s.localFile, sha256: s.sha256, reutilise: s.reutilise === true })),
  lignes: toutes,
};
writeFileSync(new URL('processed/composants.json', dossier), JSON.stringify(sortie, null, 2) + '\n');

const md = new URL('../ANALYSE-COMPOSANTS-A-SURFACE.md', dossier);
if (existsSync(md)) {
  let t = readFileSync(md, 'utf8');
  for (const [type] of TYPES) {
    t = t.replace(new RegExp(`(<!-- tableau:${type} -->\\n)[\\s\\S]*?(\\n<!-- /tableau -->)`), (_, a, b) => `${a}${tableau(type)}${b}`);
    t = t.replace(new RegExp(`(<!-- ecart:${type} -->\\n)[\\s\\S]*?(\\n<!-- /ecart -->)`), (_, a, b) => `${a}${tableauEcarts(type)}${b}`);
  }
  writeFileSync(md, t);
}
console.log(`${toutes.length} lignes écrites.`);
