/**
 * Loi des icônes : un tracé d'icône s'écrit à un seul endroit par famille. Les signes d'objet vivent dans
 * `packages/kit/src/referentiel/signes.ts` ; les icônes d'alerte, dans `FORMES` de `packages/plugin-socle/src/ui/Alerte.ts`
 * (R-8, QM-11). Toute autre source des dossiers `src` des paquets qui porte un tracé écrit à la main fait échouer le test.
 *
 * Un tracé écrit à la main est un `d` littéral (guillemets ou accents graves sans `${`), une forme de base aux coordonnées
 * littérales, ou un data URI SVG. Un graphique calcule ses coordonnées, un aperçu SVG pose des valeurs mesurées, et une
 * primitive de pose appelle `svgDuSigne` : aucun des trois ne porte de littéral, donc aucun n'est une icône.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import test from 'node:test';

const RACINE = join(__dirname, '..');

/** Les seules définitions d'icône : un chemin relatif à la racine, avec ce que le fichier définit. */
const AUTORITES: Readonly<Record<string, string>> = {
  'packages/kit/src/referentiel/signes.ts': 'signes d\'objet du kit',
  'packages/plugin-socle/src/ui/Alerte.ts': 'icônes d\'alerte (`FORMES`)',
};

/** Les exceptions : un tracé littéral qui n'est pas une icône d'objet ou d'alerte, avec son motif. */
const EXCEPTIONS: Readonly<Record<string, string>> = {
  'packages/plugin-socle/src/ui/socle.css':
    'le chevron des listes déroulantes est un data URI de `--chevron` : une feuille de style ne peut pas appeler le kit',
};

const EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js', '.css', '.html']);

const DONNEES_DE_CHEMIN = /\bd(?:=|:\s*)(["'`])\s*[Mm][^"'`$]*\1/u;
const FORME_LITTERALE = /<(?:circle|ellipse|rect|polygon|polyline|line)\b[^>$]*\b(?:cx|x1|x|points)=["']-?[\d.]/u;
const FORME_EN_OBJET = /\b(?:cx|points)\s*:\s*['"`]-?[\d.][^'"`$]*['"`]/u;
const DATA_URI_SVG = /data:image\/svg\+xml/u;

/** Vrai quand la source écrit un tracé d'icône à la main. */
export function ecritUnTraceALaMain(source: string): boolean {
  return [DONNEES_DE_CHEMIN, FORME_LITTERALE, FORME_EN_OBJET, DATA_URI_SVG].some((motif) => motif.test(source));
}

function sources(dossier: string): string[] {
  const fichiers: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) fichiers.push(...sources(chemin));
    else if (EXTENSIONS.has(nom.slice(nom.lastIndexOf('.')))) fichiers.push(chemin);
  }
  return fichiers;
}

function sourcesDesPaquets(): string[] {
  const paquets = join(RACINE, 'packages');
  return readdirSync(paquets)
    .map((paquet) => join(paquets, paquet, 'src'))
    .filter((dossier) => { try { return statSync(dossier).isDirectory(); } catch { return false; } })
    .flatMap(sources);
}

test('aucune source hors autorité n\'écrit un tracé d\'icône à la main', () => {
  const fautives = sourcesDesPaquets()
    .map((chemin) => relative(RACINE, chemin).split(sep).join('/'))
    .filter((chemin) => !(chemin in AUTORITES) && !(chemin in EXCEPTIONS))
    .filter((chemin) => ecritUnTraceALaMain(readFileSync(join(RACINE, chemin), 'utf8')));
  assert.deepEqual(fautives, [], 'Ces sources définissent une icône : la ranger dans le kit (signes.ts) ou dans FORMES du socle, ou déclarer une exception avec son motif.');
});

test('chaque autorité et chaque exception existe, et porte encore un tracé littéral', () => {
  for (const chemin of [...Object.keys(AUTORITES), ...Object.keys(EXCEPTIONS)]) {
    assert.ok(ecritUnTraceALaMain(readFileSync(join(RACINE, chemin), 'utf8')), `${chemin} ne porte plus de tracé littéral : retirer l'entrée.`);
  }
  for (const [chemin, motif] of Object.entries(EXCEPTIONS)) assert.ok(motif.length > 20, `${chemin} : motif manquant`);
});

test('cas fabriqués : une icône ajoutée hors autorité est refusée', () => {
  assert.equal(ecritUnTraceALaMain('const ICONE = `<svg viewBox="0 0 12 12"><path d="M1 1l4 5"/></svg>`;'), true);
  assert.equal(ecritUnTraceALaMain("noeud('path', { d: 'M6 .6l5.6 10.4H.4z', fill: 'currentColor' })"), true);
  assert.equal(ecritUnTraceALaMain('<svg><circle cx="6" cy="6" r="5"/></svg>'), true);
  assert.equal(ecritUnTraceALaMain("{ balise: 'circle', attributs: { cx: '6', cy: '9' } }"), true);
  assert.equal(ecritUnTraceALaMain('background: url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E");'), true);
});

test('cas fabriqués : un graphique, un aperçu SVG et une primitive de pose sont acceptés', () => {
  const graphique = 'return `<svg viewBox="0 0 ${l} ${h}"><polyline points="${pts}" fill="none"/></svg>`;';
  const courbe = "element('path', { d: `M ${x} ${y - 6} L ${x + 6} ${y}` })";
  const apercu = 'return `<svg viewBox="0 0 24 24"><rect width="24" height="24" fill="${hex}"/></svg>`;';
  const pose = 'element.innerHTML = svgDuSigne(id, COTE_DU_TRACE[taille]);';
  for (const source of [graphique, courbe, apercu, pose]) assert.equal(ecritUnTraceALaMain(source), false, source);
});
