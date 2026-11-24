/**
 * La vue Structure dit quand `elevation/page` du mode Light n'a pas la couleur du fond que la recette de Palettes règle (PP-406).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CatalogueDeReference } from '@ucm-kit/core/controles';

import type { PluginMessage } from '../src/messages';
import type { Contexte } from '../src/sandbox/contexte';
import { oublierLaLectureGardee, traiterAvec, type Acces } from '../src/sandbox/structure';
import { fondDeLaPageDuThemeClair } from '../src/catalogue';
import { lireLeFondClairDeLaRecette } from '../src/nomenclature/lectureFigma';

const recette = (clair: string): string => JSON.stringify({ formatVersion: 12, fonds: { light: clair, dark: '#0A0A0A' } });
const gris = (octet: number) => ({ r: octet / 255, g: octet / 255, b: octet / 255, a: 1 });

/** Un fichier dont le thème a un mode Light et un mode Dark, et `elevation/page` en couleur directe. */
const catalogueDuFichier = (clair: { r: number; g: number; b: number; a: number }): CatalogueDeReference => ({
  version: 1, library: null,
  collections: [{ cle: 'ct', nom: 'theme', role: 'theme', modes: [{ id: 'm-light', nom: 'Light' }, { id: 'm-dark', nom: 'Dark' }], etat: 'lue' }],
  variables: [{ cle: 'p', nom: 'elevation/page', collection: 'ct', type: 'COLOR', etat: 'presente', valeurs: { 'm-light': { valeur: clair }, 'm-dark': { valeur: gris(10) } } }],
});

async function lireAvec(fondDeLaRecette: Acces['fondDeLaRecette'], catalogue: CatalogueDeReference) {
  oublierLaLectureGardee();
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
  const acces: Acces = {
    catalogue: async () => catalogue,
    reglages: async () => ({ ecriture: null, cles: [] }),
    ecrire: async () => ({ ecrites: [], sautees: [], sansAnnulation: [] }),
    rangement: () => { throw new Error('inutile'); },
    ...(fondDeLaRecette ? { fondDeLaRecette } : {}),
  };
  await traiterAvec(acces)({ type: 'lire-structure', demande: 1 }, contexte);
  return envoyes.at(-1) as Extract<PluginMessage, { type: 'structure' }>;
}

test('[X2] un fond de recette #F7F7F7 et une page #EBEBEB donnent l’information de la page', async () => {
  const message = await lireAvec(() => lireLeFondClairDeLaRecette(() => recette('#F7F7F7')), catalogueDuFichier(gris(0xEB)));
  assert.equal(message.pageDifferente, true);
});

test('[X2] une page de même couleur que le fond de la recette ne donne aucune information', async () => {
  const message = await lireAvec(() => lireLeFondClairDeLaRecette(() => recette('#f7f7f7')), catalogueDuFichier(gris(0xF7)));
  assert.ok(!('pageDifferente' in message));
});

test('[X3] sans recette de Palettes lue, aucune information', async () => {
  const catalogue = catalogueDuFichier(gris(0xEB));
  for (const lue of [() => lireLeFondClairDeLaRecette(() => ''), () => lireLeFondClairDeLaRecette(() => { throw new Error('refusée'); }), () => lireLeFondClairDeLaRecette(() => '{"fonds":{"light":"#F7F7F7"}}')]) {
    assert.ok(!('pageDifferente' in await lireAvec(lue, catalogue)));
  }
  assert.ok(!('pageDifferente' in await lireAvec(undefined, catalogue)));
});

test('[X3] sans mode Light ni variable elevation/page dans le thème, aucune information', async () => {
  const sansLight: CatalogueDeReference = { ...catalogueDuFichier(gris(0xEB)), collections: [{ cle: 'ct', nom: 'theme', role: 'theme', modes: [{ id: 'm-dark', nom: 'Dark' }], etat: 'lue' }] };
  assert.equal(fondDeLaPageDuThemeClair(sansLight), null);
  assert.equal(fondDeLaPageDuThemeClair({ ...catalogueDuFichier(gris(0xEB)), variables: [] }), null);
  assert.equal(fondDeLaPageDuThemeClair(catalogueDuFichier(gris(0xEB))), '#EBEBEB');
});
