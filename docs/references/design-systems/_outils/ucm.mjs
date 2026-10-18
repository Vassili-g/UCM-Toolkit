/**
 * Écrit `ucm/noms.json` (feuilles `$value` de C1, chemins joints par `/`) et
 * `ucm/registres.json` (identifiants et formes tolérées des registres du kit).
 *
 *   node _outils/ucm.mjs [chemin/vers/tokens.json]
 *
 * Par défaut, C1 est `../UCM-Playground/src/tokens/tokens.json`, frère du dépôt.
 * Les registres viennent du kit compilé : lancer `npm run build` avant si
 * `packages/kit/src/referentiel/vocabulaire.ts` a changé.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const racine = new URL('../', import.meta.url);
const depot = new URL('../../../', racine);
const c1 = resolve(process.argv[2] ?? fileURLToPath(new URL('../UCM-Playground/src/tokens/tokens.json', depot)));
mkdirSync(new URL('ucm/', racine), { recursive: true });

const COUCHES = { primitives: 'primitive', components: 'composant' };
const arbre = JSON.parse(readFileSync(c1, 'utf8'));
const noms = [];
const aller = (n, chemin, typeHerite) => {
  if (!n || typeof n !== 'object') return;
  if ('$value' in n) {
    noms.push({ nom: chemin.join('/'), type: n.$type ?? typeHerite ?? null, couche: COUCHES[chemin[0]] ?? null });
    return;
  }
  const type = n.$type ?? typeHerite ?? null;
  for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) aller(v, [...chemin, k], type);
};
aller(arbre, [], null);
const uniques = [...new Map(noms.map((n) => [n.nom, n])).values()].sort((a, b) => (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0));
writeFileSync(new URL('ucm/noms.json', racine), `[\n${uniques.map((n) => `  ${JSON.stringify(n)}`).join(',\n')}\n]\n`);

const { REGISTRES } = await import(pathToFileURL(fileURLToPath(new URL('packages/kit/dist/referentiel/vocabulaire.js', depot))).href);
const registres = REGISTRES.map((r) => ({
  id: r.id,
  extensible: r.extensible,
  termes: r.termes.map((t) => ({ id: t.id, toleres: [...(t.toleres ?? [])] })),
}));
writeFileSync(new URL('ucm/registres.json', racine), JSON.stringify(registres, null, 1) + '\n');
console.log(`${uniques.length} noms C1, ${registres.length} registres`);
