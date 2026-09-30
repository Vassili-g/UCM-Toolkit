/** Les bornes de la fenêtre, pour des bornes quelconques. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { creerRedimensionnement, lireTaille, rangerTaille, tailleValide, type BornesFenetre, type TailleFenetre } from '../src/fenetre';

const BORNES: BornesFenetre = { defaut: { largeur: 600, hauteur: 720 }, minimale: { largeur: 440, hauteur: 520 }, cle: 'essai' };

test('une taille sous le minimum remonte au minimum, axe par axe', () => {
  assert.deepEqual(tailleValide({ largeur: 70, hauteur: 900 }, BORNES), { largeur: 440, hauteur: 900 });
});

test('une valeur qui n’est pas un nombre fini retombe sur le défaut', () => {
  assert.deepEqual(tailleValide({ largeur: Number.NaN, hauteur: undefined }, BORNES), BORNES.defaut);
  assert.deepEqual(tailleValide(null, BORNES), BORNES.defaut);
});

test('la taille se range et se relit sous la clé du plugin, bornée', async () => {
  const stockage = new Map<string, unknown>();
  (globalThis as unknown as { figma: unknown }).figma = {
    clientStorage: {
      getAsync: async (cle: string) => stockage.get(cle),
      setAsync: async (cle: string, valeur: unknown) => { stockage.set(cle, valeur); },
    },
  };
  await rangerTaille({ largeur: 100.6, hauteur: 800 }, BORNES);
  assert.deepEqual(stockage.get('essai'), { largeur: 440, hauteur: 800 });
  assert.deepEqual(await lireTaille(BORNES), { largeur: 440, hauteur: 800 });
});

test('Z9.3 un geste de la poignée redimensionne à chaque taille nouvelle, bornée, et ne se range qu’une fois, à sa taille finale', async () => {
  const appliquees: TailleFenetre[] = [];
  const rangees: TailleFenetre[] = [];
  const fenetre = creerRedimensionnement((brut) => tailleValide(brut, BORNES), (taille) => appliquees.push(taille), async (taille) => { rangees.push(taille); });
  fenetre.poser({ largeur: 600, hauteur: 720 });
  for (const [largeur, hauteur] of [[640, 720], [640, 720], [300, 700], [200, 700]]) await fenetre.demander({ largeur, hauteur, fin: false });
  await fenetre.demander({ largeur: 700.4, hauteur: 760, fin: true });
  assert.deepEqual(appliquees, [
    { largeur: 600, hauteur: 720 },
    { largeur: 640, hauteur: 720 },
    { largeur: 440, hauteur: 700 },
    { largeur: 700, hauteur: 760 },
  ], 'une taille égale à la taille en cours ne s’applique pas ; le minimum borne');
  assert.deepEqual(rangees, [{ largeur: 700, hauteur: 760 }]);
  await fenetre.demander({ largeur: 650, hauteur: 700 });
  assert.deepEqual(rangees.at(-1), { largeur: 650, hauteur: 700 }, 'une demande sans `fin` se range, comme d’une interface antérieure');
});
