/**
 * Les variables écrites par UCM Palettes se renomment quand le fichier porte la marque `nommage` de Palettes et que l'écriture est
 * rangée en v2. La marque se lit à la racine de `ESPACE_PARTAGE` ; les règles se relisent au moment d'écrire.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CLE_NOMMAGE_DE_PALETTES, ESPACE_PARTAGE } from '@ucm-kit/core/referentiel';
import { annulerLeDernierRenommage, appliquerLesRenommages, creerPortEcriture, type PortDeRegles, type RenommageDemande } from '../src/ecriture/noms';
import { type EtatDeLaMarque } from '@ucm-kit/core/protocoles';
import { lireInventaire } from '../src/nomenclature/lecture';
import { creerPortDeLecture, lecteurDeVariablesFigma } from '../src/nomenclature/lectureFigma';

const ECRITURE = JSON.stringify({ version: 1, groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } });
const V1 = JSON.stringify({ version: 1, termesUcm: true, conventions: { groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } } });
const HEURE = '2026-10-19T10:00:00.000Z';
const MARQUE = '{"version":1}';
const REGLES: readonly (readonly [string, string])[] = [['ecriture', ECRITURE]];
const ID_P0 = JSON.stringify(['variable', 'p0']);

/** Un fichier inventé : une collection, une variable de Palettes (`p0`, donnée `palette` rangée) et une variable ordinaire (`v1`). */
function fichier(options: { marque?: string; regles?: readonly (readonly [string, string])[] } = {}) {
  const noms = new Map<string, string>([['p0', 'colors/Poppy/vivid/light/50'], ['v1', 'button/size/big']]);
  const lectures: string[] = [];
  const variable = (id: string, palette: string) => ({
    id, remote: false, variableCollectionId: 'c', valuesByMode: {},
    get name() { return noms.get(id)!; },
    set name(valeur: string) { noms.set(id, valeur); },
    getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_PARTAGE && cle === 'palette' ? palette : ''),
  });
  const variables = [variable('p0', 'poppy'), variable('v1', '')];
  const api = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [{ id: 'c', name: 'Primitives', remote: false }],
      getLocalVariablesAsync: async () => variables,
    },
    root: {
      getSharedPluginData: (espace: string, cle: string) => {
        lectures.push(`${espace}/${cle}`);
        return espace === ESPACE_PARTAGE && cle === CLE_NOMMAGE_DE_PALETTES ? options.marque ?? '' : '';
      },
    },
    commitUndo: () => {},
  } as unknown as PluginAPI;
  const stock = new Map<string, string>(options.regles ?? []);
  const stockage: PortDeRegles = {
    cles: () => [...stock.keys()],
    lire: (cle) => stock.get(cle) ?? '',
    ecrire: (cle, texte) => { stock.set(cle, texte); },
    effacer: (cle) => { stock.delete(cle); },
  };
  const demande = (id: string, nouveauNom: string): RenommageDemande => ({
    type: 'variable', id: JSON.stringify(['variable', id]), figmaId: id, collectionId: 'c', ancienNom: noms.get(id)!, nouveauNom,
  });
  return { api, noms, lectures, stock, stockage, demande };
}

test('la marque nommage se lit une fois à la racine de l’espace partagé, avec la version 1', () => {
  const f = fichier({ marque: MARQUE });
  const lecteur = lecteurDeVariablesFigma(f.api, []);
  assert.equal(lecteur.marqueDePalettes?.(), 'courante');
  assert.equal(lecteur.marqueDePalettes?.(), 'courante');
  assert.equal(f.lectures.filter((lecture) => lecture === `${ESPACE_PARTAGE}/${CLE_NOMMAGE_DE_PALETTES}`).length, 1);
  const attendus: readonly (readonly [string, EtatDeLaMarque])[] = [['', 'absente'], ['{"version":2}', 'future'], ['pas du json', 'illisible'], ['[]', 'illisible']];
  for (const [marque, etat] of attendus) assert.equal(lecteurDeVariablesFigma(fichier({ marque }).api, []).marqueDePalettes?.(), etat, marque);
});

test('une racine qui refuse la lecture donne une marque refusée, pas une marque absente', () => {
  const f = fichier({ marque: MARQUE });
  (f.api.root as unknown as { getSharedPluginData: () => string }).getSharedPluginData = () => { throw new Error('refus'); };
  assert.equal(lecteurDeVariablesFigma(f.api, []).marqueDePalettes?.(), 'refusee');
});

test('l’inventaire lu par le port porte la marque, et la protection de la variable reste un fait brut', async () => {
  for (const [marque, attendu] of [[MARQUE, 'courante'], ['', 'absente']] as const satisfies readonly (readonly [string, EtatDeLaMarque])[]) {
    const inventaire = await lireInventaire(creerPortDeLecture(fichier({ marque }).api), { pause: async () => {} });
    assert.equal(inventaire.marque, attendu);
    assert.deepEqual(inventaire.entrees.filter((entree) => entree.protegee).map((entree) => entree.nom.nom), ['colors/Poppy/vivid/light/50']);
  }
});

test('l’inventaire de l’écriture porte la marque', async () => {
  assert.equal((await creerPortEcriture(fichier({ marque: MARQUE }).api).ouvrir()).inventaire.marque, 'courante');
  assert.equal((await creerPortEcriture(fichier().api).ouvrir()).inventaire.marque, 'absente');
});

test('marque et écriture rangée : la variable de Palettes est renommée, et l’annulation la remet', async () => {
  const f = fichier({ marque: MARQUE, regles: REGLES });
  const session = await creerPortEcriture(f.api).ouvrir();
  const resultat = appliquerLesRenommages({ demandes: [f.demande('p0', 'Color/Poppy/Vivid/Light/50')], session, stockage: f.stockage, heure: () => HEURE });
  assert.equal(resultat.statut, 'applique');
  assert.deepEqual(resultat.sautes, []);
  assert.equal(f.noms.get('p0'), 'Color/Poppy/Vivid/Light/50');
  const annulation = annulerLeDernierRenommage({ session: await creerPortEcriture(f.api).ouvrir(), stockage: f.stockage });
  assert.equal(annulation.statut, 'applique');
  assert.equal(f.noms.get('p0'), 'colors/Poppy/vivid/light/50');
});

test('sans marque, la variable de Palettes est sautée même avec une écriture rangée', async () => {
  const f = fichier({ regles: REGLES });
  const session = await creerPortEcriture(f.api).ouvrir();
  const resultat = appliquerLesRenommages({ demandes: [f.demande('p0', 'Color/Poppy/Vivid/Light/50'), f.demande('v1', 'Button/size/big2')], session, stockage: f.stockage, heure: () => HEURE });
  assert.deepEqual(resultat.sautes, [{ id: ID_P0, motif: 'protegee' }]);
  assert.equal(f.noms.get('p0'), 'colors/Poppy/vivid/light/50');
  assert.equal(f.noms.get('v1'), 'Button/size/big2');
});

test('avec la marque mais sans écriture rangée, la variable de Palettes est sautée', async () => {
  const cas: readonly (readonly (readonly [string, string])[])[] = [[], [['conventions', V1]], [['ecriture', '{pas du json']]];
  for (const regles of cas) {
    const f = fichier({ marque: MARQUE, regles });
    const session = await creerPortEcriture(f.api).ouvrir();
    const resultat = appliquerLesRenommages({ demandes: [f.demande('p0', 'Color/Poppy/Vivid/Light/50')], session, stockage: f.stockage, heure: () => HEURE });
    assert.deepEqual(resultat.sautes, [{ id: ID_P0, motif: 'protegee' }], JSON.stringify(regles));
    assert.equal(f.noms.get('p0'), 'colors/Poppy/vivid/light/50');
  }
});

test('les règles se relisent au moment d’écrire : une écriture retirée depuis la lecture remet la protection', async () => {
  const f = fichier({ marque: MARQUE, regles: REGLES });
  const session = await creerPortEcriture(f.api).ouvrir();
  f.stock.delete('ecriture');
  const resultat = appliquerLesRenommages({ demandes: [f.demande('p0', 'Color/Poppy/Vivid/Light/50')], session, stockage: f.stockage, heure: () => HEURE });
  assert.deepEqual(resultat.sautes, [{ id: ID_P0, motif: 'protegee' }]);
  assert.equal(f.noms.get('p0'), 'colors/Poppy/vivid/light/50');
});

test('un stockage de règles illisible laisse la protection', async () => {
  const f = fichier({ marque: MARQUE, regles: REGLES });
  const session = await creerPortEcriture(f.api).ouvrir();
  const illisible: PortDeRegles = { ...f.stockage, cles: () => { throw new Error('refus'); } };
  const resultat = appliquerLesRenommages({ demandes: [f.demande('p0', 'Color/Poppy/Vivid/Light/50')], session, stockage: illisible, heure: () => HEURE });
  assert.deepEqual(resultat.sautes.map(({ motif }) => motif), ['protegee']);
});
