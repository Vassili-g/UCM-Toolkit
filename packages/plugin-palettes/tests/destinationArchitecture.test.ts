/** La déclaration UCM borne la destination des palettes, hors reprises. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';
import { fnv1a, jsonCanonique, octetsUtf8, recetteParDefaut } from 'ucm-couleur';
import { ajouter, nouvellePalette, reprendreDuFichier } from '../src/edition';
import { ecrireLesVariables, rangerLaDestination, reprendreLaPalette, type FigmaDesVariablesEcrites } from '../src/ecriture/variables';
import { lireLeSuiviRange, lireLesVariablesDuFichier } from '../src/lectureDesVariables';
import { palettesDuFichier } from '../src/variables/detection';
import { validerLaDestination, type Destination } from '../src/variables/destination';
import { texteDuSuivi } from '../src/variables/suivi';
import { FauxFigma } from './figmaDeTest';
import * as fr from '../src/i18n/fr';
import * as en from '../src/i18n/en';

const vide = recetteParDefaut();
const palette = nouvellePalette(vide, 'p-0000000a', '#1E6FD9', 1)!;
const recette = ajouter(vide, palette);
const empreinte = fnv1a(octetsUtf8(jsonCanonique(recette)));
const api = (figma: FauxFigma) => figma as unknown as FigmaDesVariablesEcrites;
const architecture = '{"version":1,"ucm":true}';

function fichier(texte: string, nom: string, neuve: boolean): { figma: FauxFigma; destination: Destination } {
  const figma = new FauxFigma();
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
  figma.root.setSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER, texte);
  const collection = neuve ? { nom } : { id: figma.variables.createVariableCollection(nom).id };
  const destination: Destination = { collection, groupe: 'color', themes: 'modes' };
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lireLeSuiviRange(figma.root), destination, confirmee: true }));
  figma.journal.length = 0;
  return { figma, destination };
}

for (const nom of ['theme', 'Theme', 'brands', 'utility', 'color-utilities', 'COLOR-BRANDS']) {
  for (const neuve of [false, true]) {
    test(`la destination UCM ${nom}, ${neuve ? 'neuve' : 'existante'}, est refusée au rangement sans mutation`, async () => {
      const { figma, destination } = fichier(architecture, nom, neuve);
      const avant = new Map(figma.root.donnees);
      assert.deepEqual(await rangerLaDestination(api(figma), destination), { issue: 'invalide', refus: 'couche', nom });
      assert.deepEqual(figma.root.donnees, avant);
      assert.deepEqual(figma.journal, []);
    });

    test(`la destination UCM ${nom}, ${neuve ? 'neuve' : 'existante'}, est refusée avant toute écriture`, async () => {
      const { figma } = fichier(architecture, nom, neuve);
      const avant = new Map(figma.root.donnees);
      assert.deepEqual(await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte, remettre: [] }), {
        issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'couche-interdite', nom }],
      });
      assert.deepEqual(figma.root.donnees, avant);
      assert.deepEqual(figma.journal.filter((ligne) => !ligne.startsWith('lire ')), []);
    });
  }
}

for (const [texte, nom] of [[architecture, 'primitives'], [architecture, 'Mes couleurs'], ['', 'theme'], ['{"version":1,"ucm":false}', 'brands'], ['illisible', 'utility'], ['{"version":2}', 'theme']]) {
  for (const neuve of [false, true]) {
    test(`la déclaration ${texte || 'absente'} admet ${nom}, ${neuve ? 'neuve' : 'existante'}`, async () => {
      const { figma, destination } = fichier(texte, nom, neuve);
      assert.equal((await rangerLaDestination(api(figma), destination)).issue, 'rangee');
      const resultat = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte, remettre: [] });
      assert.equal(resultat.issue, 'ecrites');
      assert.ok(resultat.issue === 'ecrites' && resultat.palettes[0].issue === 'ecrite');
    });
  }
}

test('une déclaration que Figma refuse de lire garde la destination agnostique', async () => {
  const { figma, destination } = fichier(architecture, 'theme', false);
  const lire = figma.root.getSharedPluginData.bind(figma.root);
  figma.root.getSharedPluginData = (espace, cle) => {
    if (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER) throw new Error('lecture refusée');
    return lire(espace, cle);
  };
  assert.equal((await rangerLaDestination(api(figma), destination)).issue, 'rangee');
  const resultat = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte, remettre: [] });
  assert.ok(resultat.issue === 'ecrites' && resultat.palettes[0].issue === 'ecrite');
});

test('la validation pure admet un nom de couche sans déclaration du fichier', () => {
  const destination: Destination = { collection: { nom: 'theme' }, groupe: '', themes: 'chemin' };
  assert.deepEqual(validerLaDestination(destination), { destination });
});

test('une déclaration UCM activée après le rangement refuse de réécrire des variables déjà suivies', async () => {
  const { figma, destination } = fichier('', 'theme', false);
  assert.equal((await rangerLaDestination(api(figma), destination)).issue, 'rangee');
  const demande = { palettes: [palette.id], empreinteLue: empreinte, remettre: [palette.id] };
  const premiere = await ecrireLesVariables(api(figma), demande);
  assert.ok(premiere.issue === 'ecrites' && premiere.palettes[0].issue === 'ecrite');
  figma.root.setSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER, architecture);
  figma.journal.length = 0;
  const avant = new Map(figma.root.donnees);
  assert.deepEqual(await ecrireLesVariables(api(figma), demande), { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'couche-interdite', nom: 'theme' }] });
  assert.deepEqual(figma.root.donnees, avant);
  assert.deepEqual(figma.journal.filter((ligne) => !ligne.startsWith('lire ')), []);
});

test('les refus de couche nomment la collection et le choix des primitives dans les deux langues', () => {
  assert.deepEqual(fr.refusDeLaDestination('couche', 'Theme'), {
    ou: 'Collection',
    quoi: 'La collection « Theme » est une couche de l’architecture UCM. Elle ne porte que des alias vers les primitives.',
    geste: 'Choisissez la collection des primitives.',
  });
  assert.deepEqual(fr.coucheInterdite('Bleu', 'Theme'), {
    ou: 'Tokens non écrits : Bleu',
    quoi: fr.refusDeLaDestination('couche', 'Theme').quoi,
    geste: 'Changez la destination des tokens : choisissez la collection des primitives.',
  });
  assert.deepEqual(en.refusDeLaDestination('couche', 'Theme'), {
    ou: 'Collection',
    quoi: 'The collection “Theme” is a layer of the UCM architecture. It only holds aliases to the primitives.',
    geste: 'Choose the primitives collection.',
  });
  assert.deepEqual(en.coucheInterdite('Bleu', 'Theme'), {
    ou: 'Tokens not written: Bleu',
    quoi: en.refusDeLaDestination('couche', 'Theme').quoi,
    geste: 'Change the token destination: choose the primitives collection.',
  });
});

test('une reprise UCM dans theme reste écrite dans sa collection d’origine', async () => {
  const { figma, destination } = fichier(architecture, 'theme', false);
  assert.ok('id' in destination.collection);
  const collectionId = destination.collection.id;
  const collection = (await figma.variables.getLocalVariableCollectionsAsync()).find((collection) => collection.id === collectionId)!;
  for (const nuance of [100, 200, 300, 400, 500, 600, 700, 800, 900]) {
    const variable = figma.variables.createVariable(`bleu/${nuance}`, collection, 'COLOR');
    variable.setValueForMode(collection.defaultModeId, { r: 0.1, g: 0.3, b: 0.6, a: 1 });
  }
  figma.root.setSharedPluginData('ucm_palettes', 'recette', '');
  const lues = await lireLesVariablesDuFichier(api(figma));
  const source = palettesDuFichier(lues.variables, lues.collections, new Set())[0];
  assert.ok(source);
  const reprise = reprendreDuFichier(vide, palette.id, source, 'recalculees')!;
  const repriseRangee = ajouter(vide, reprise);
  assert.equal((await reprendreLaPalette(api(figma), { recette: repriseRangee, empreinteLue: null, palette: reprise.id, source: { collection: source.collection, chemin: source.chemin } })).issue, 'reprise');
  const resultat = await ecrireLesVariables(api(figma), { palettes: [reprise.id], empreinteLue: fnv1a(octetsUtf8(jsonCanonique(repriseRangee))), remettre: [reprise.id] });
  assert.ok(resultat.issue === 'ecrites' && resultat.palettes[0].issue === 'ecrite');
  assert.equal(lireLeSuiviRange(figma.root).palettes[reprise.id].collection, collection.id);
});
