/**
 * Convertit un `tokens.json` en `donnees-vue-illustree.js`, les données du panneau de la vue illustrée, sans modifier ses valeurs ni ses alias.
 * Sans argument, il lit `tokens-reference.json`, que `generer-reference.ts` écrit depuis la référence du kit ; `npm run vues` enchaîne les deux.
 * Le test `tests/vueIllustree.test.ts` compare le fichier commité à `genererDonneesVue` appliquée à `tokens-reference.json`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Valeur = string | Record<string, string>;
type Noeud = Record<string, unknown>;

/** Le panneau affiche les valeurs simples, les dimensions et les couleurs sRGB en hexadécimal. */
export function lireValeur(valeur: unknown): string {
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

/** Les données du panneau d'un `tokens.json` : les variables de chaque collection et les modes des collections qui en ont plusieurs. */
export function convertirEnDonnees(source: Noeud): { modes: Record<string, string[]>; collections: Record<string, Record<string, Valeur>> } {
  const collections: Record<string, Record<string, Valeur>> = {};
  const modes: Record<string, string[]> = {};
  const axes = (source.$extensions as Noeud | undefined)?.['com.ucm.axes'] as Record<string, { modes: string[] }> | undefined;
  for (const nom of Object.keys(source).filter((cle) => !cle.startsWith('$') && source[cle] && typeof source[cle] === 'object')) {
    const collection: Record<string, Valeur> = {};
    const nomsDesModes = new Set(axes?.[nom]?.modes ?? []);
    const parcourir = (noeud: Noeud, segments: string[]): void => {
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
    };
    parcourir(source[nom] as Noeud, [nom]);
    collections[nom] = collection;
    if (nomsDesModes.size > 1) modes[nom] = [...nomsDesModes];
  }
  if (!Object.keys(collections).length) throw new Error('Aucune collection de référence dans cet export.');
  return { modes, collections };
}

/** Le contenu exact de `donnees-vue-illustree.js` pour un `tokens.json` déjà analysé. */
export function genererDonneesVue(source: Noeud): string {
  return `// Généré par generer-vue-illustree.ts ; ne pas modifier à la main.\nwindow.VUE_DONNEES = ${JSON.stringify(convertirEnDonnees(source))};\n`;
}

/** Le fichier de référence que `generer-reference.ts` écrit, lu par défaut. */
export const CHEMIN_DE_LA_REFERENCE = path.join(__dirname, 'tokens-reference.json');

if (require.main === module) {
  const chemin = process.argv[2] ? path.resolve(process.argv[2]) : CHEMIN_DE_LA_REFERENCE;
  const sortie = process.argv[3] ? path.resolve(process.argv[3]) : path.join(__dirname, 'donnees-vue-illustree.js');
  const source = JSON.parse(readFileSync(chemin, 'utf8')) as Noeud;
  writeFileSync(sortie, genererDonneesVue(source));
  console.log(Object.fromEntries(Object.entries(convertirEnDonnees(source).collections).map(([nom, valeurs]) => [nom, Object.keys(valeurs).length])));
}
