/**
 * Les rampes de la recette par défaut, figées sur vingt références : les dix-sept
 * teintes 500 de Tailwind 3.4, un gris, une couleur très sombre et une pâle.
 *
 * Un changement qui déplace des constantes sans toucher au calcul laisse ce
 * relevé identique à l'octet. Un changement voulu du moteur le régénère :
 * `ECRIRE=1 npx tsx --test tests/instantane.test.ts`, puis relire le diff du
 * fichier figé avant de le commiter.
 *
 * Le second jeu passe le texte des boutons du Dark au blanc : le thème inversé
 * remplace les luminosités 500 à 800 de sa courbe.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { rampesDe, recetteAvecTexteDesBoutons, recetteParDefaut, type Recette } from '../src/index';
import { paletteTailwind } from './fabrique';

const FIGE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'instantane-rampes.json');

const REFERENCES: Readonly<Record<string, string>> = {
  red: '#EF4444', orange: '#F97316', amber: '#F59E0B', yellow: '#EAB308', lime: '#84CC16',
  green: '#22C55E', emerald: '#10B981', teal: '#14B8A6', cyan: '#06B6D4', sky: '#0EA5E9',
  blue: '#3B82F6', indigo: '#6366F1', violet: '#8B5CF6', purple: '#A855F7', fuchsia: '#D946EF',
  pink: '#EC4899', rose: '#F43F5E', gris: '#737373', sombre: '#1E293B', pale: '#FBCFE8',
};

function relever(recette: Recette): Record<string, Record<string, Record<string, string[]>>> {
  return Object.fromEntries(Object.entries(REFERENCES).map(([nom, reference]) => {
    const rampes = rampesDe(recette, paletteTailwind(nom, reference));
    return [nom, Object.fromEntries(Object.entries(rampes).map(([intensite, parMode]) => [
      intensite,
      { light: parMode!.light.map((cran) => cran.hexa), dark: parMode!.dark.map((cran) => cran.hexa) },
    ]))];
  }));
}

function releve() {
  const inverse = recetteAvecTexteDesBoutons(recetteParDefaut(), 'dark', 'blanc');
  if ('refus' in inverse) throw new Error(`Recette inversée refusée : ${inverse.refus}.`);
  return { parDefaut: relever(recetteParDefaut()), darkInverse: relever(inverse.recette) };
}

test('les rampes de la recette par défaut sont celles du relevé figé', () => {
  const actuel = releve();
  if (process.env.ECRIRE === '1') writeFileSync(FIGE, `${JSON.stringify(actuel, null, 1)}\n`);
  assert.deepEqual(actuel, JSON.parse(readFileSync(FIGE, 'utf8')));
});
