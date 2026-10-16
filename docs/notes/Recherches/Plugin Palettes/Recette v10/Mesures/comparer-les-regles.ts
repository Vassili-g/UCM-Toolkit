/**
 * Les paires « trop proches » d'une recette exportée, avec l'ancienne règle (pleins Light et Dark,
 * texte sur fond teinté Light, seuil `palettesProches`) et la nouvelle (pleins au seuil, fonds Light
 * et Dark à la part du seuil que fixe le moteur). Chaque paire nomme la lecture qui la signale.
 *
 * `npx tsx comparer-les-regles.ts <recette.json>` ; `DETAIL=1` écrit les cinq distances de chaque paire.
 */
import { readFileSync } from 'node:fs';
import { cranDeLaVariable, sensDuTheme } from '@ucm-kit/core/emplois';
import * as M from '../../../../../../packages/couleur/src/index';
import type { Mode, Palette, Recette } from '../../../../../../packages/couleur/src/index';

const LECTURES = [
  { cle: 'plein Light', variable: 'solid/default', mode: 'light', ancienne: true, nouvelle: 'plein' },
  { cle: 'plein Dark', variable: 'solid/default', mode: 'dark', ancienne: true, nouvelle: 'plein' },
  { cle: 'texte Light', variable: 'surface/foreground', mode: 'light', ancienne: true, nouvelle: null },
  { cle: 'fond Light', variable: 'surface/default', mode: 'light', ancienne: false, nouvelle: 'fond' },
  { cle: 'fond Dark', variable: 'surface/default', mode: 'dark', ancienne: false, nouvelle: 'fond' },
] as const;

function couleurs(recette: Recette, palette: Palette): M.Rgb8[] | null {
  if (!M.nuancesDeProximite(recette, palette)) return null;
  const { crans } = M.grilleDe(recette, palette);
  const rampe = M.rampeDe(M.rampesDe(recette, palette), M.aUneIntensite(palette) ? 'unique' : 'vivid');
  const sortie: M.Rgb8[] = [];
  for (const { variable, mode } of LECTURES) {
    const cran = cranDeLaVariable(variable, mode as Mode, sensDuTheme(mode as Mode, recette.texteDesBoutons[mode as Mode]));
    const rang = typeof cran === 'number' ? crans.indexOf(cran) : -1;
    if (rang < 0) return null;
    sortie.push(rampe[mode as Mode][rang].couleur);
  }
  return sortie;
}

function lire(chemin: string | undefined): Recette {
  if (!chemin) throw new Error('Donner le chemin d’une recette exportée.');
  const classement = M.classerRecette(readFileSync(chemin, 'utf8')) as { etat: string; recette?: Recette };
  if (!classement.recette) throw new Error(`Recette illisible : ${classement.etat}`);
  return classement.recette;
}

const recette = lire(process.argv[2]);
const seuil = recette.seuils.palettesProches;
const nom = (palette: Palette) => (palette as { nom?: string }).nom ?? palette.reference;
const lues = recette.palettes.map((palette) => ({ palette, couleurs: couleurs(recette, palette) }));
const anciennes: string[] = [];
const nouvelles: string[] = [];
lues.forEach((a, i) => lues.slice(i + 1).forEach((b) => {
  if (!a.couleurs || !b.couleurs) return;
  const d = LECTURES.map((_, rang) => M.distanceOk(a.couleurs![rang], b.couleurs![rang]));
  const paire = `${nom(a.palette)} et ${nom(b.palette)}`;
  if (process.env.DETAIL) console.log(`${paire} : ${LECTURES.map((l, rang) => `${l.cle} ${d[rang].toFixed(4)}`).join(', ')}`);
  const vieux = LECTURES.map((l, rang) => ({ l, r: d[rang] / seuil, d: d[rang] })).filter(({ l }) => l.ancienne).sort((x, y) => x.r - y.r)[0];
  if (vieux.d < seuil) anciennes.push(`${paire} (${vieux.l.cle} ${vieux.d.toFixed(4)})`);
  const neuf = LECTURES.map((l, rang) => ({ l, s: M.seuilDeProximite(seuil, l.nouvelle as 'plein' | 'fond'), d: d[rang] })).filter(({ l }) => l.nouvelle).sort((x, y) => x.d / x.s - y.d / y.s)[0];
  if (neuf.d < neuf.s) nouvelles.push(`${paire} (${neuf.l.cle} ${neuf.d.toFixed(4)})`);
}));
console.log(`${recette.palettes.length} palettes, ${lues.filter((l) => l.couleurs).length} comparées, seuil ${seuil}`);
console.log(`Ancienne règle : ${anciennes.length} paires\n  ${anciennes.join('\n  ')}`);
console.log(`Nouvelle règle : ${nouvelles.length} paires\n  ${nouvelles.join('\n  ')}`);
