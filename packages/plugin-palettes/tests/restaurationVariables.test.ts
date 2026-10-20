/** Une écriture sans suivi se défait ; les restaurations refusées restent nommées. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { jsonCanonique } from 'ucm-couleur';
import { changerReference, remplacerPalette } from '../src/edition';
import { lireLeSuiviRange, lireLesVariablesDuFichier } from '../src/lectureDesVariables';
import { tokensDeLaPalette } from '../src/variables/gestion';
import { texteDuSuivi } from '../src/variables/suivi';
import { FausseVariable } from './figmaDeTest';
import { api, autre, bleu, ecrire, fichierDuLot } from './lotDeTest';

const commits = (figma: ReturnType<typeof fichierDuLot>['figma']) => figma.journal.filter((ligne) => ligne === 'commitUndo').length;

for (const neuve of [false, true]) {
  test(`un suivi refusé défait toutes les créations, collection neuve ${neuve}`, async () => {
    const { figma, recette } = fichierDuLot([bleu], neuve);
    if (neuve) {
      const suivi = lireLeSuiviRange(figma.root);
      figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...suivi, destination: { ...suivi.destination, themes: 'modes' } }));
    }
    const suivi = figma.root.getSharedPluginData('ucm_palettes', 'variables');
    figma.rangementsRefuses.add('ucm_palettes/variables');
    const resultat = await ecrire(figma, recette);
    assert.ok(resultat.issue === 'defaite');
    assert.deepEqual(resultat.restes, []);
    assert.equal(figma.locales.size, 0);
    assert.equal(figma.collections.size, neuve ? 0 : 1);
    assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'variables'), suivi);
    assert.equal(commits(figma), 0);
  });
}

test('un suivi refusé après mise à jour rétablit les couleurs suivies', async () => {
  const { figma, recette } = fichierDuLot([bleu]);
  await ecrire(figma, recette);
  const avant = [...figma.locales.values()].map((variable) => structuredClone(variable.valuesByMode));
  const changee = remplacerPalette(recette, changerReference(recette, bleu, '#22A66F')!);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(changee));
  figma.journal.length = 0;
  figma.rangementsRefuses.add('ucm_palettes/variables');
  const resultat = await ecrire(figma, changee);
  assert.ok(resultat.issue === 'defaite');
  assert.deepEqual([...figma.locales.values()].map((variable) => variable.valuesByMode), avant);
  assert.deepEqual(tokensDeLaPalette(changee, changee.palettes[0], await lireLesVariablesDuFichier(api(figma))).modifiees, []);
  assert.equal(commits(figma), 0);
});

/** Sans règles de nommage, le plan porte les noms bruts : une variable tiers qui ne diffère que par la casse se remplace et prend le nom du plan. */
function fichierSansReglesAvecUnTiers() {
  const fichier = fichierDuLot([bleu]);
  fichier.figma.root.setSharedPluginData('ucm_architect', 'ecriture', '');
  const tiers = fichier.figma.variables.createVariable('Colors/ocean-blue/Soft/light/50', fichier.collection!, 'COLOR');
  fichier.figma.journal.length = 0;
  return { ...fichier, tiers };
}

test('un suivi refusé après un remplacement rend à la variable tiers son nom, ses couleurs et ses marqueurs vides', async () => {
  const { figma, recette, tiers } = fichierSansReglesAvecUnTiers();
  const couleurs = structuredClone(tiers.valuesByMode);
  figma.rangementsRefuses.add('ucm_palettes/variables');
  const resultat = await ecrire(figma, recette, undefined, [bleu.id]);
  assert.ok(resultat.issue === 'defaite');
  assert.ok(figma.journal.includes('renommer variable Colors/ocean-blue/Soft/light/50 -> colors/Ocean-Blue/soft/light/50'));
  assert.deepEqual(resultat.restes, []);
  assert.deepEqual([...figma.locales.keys()], [tiers.id]);
  assert.equal(tiers.name, 'Colors/ocean-blue/Soft/light/50');
  assert.deepEqual(tiers.valuesByMode, couleurs);
  assert.deepEqual([tiers.getSharedPluginData('ucm_palettes', 'palette'), tiers.getSharedPluginData('ucm_palettes', 'cle')], ['', '']);
  assert.equal(commits(figma), 0);
});

test('une création refusée au milieu d’une palette retire ses créations, et les autres palettes continuent', async () => {
  const { figma, recette } = fichierDuLot([bleu, { ...autre, nom: 'Cuivre' }]);
  figma.echouerALaCreation = 10;
  const resultat = await ecrire(figma, recette);
  assert.ok(resultat.issue === 'ecrites');
  assert.deepEqual(resultat.palettes.map((issue) => issue.issue), ['interrompue', 'ecrite']);
  assert.ok(resultat.palettes[0].issue === 'interrompue' && resultat.palettes[0].restes === undefined);
  assert.equal(figma.locales.size, 44);
  assert.ok([...figma.locales.values()].every((variable) => variable.name.startsWith('Color/Cuivre/')));
  assert.equal(commits(figma), 1);
  assert.deepEqual(Object.keys(lireLeSuiviRange(figma.root).palettes), [autre.id]);
});

test('une restauration refusée laisse la variable tiers changée, la décrit, et clôt le geste par un commitUndo', async () => {
  const { figma, recette, tiers } = fichierSansReglesAvecUnTiers();
  const renommer = Object.getOwnPropertyDescriptor(FausseVariable.prototype, 'name')!;
  Object.defineProperty(tiers, 'name', {
    configurable: true,
    get: () => renommer.get!.call(tiers) as string,
    set: (nom: string) => {
      if (nom === 'Colors/ocean-blue/Soft/light/50') throw new Error('renommage refusé');
      renommer.set!.call(tiers, nom);
    },
  });
  figma.echouerAuMarqueur = 0;
  const resultat = await ecrire(figma, recette, undefined, [bleu.id]);
  assert.ok(resultat.issue === 'ecrites');
  const [issue] = resultat.palettes;
  assert.ok(issue.issue === 'interrompue');
  assert.deepEqual(issue.restes, [{ reste: 'variable-changee', id: tiers.id, nom: 'colors/Ocean-Blue/soft/light/50' }]);
  assert.deepEqual([...figma.locales.keys()], [tiers.id]);
  assert.equal(commits(figma), 1);
  // La variable restée porte le nom du plan : le plan suivant la propose au remplacement.
  const suivant = tokensDeLaPalette(recette, bleu, await lireLesVariablesDuFichier(api(figma)));
  assert.deepEqual(suivant.variablesExistantes, [tiers.id]);
});

test('un marqueur refusé pendant un remplacement rétablit la variable tiers et continue le lot', async () => {
  const { figma, collection, recette } = fichierDuLot([bleu, { ...autre, nom: 'Cuivre' }]);
  const variable = figma.variables.createVariable('Color/OceanBlue/Soft/Light/50', collection!, 'COLOR');
  const avant = structuredClone(variable.valuesByMode);
  figma.echouerAuMarqueur = 0;
  const resultat = await ecrire(figma, recette, undefined, [bleu.id]);
  assert.ok(resultat.issue === 'ecrites');
  assert.equal(resultat.palettes[0].issue, 'interrompue');
  assert.equal(resultat.palettes[1].issue, 'ecrite');
  assert.deepEqual(variable.valuesByMode, avant);
  assert.equal(variable.getSharedPluginData('ucm_palettes', 'palette'), '');
  assert.equal(commits(figma), 1);
});

test('un retrait refusé après échec de valeur nomme chaque variable restée hors suivi', async () => {
  const { figma, recette } = fichierDuLot([bleu]);
  figma.echouerALaValeur = 0;
  figma.retraitsRefuses = true;
  const resultat = await ecrire(figma, recette);
  assert.ok(resultat.issue === 'ecrites' && resultat.palettes[0].issue === 'interrompue');
  assert.equal(resultat.palettes[0].restes?.length, figma.locales.size);
  assert.ok(figma.locales.size > 0);
  assert.equal(commits(figma), 1);
  const tokens = tokensDeLaPalette(recette, bleu, await lireLesVariablesDuFichier(api(figma)));
  assert.equal(tokens.existantes.length, figma.locales.size);
});

test('un suivi et des retraits refusés rendent les restes et un seul commitUndo', async () => {
  const { figma, recette } = fichierDuLot([bleu]);
  figma.rangementsRefuses.add('ucm_palettes/variables');
  figma.retraitsRefuses = true;
  const resultat = await ecrire(figma, recette);
  assert.ok(resultat.issue === 'defaite');
  assert.equal(resultat.restes.filter((reste) => reste.reste === 'variable-creee').length, 44);
  assert.equal(commits(figma), 1);
});
