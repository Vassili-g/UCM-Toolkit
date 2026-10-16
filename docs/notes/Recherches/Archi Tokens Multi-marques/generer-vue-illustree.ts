/** Convertit un export DTCG en données du panneau, sans modifier ses valeurs ni ses alias. */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Valeur = string | Record<string, string>;
type Noeud = Record<string, unknown>;

const chemin = process.argv[2];
if (!chemin) throw new Error('Usage : npx tsx generer-vue-illustree.ts <tokens.json> [sortie.js]');
const source = JSON.parse(readFileSync(chemin, 'utf8')) as Noeud;
const collections: Record<string, Record<string, Valeur>> = {};
const modes: Record<string, string[]> = {};
const axes = (source.$extensions as Noeud | undefined)?.['com.ucm.axes'] as Record<string, { modes: string[] }> | undefined;

/** Le panneau affiche les valeurs simples, les dimensions et les couleurs sRGB en hexadécimal. */
function lireValeur(valeur: unknown): string {
  if (valeur == null) return '∅';
  if (typeof valeur === 'string') return valeur.replace(/^\{(.+)\}$/, '$1');
  if (typeof valeur === 'number' || typeof valeur === 'boolean') return String(valeur);
  const objet = valeur as { colorSpace?: string; components?: number[]; alpha?: number; value?: number; unit?: string };
  if (objet.components && objet.colorSpace === 'srgb') {
    const canaux = objet.components.slice(0, 3);
    if (objet.alpha !== undefined && objet.alpha !== 1) canaux.push(objet.alpha);
    return `#${canaux.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  }
  if (typeof objet.value === 'number') return `${objet.value}${objet.unit ?? ''}`;
  return JSON.stringify(valeur);
}

for (const nom of ['components', 'theme', 'color-brands', 'color-utilities', 'primitives', 'layouts', 'typography']) {
  if (!source[nom]) continue;
  const collection: Record<string, Valeur> = {};
  const nomsDesModes = new Set(axes?.[nom]?.modes ?? []);
  function parcourir(noeud: Noeud, segments: string[]): void {
    if ('$value' in noeud) {
      const valeurs = (noeud.$extensions as Noeud | undefined)?.['com.ucm.modes'] as Noeud | undefined;
      const plusieursModes = valeurs && (Object.keys(valeurs).length > 1 || nomsDesModes.size > 1);
      if (plusieursModes) Object.keys(valeurs).forEach((mode) => nomsDesModes.add(mode));
      collection[segments.join('.')] = plusieursModes
        ? Object.fromEntries(Object.entries(valeurs).map(([mode, valeur]) => [mode, lireValeur(valeur)]))
        : lireValeur(noeud.$value);
      return;
    }
    for (const [cle, enfant] of Object.entries(noeud)) {
      if (!cle.startsWith('$') && enfant && typeof enfant === 'object') parcourir(enfant as Noeud, [...segments, cle]);
    }
  }
  parcourir(source[nom] as Noeud, [nom]);
  collections[nom] = collection;
  if (nomsDesModes.size > 1) modes[nom] = [...nomsDesModes];
}
if (!Object.keys(collections).length) throw new Error('Aucune collection de référence dans cet export.');
const sortie = process.argv[3] ? path.resolve(process.argv[3]) : new URL('./donnees-vue-illustree.js', import.meta.url);
writeFileSync(sortie, `// Généré par generer-vue-illustree.ts ; ne pas modifier à la main.\nwindow.VUE_DONNEES = ${JSON.stringify({ modes, collections })};\n`);
console.log(Object.fromEntries(Object.entries(collections).map(([nom, valeurs]) => [nom, Object.keys(valeurs).length])));
