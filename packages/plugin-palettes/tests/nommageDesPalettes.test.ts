/** Palettes nomme ses variables selon les règles de nommage du fichier, comme UCM Nomenclature : mêmes règles, même calcul, mêmes noms. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { fnv1a, jsonCanonique, lireHexa, octetsUtf8, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { inventaireDeLectures } from 'ucm-plugin-socle/src/inventaireDeNoms';
import { nomsSelonLesReglesSync } from '@ucm-kit/core/nommage';
import { lireReglesDeNommage } from '@ucm-kit/core/protocoles';

import { ajouter, nouvellePalette, remplacerPalette, renommer, reprendreDuFichier, revenirAuModele } from '../src/edition';
import { convertirLaReprise, ecrireLesVariables, reprendreLaPalette, type FigmaDesVariablesEcrites } from '../src/ecriture/variables';
import { rangerLaMarqueDeNommage } from '../src/ecriture/marque';
import { lireLesVariablesDuFichier, lireLeSuiviRange } from '../src/lectureDesVariables';
import type { Destination } from '../src/variables/destination';
import { palettesDuFichier } from '../src/variables/detection';
import { ecartsDeLaReprise, restesNommes, tokensDeLaPalette, type TokensDUnePalette } from '../src/variables/gestion';
import { planDuLot } from '../src/variables/lot';
import { conversionDeLaReprise } from '../src/variables/conversion';
import { creerNommeur, nommeurDuFichier, planDeLaPalette, type DonneesDeNommage } from '../src/variables/nommeur';
import { cleDuPlan, nommerLePlan, nomsDuPlan, planDesVariables } from '../src/variables/plan';
import { texteDuSuivi, variablesSuivies } from '../src/variables/suivi';
import { detailDeLaReprise } from '../src/ui/detailDesTokens';
import { creerLocalisation, lireTexte } from '../src/ui/localisation';
import { FauxFigma, type FausseCollection } from './figmaDeTest';
import { verifierLaLoiDuLot } from './lotDeTest';

const VIDE = recetteParDefaut();
const POPPY: Palette = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9', 2)!, nom: 'Poppy' };
const UNIQUE: Palette = { ...nouvellePalette(VIDE, 'p-0000000b', '#6B7280', 1)!, nom: 'Titan' };
const RECETTE: Recette = [POPPY, UNIQUE].reduce(ajouter, VIDE);
const TAILWIND = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const GRIS = ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617'];

/** PascalCase pour les groupes, minuscules et tirets pour les variables : l'écriture que les tests d'UCM Nomenclature emploient. */
const ECRITURE = JSON.stringify({ version: 1, groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } });
const COUPLES: readonly (readonly [string, string])[] = [['ecriture', ECRITURE]];

const api = (figma: FauxFigma) => figma as unknown as FigmaDesVariablesEcrites;
const empreinte = (recette: Recette): string => fnv1a(octetsUtf8(jsonCanonique(recette)));
const composantes = (hexa: string) => {
  const [r, g, b] = lireHexa(hexa)!;
  return { r: r / 255, g: g / 255, b: b / 255, a: 1 };
};

function poserLesRegles(figma: FauxFigma, couples: readonly (readonly [string, string])[] = COUPLES): void {
  for (const [cle, texte] of couples) figma.root.setSharedPluginData('ucm_architect', cle, texte);
}

/** Un fichier qui porte la recette, la destination `colors` dans `Primitives`, et, si demandé, les règles de nommage. */
function fichier(options: { regles?: boolean; themes?: Destination['themes']; recette?: Recette } = {}): { figma: FauxFigma; collection: FausseCollection } {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Primitives');
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(options.recette ?? RECETTE));
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lireLeSuiviRange(figma.root), destination: { collection: { id: collection.id }, groupe: 'colors', themes: options.themes ?? 'chemin' }, confirmee: true }));
  if (options.regles !== false) poserLesRegles(figma);
  figma.journal.length = 0;
  return { figma, collection };
}

async function ecrire(figma: FauxFigma, palettes: readonly Palette[], options: { remplacer?: readonly Palette[]; recette?: Recette } = {}) {
  const recette = options.recette ?? RECETTE;
  const resultat = await ecrireLesVariables(api(figma), { palettes: palettes.map(({ id }) => id), empreinteLue: empreinte(recette), remettre: [], remplacer: (options.remplacer ?? []).map(({ id }) => id) });
  assert.equal(resultat.issue, 'ecrites');
  return resultat.issue === 'ecrites' ? resultat.palettes : [];
}

const noms = (figma: FauxFigma): string[] => [...figma.locales.values()].map((variable) => variable.name);

/** Les données de nommage d'un fichier inventé : une collection `Primitives`, ses variables, et d'autres collections de composants. */
function donnees(variables: readonly string[] = [], couples: readonly (readonly [string, string])[] = COUPLES): DonneesDeNommage {
  return {
    couples,
    collections: [{ id: 'c1', nom: 'Primitives' }, { id: 'c2', nom: 'Components' }],
    variables: [
      ...variables.map((nom, rang) => ({ id: `v${rang}`, nom, collection: 'c1' })),
      { id: 'c-1', nom: 'button/sizes/big/border-radius', collection: 'c2' },
      { id: 'c-2', nom: 'button/sizes/small/border-radius', collection: 'c2' },
    ],
  };
}
const destination = (groupe: string, themes: Destination['themes'] = 'chemin'): Destination => ({ collection: { id: 'c1' }, groupe, themes });

test('[VAR-07] avec l’écriture PascalCase du fichier, les groupes de la destination s’écrivent Color/Poppy/Vivid/Light/50 et les nuances restent des nombres', () => {
  const nommer = creerNommeur(donnees())!.pour({ id: 'c1' })!;
  const brut = planDesVariables(RECETTE, POPPY, destination('colors'));
  assert.ok(brut.some((entree) => entree.nom === 'colors/Poppy/vivid/light/50'));
  const plan = planDesVariables(RECETTE, POPPY, destination('colors'), undefined, undefined, [], nommer);
  assert.deepEqual(plan.map((entree) => entree.cle), brut.map((entree) => entree.cle));
  const finals = nomsDuPlan(plan);
  assert.equal(finals.length, 44);
  for (const attendu of ['Color/Poppy/Soft/Light/50', 'Color/Poppy/Vivid/Light/50', 'Color/Poppy/Vivid/Dark/950']) assert.ok(finals.includes(attendu), `${attendu} absent de ${finals.slice(0, 3).join(' | ')}`);
  assert.ok(finals.every((nom) => nom.startsWith('Color/Poppy/')), 'colors devient color, terme du référentiel UCM');
});

test('[VAR-10] thèmes en modes : Light et Dark d’une nuance gardent le même nom final', () => {
  const nommer = creerNommeur(donnees())!.pour({ id: 'c1' })!;
  const plan = planDesVariables(RECETTE, POPPY, destination('colors', 'modes'), undefined, undefined, [], nommer);
  assert.deepEqual(nomsDuPlan(plan).slice(0, 2), ['Color/Poppy/Soft/50', 'Color/Poppy/Soft/100']);
  assert.equal(nomsDuPlan(plan).length, 22);
  assert.equal(plan.find((entree) => entree.cle === cleDuPlan('vivid', 'dark', 50))!.nom, plan.find((entree) => entree.cle === cleDuPlan('vivid', 'light', 50))!.nom);
});

test('[VAR-10] reprise aux thèmes en modes : la variable d’origine, portée par la seule entrée Light, reçoit le nom final pour les deux entrées', () => {
  const nommer = creerNommeur(donnees(['color/Azur/50']))!.pour({ id: 'c1' })!;
  const entree = (mode: 'light' | 'dark') => ({ cle: cleDuPlan('vivid', mode, 50), nom: 'color/Azur/50', mode, hexa: '#FFFFFF' });
  const plan = nommerLePlan([entree('light'), entree('dark')], nommer, (cle) => (cle === cleDuPlan('vivid', 'light', 50) ? 'v0' : undefined));
  assert.deepEqual(plan.map((entree) => entree.nom), ['Color/Azur/50', 'Color/Azur/50']);
});

test('[VAR-07] sans règles enregistrées, ou avec la seule clé de la v1, le plan garde ses noms bruts', () => {
  assert.equal(creerNommeur(donnees([], []))?.pour({ id: 'c1' }), undefined);
  const v1 = JSON.stringify({ version: 1, termesUcm: true, conventions: { groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } } });
  assert.equal(creerNommeur(donnees([], [['conventions', v1]])), undefined);
  assert.equal(nommeurDuFichier({}), undefined);
  const brut = planDesVariables(RECETTE, POPPY, destination('colors'));
  assert.deepEqual(planDeLaPalette(undefined, RECETTE, POPPY, destination('colors'), undefined, null, new Map(), new Map()), brut);
});

test('[VAR-07] dans une collection que les règles excluent, le plan garde ses noms bruts', () => {
  const exclue: readonly (readonly [string, string])[] = [...COUPLES, ['exclues', JSON.stringify({ version: 1, ids: ['c1'] })]];
  const nommeur = creerNommeur(donnees([], exclue))!;
  assert.equal(nommeur.pour({ id: 'c1' }), undefined);
  assert.ok(nommeur.pour({ id: 'c2' }));
  const plan = planDeLaPalette(nommeur, RECETTE, POPPY, destination('colors'), undefined, null, new Map(), new Map([['c1', 'Primitives']]));
  assert.ok(plan.every((entree) => entree.nom.startsWith('colors/Poppy/')));
});

test('[VAR-08] une collection à créer se nomme sous son nom, et les noms sont les mêmes que dans une collection du fichier', () => {
  const nommeur = creerNommeur(donnees())!;
  const dansLaNouvelle = nomsDuPlan(planDesVariables(RECETTE, POPPY, { collection: { nom: 'Nouvelle' }, groupe: 'colors', themes: 'chemin' }, undefined, undefined, [], nommeur.pour({ nom: 'Nouvelle' })));
  assert.deepEqual(dansLaNouvelle, nomsDuPlan(planDesVariables(RECETTE, POPPY, destination('colors'), undefined, undefined, [], nommeur.pour({ id: 'c1' }))));
  assert.equal(dansLaNouvelle[0], 'Color/Poppy/Soft/Light/50');
});

test('[VAR-07] liaison destination : une première écriture crée les variables sous leurs noms finaux, et la suivante ne change rien', async () => {
  const { figma } = fichier();
  const premiere = await ecrire(figma, [POPPY]);
  assert.deepEqual(premiere, [{ palette: POPPY.id, issue: 'ecrite', creees: 44, ecrites: 44 }]);
  assert.ok(noms(figma).includes('Color/Poppy/Vivid/Light/50'));
  assert.ok(noms(figma).every((nom) => nom.startsWith('Color/Poppy/')), noms(figma).slice(0, 3).join(' | '));
  const avant = noms(figma);
  figma.journal.length = 0;
  assert.deepEqual(await ecrire(figma, [POPPY]), [{ palette: POPPY.id, issue: 'ecrite', creees: 0, ecrites: 0 }]);
  assert.deepEqual(noms(figma), avant);
  assert.deepEqual(figma.journal.filter((ligne) => /créer|valeur|renommer/.test(ligne)), []);
  const fichierLu = await lireLesVariablesDuFichier(api(figma));
  assert.equal(tokensDeLaPalette(RECETTE, POPPY, fichierLu).etat, 'a-jour');
});

test('[VAR-07] aller-retour : les noms qu’UCM Nomenclature applique à des variables écrites sans règles sont ceux que le plan de Palettes donne', async () => {
  const { figma } = fichier({ regles: false });
  await ecrire(figma, [POPPY]);
  poserLesRegles(figma);
  // Palettes n'a pas encore renommé : le plan reste à jour, les variables suivies gardent leur nom du fichier.
  assert.deepEqual(await ecrire(figma, [POPPY]), [{ palette: POPPY.id, issue: 'ecrite', creees: 0, ecrites: 0 }]);
  assert.ok(noms(figma).every((nom) => nom.startsWith('colors/Poppy/')));
  // UCM Nomenclature, par le calcul du socle, renomme le fichier.
  const lues = [...figma.locales.values()];
  const inventaire = inventaireDeLectures([...figma.collections.values()], lues, { cibleAlias: () => undefined, protegee: () => false, palette: () => 'p' });
  const { resultat } = nomsSelonLesReglesSync(inventaire, lireReglesDeNommage(COUPLES)!, []);
  const nouveaux = new Map(resultat.renommages.map((renommage) => [renommage.id, renommage.nouveauNom]));
  for (const variable of lues) variable.name = nouveaux.get(JSON.stringify(['variable', variable.id])) ?? variable.name;
  const apresNomenclature = noms(figma);
  assert.ok(apresNomenclature.includes('Color/Poppy/Vivid/Light/50'));
  // Le plan de Palettes retrouve ces noms, et rien n'est à créer ni à écrire.
  const lu = await lireLesVariablesDuFichier(api(figma));
  const jetons = tokensDeLaPalette(RECETTE, POPPY, lu);
  assert.equal(jetons.etat, 'a-jour');
  assert.deepEqual([jetons.aCreer, jetons.existantes], [[], []]);
  const plan = planDeLaPalette(nommeurDuFichier(lu), RECETTE, POPPY, lu.suivi.destination, lu.suivi.palettes[POPPY.id], null, new Map(lu.variables.map((variable) => [variable.id, variable])), new Map(lu.collections.map((collection) => [collection.id, collection])));
  assert.deepEqual(new Set(nomsDuPlan(plan)), new Set(apresNomenclature));
  figma.journal.length = 0;
  assert.deepEqual(await ecrire(figma, [POPPY]), [{ palette: POPPY.id, issue: 'ecrite', creees: 0, ecrites: 0 }]);
  assert.deepEqual(noms(figma), apresNomenclature);
});

test('[VAR-05] le groupe de la destination passe de colors à Color sur un fichier déjà renommé : les palettes restent à jour, et l’écriture ne défait aucun nom', async () => {
  for (const regles of [true, false]) {
    const { figma } = fichier({ regles: false });
    await ecrire(figma, [POPPY]);
    // Le fichier porte les noms d'UCM Nomenclature ; sans règles enregistrées, Palettes ne sait pas les calculer.
    for (const variable of figma.locales.values()) variable.name = variable.name.replace(/^colors\//, 'Color/').replace(/\/(soft|vivid)\/(light|dark)\//, (_, intensite: string, theme: string) => `/${intensite[0].toUpperCase()}${intensite.slice(1)}/${theme[0].toUpperCase()}${theme.slice(1)}/`);
    if (regles) poserLesRegles(figma);
    const suivi = lireLeSuiviRange(figma.root);
    figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...suivi, destination: { ...suivi.destination, groupe: 'Color' } }));
    const avant = noms(figma);
    assert.ok(avant.includes('Color/Poppy/Vivid/Light/50'));
    const jetons = tokensDeLaPalette(RECETTE, POPPY, await lireLesVariablesDuFichier(api(figma)));
    assert.deepEqual([jetons.etat, jetons.destinationChangee, jetons.existantes.length], ['a-jour', false, 0], `règles : ${regles}`);
    assert.deepEqual(await ecrire(figma, [POPPY]), [{ palette: POPPY.id, issue: 'ecrite', creees: 0, ecrites: 0 }]);
    assert.deepEqual(noms(figma), avant);
  }
});

test('[VAR-07] sans règles, la première écriture garde les noms bruts', async () => {
  const { figma } = fichier({ regles: false });
  await ecrire(figma, [POPPY]);
  assert.ok(noms(figma).includes('colors/Poppy/vivid/light/50'));
  assert.equal(noms(figma).filter((nom) => nom.startsWith('Color')).length, 0);
});

test('[VAR-07] deux palettes écrites ensemble portent les noms que l’écriture d’une seule leur donne', async () => {
  const { figma } = fichier();
  await ecrire(figma, [POPPY, UNIQUE]);
  const ensemble = noms(figma).sort();
  const seule = fichier();
  await ecrire(seule.figma, [UNIQUE]);
  await ecrire(seule.figma, [POPPY]);
  assert.deepEqual(noms(seule.figma).sort(), ensemble);
  assert.ok(ensemble.includes('Color/Titan/Light/50'));
});

test('[VAR-10] thèmes en modes : une variable par nuance et par intensité, sans segment de thème', async () => {
  const { figma } = fichier({ themes: 'modes' });
  await ecrire(figma, [POPPY]);
  assert.equal(figma.locales.size, 22);
  assert.ok(noms(figma).includes('Color/Poppy/Vivid/50'));
});

test('[VAR-08] une variable du fichier qui porte le nom brut du plan est reconnue comme nom pris, et se remplace sur confirmation', async () => {
  const { figma, collection } = fichier();
  figma.variables.createVariable('colors/Poppy/vivid/light/50', collection, 'COLOR');
  const refus = await ecrire(figma, [POPPY]);
  assert.deepEqual(refus, [{ palette: POPPY.id, issue: 'nom-pris', nom: 'colors/Poppy/vivid/light/50' }]);
  assert.equal(figma.locales.size, 1);
  const remplacee = await ecrire(figma, [POPPY], { remplacer: [POPPY] });
  assert.deepEqual(remplacee, [{ palette: POPPY.id, issue: 'ecrite', creees: 43, ecrites: 44 }]);
});

test('[VAR-08] une variable du fichier qui porte déjà le nom final du plan est reconnue comme nom pris', async () => {
  const { figma, collection } = fichier();
  figma.variables.createVariable('Color/Poppy/Vivid/Light/50', collection, 'COLOR');
  const refus = await ecrire(figma, [POPPY]);
  assert.deepEqual(refus, [{ palette: POPPY.id, issue: 'nom-pris', nom: 'Color/Poppy/Vivid/Light/50' }]);
});

/** Un fichier qui porte la rampe `chemin` (11 nuances, un mode), sans recette ni règles. */
function fichierAvecUneRampe(chemin: string): { figma: FauxFigma; collection: FausseCollection } {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Primitives');
  TAILWIND.forEach((nuance, rang) => figma.variables.createVariable(`${chemin}/${nuance}`, collection, 'COLOR').setValueForMode(collection.defaultModeId, composantes(GRIS[rang])));
  figma.journal.length = 0;
  return { figma, collection };
}

async function reprendre(figma: FauxFigma): Promise<{ recette: Recette; palette: Palette }> {
  const lu = await lireLesVariablesDuFichier(api(figma));
  const [source] = palettesDuFichier(lu.variables, lu.collections, variablesSuivies(lu.suivi, new Set()));
  const groupe = source.chemin.split('/').slice(0, -1).join('/');
  // Les thèmes en modes : la palette reprise garde le nom de ses variables, sans segment de thème.
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lu.suivi, destination: { ...lu.suivi.destination, groupe, themes: 'modes' } }));
  const palette = reprendreDuFichier(VIDE, 'p-000000a1', source, 'recalculees')!;
  const recette = ajouter(VIDE, palette);
  const issue = await reprendreLaPalette(api(figma), { recette, empreinteLue: null, palette: palette.id, source: { collection: source.collection, chemin: source.chemin } });
  assert.equal(issue.issue, 'reprise');
  return { recette, palette };
}

test('[VAR-13] liaison reprise : les renommages dus aux règles gardent l’état et l’écriture leur donne leur nom final', async () => {
  const { figma } = fichierAvecUneRampe('colors/Azur');
  const { recette, palette } = await reprendre(figma);
  const sansRegles = tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma)));
  poserLesRegles(figma);
  const avant = await tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma)));
  assert.equal(avant.etat, sansRegles.etat);
  assert.deepEqual(avant.aRenommer, TAILWIND.map((nuance) => ({ id: figma.variable(`colors/Azur/${nuance}`).id, de: `colors/Azur/${nuance}`, vers: `Color/Azur/${nuance}`, cause: 'regles' })));
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(noms(figma), TAILWIND.map((nuance) => `Color/Azur/${nuance}`));
  const apres = tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma)));
  assert.deepEqual(apres.aRenommer, []);
  assert.deepEqual(apres.aCreer, []);
  assert.deepEqual(apres.nomsOccupes, []);
});

test('[VAR-13] liaison reprise : un fichier dont UCM Nomenclature a déjà écrit les noms finaux n’a aucune variable à renommer', async () => {
  const { figma } = fichierAvecUneRampe('Color/Azur');
  poserLesRegles(figma);
  const { recette, palette } = await reprendre(figma);
  const fichierLu = await lireLesVariablesDuFichier(api(figma));
  const lues = tokensDeLaPalette(recette, palette, fichierLu);
  assert.deepEqual(lues.aRenommer, []);
  assert.deepEqual(lues.aCreer, []);
  figma.journal.length = 0;
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(figma.journal.filter((ligne) => ligne.startsWith('créer variable')), []);
  assert.deepEqual(noms(figma), TAILWIND.map((nuance) => `Color/Azur/${nuance}`));
});

test('[VAR-13] liaison reprise : un renommage de forme reste à faire sous les règles, vers le nom final', async () => {
  // Les thèmes dans le chemin : la forme demande un segment `light` que les variables d'origine n'ont pas.
  const { figma } = fichierAvecUneRampe('colors/Azur');
  poserLesRegles(figma);
  const { recette, palette } = await reprendre(figma);
  const lu = await lireLesVariablesDuFichier(api(figma));
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lu.suivi, destination: { ...lu.suivi.destination, themes: 'chemin' } }));
  const avant = tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma)));
  assert.deepEqual([avant.etat, avant.aRenommer.length, avant.aRenommer[0]], ['a-mettre-a-jour', 11, { id: figma.variable('colors/Azur/50').id, de: 'colors/Azur/50', vers: 'Color/Azur/Light/50', cause: 'forme' }]);
});

test('[VAR-13] liaison reprise : un fichier sans règles garde ses noms', async () => {
  const { figma } = fichierAvecUneRampe('colors/Azur');
  const { recette, palette } = await reprendre(figma);
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(noms(figma), TAILWIND.map((nuance) => `colors/Azur/${nuance}`));
});

test('[VAR-13] liaison reprise : les nuances ajoutées se créent sous les noms finaux, à côté des variables d’origine renommées', async () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Primitives');
  TAILWIND.slice(0, 9).forEach((nuance, rang) => figma.variables.createVariable(`Color/Azur/${nuance}`, collection, 'COLOR').setValueForMode(collection.defaultModeId, composantes(GRIS[rang])));
  poserLesRegles(figma);
  const { recette, palette } = await reprendre(figma);
  const commune = revenirAuModele(recette, palette);
  const elargie = remplacerPalette(recette, commune);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(elargie));
  const jetons = tokensDeLaPalette(elargie, commune, await lireLesVariablesDuFichier(api(figma)));
  assert.deepEqual(jetons.aCreer, ['Color/Azur/900', 'Color/Azur/950']);
  assert.deepEqual(jetons.aRenommer, []);
  await ecrireLesVariables(api(figma), { palettes: [commune.id], empreinteLue: empreinte(elargie), remettre: [] });
  assert.equal(figma.locales.size, 11);
  assert.ok(noms(figma).includes('Color/Azur/950'));
  assert.equal(tokensDeLaPalette(elargie, commune, await lireLesVariablesDuFichier(api(figma))).etat, 'a-jour');
});

test('[VAR-13] « Passer au format du plugin » annonce et donne aux variables reprises les noms finaux de la destination', async () => {
  const { figma, collection } = fichierAvecUneRampe('colors/Azur');
  poserLesRegles(figma);
  const { recette, palette } = await reprendre(figma);
  const suivi = lireLeSuiviRange(figma.root);
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...suivi, destination: { collection: { id: collection.id }, groupe: 'colors', themes: 'chemin' }, confirmee: true }));
  // L'annonce de l'onglet Création se calcule sur le fichier lu, comme `rendreLaConversion`.
  const lu = await lireLesVariablesDuFichier(api(figma));
  const annonce = conversionDeLaReprise(recette, palette, lu.suivi.palettes[palette.id], lu.suivi.destination, lu.variables, nommeurDuFichier(lu)?.pour({ id: collection.id }));
  assert.deepEqual(annonce.aRenommer[0] && { de: annonce.aRenommer[0].de, vers: annonce.aRenommer[0].vers }, { de: 'colors/Azur/50', vers: 'Color/Azur/Light/50' });
  const issue = await convertirLaReprise(api(figma), { palette: palette.id, empreinteLue: empreinte(recette) });
  assert.deepEqual(issue, { issue: 'convertie', renommees: 11, enPlace: true });
  assert.deepEqual(noms(figma), TAILWIND.map((nuance) => `Color/Azur/Light/${nuance}`));
});

test('[VAR-04] la lecture du fichier porte les données de nommage seulement quand les règles sont enregistrées', async () => {
  const { figma } = fichier({ regles: false });
  assert.equal((await lireLesVariablesDuFichier(api(figma))).nommage, undefined);
  poserLesRegles(figma, [['conventions', JSON.stringify({ version: 1, termesUcm: true, conventions: {} })], ['autre', 'x']]);
  assert.equal((await lireLesVariablesDuFichier(api(figma))).nommage, undefined);
  figma.root.setSharedPluginData('ucm_architect', 'conventions', '');
  figma.root.setSharedPluginData('ucm_architect', 'autre', '');
  poserLesRegles(figma);
  await ecrire(figma, [UNIQUE]);
  const lu = await lireLesVariablesDuFichier(api(figma));
  assert.deepEqual(lu.nommage?.couples, COUPLES);
  assert.equal(lu.nommage?.collections.length, 1);
  assert.equal(lu.nommage?.variables.length, 22);
  assert.ok(lu.nommage?.variables.every((variable) => variable.palette === UNIQUE.id), 'la donnée partagée palette est lue');
  // L'interface calcule les mêmes noms que l'écriture, sur ces données seules.
  const tokens = tokensDeLaPalette(RECETTE, UNIQUE, lu);
  assert.equal(tokens.etat, 'a-jour');
  const jamaisEcrite = tokensDeLaPalette(RECETTE, POPPY, lu);
  assert.deepEqual(jamaisEcrite.aCreer.slice(0, 2), ['Color/Poppy/Soft/Light/50', 'Color/Poppy/Soft/Light/100']);
});

test('[VAR-04] la détection relit une palette aux segments Vivid et Light que Palettes vient d’écrire', async () => {
  const { figma } = fichier();
  await ecrire(figma, [POPPY]);
  const lu = await lireLesVariablesDuFichier(api(figma));
  const trouvees = palettesDuFichier(lu.variables, lu.collections, new Set());
  assert.ok(trouvees.length > 0, 'au moins une palette est détectée');
  assert.deepEqual([...new Set(trouvees.map((palette) => palette.chemin.split('/').slice(0, 2).join('/')))], ['Color/Poppy']);
  assert.ok(trouvees.some((palette) => /\/(Vivid|Soft)\//.test(`${palette.chemin}/`)), trouvees.map((palette) => palette.chemin).join(' | '));
});

/** La ligne « Tokens Figma » d'une palette reprise, dans la langue demandée. */
const ligneDeLaReprise = (tokens: TokensDUnePalette, langue: 'fr' | 'en' = 'fr'): string => lireTexte(detailDeLaReprise(creerLocalisation(langue), tokens));
const renommagesJournalises = (figma: FauxFigma): string[] => figma.journal.filter((ligne) => ligne.startsWith('renommer variable '));

test('[UI-34] une reprise dont des couleurs changent et dont un renommage de forme reste à faire nomme créations, couleurs et renommages sur sa ligne', async () => {
  // Les thèmes dans le chemin : la forme demande un segment `light` que les variables d'origine n'ont pas, et un thème Dark à créer.
  const { figma } = fichierAvecUneRampe('colors/Azur');
  poserLesRegles(figma);
  const { recette, palette } = await reprendre(figma);
  const lu = await lireLesVariablesDuFichier(api(figma));
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lu.suivi, destination: { ...lu.suivi.destination, themes: 'chemin' } }));
  const avant = tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma)));
  assert.equal(avant.etat, 'a-mettre-a-jour');
  assert.ok(avant.aRenommer.every(({ cause }) => cause === 'forme'));
  assert.deepEqual(ecartsDeLaReprise(avant).map(({ ecart }) => ecart), ['creations', 'couleurs', 'renommages']);
  assert.equal(ligneDeLaReprise(avant), 'Primitives / colors/Azur · Thèmes dans le chemin · 11 variables à créer · 11 couleurs sur 22 changent · 11 variables à renommer');
  assert.equal(ligneDeLaReprise(avant, 'en'), 'Primitives / colors/Azur · Themes in paths · 11 variables to create · 11 colors out of 22 change · 11 variables to rename');
});

test('[UI-34] une reprise dont les couleurs changent et dont le nom brut passe sous les règles annonce les renommages, les fait, et passe à jour', async () => {
  const { figma } = fichierAvecUneRampe('colors/Azur');
  const { recette, palette } = await reprendre(figma);
  poserLesRegles(figma);
  const avant = tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma)));
  assert.equal(avant.etat, 'a-mettre-a-jour');
  assert.equal(avant.aRenommer.length, 11);
  assert.ok(avant.aRenommer.every(({ cause }) => cause === 'regles'));
  assert.deepEqual(ecartsDeLaReprise(avant).map(({ ecart }) => ecart), ['couleurs', 'renommages']);
  assert.match(ligneDeLaReprise(avant), / couleurs sur \d+ changent · 11 variables à renommer$/);
  // L'encart cite ce nombre et le premier renommage.
  assert.equal(lireTexte(creerLocalisation('fr').messages.texteDuRenommage(avant.aRenommer.length, avant.aRenommer[0].de, avant.aRenommer[0].vers)), '11 variables d’origine seront renommées : colors/Azur/50 devient Color/Azur/50, et les autres de la même façon. Elles gardent leurs liaisons.');
  figma.journal.length = 0;
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.equal(renommagesJournalises(figma).length, 11);
  assert.deepEqual(noms(figma), TAILWIND.map((nuance) => `Color/Azur/${nuance}`));
  assert.equal(tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma))).etat, 'a-jour');
});

test('[UI-34] une reprise dont les couleurs sont égales et dont le nom brut passe sous les règles reste à jour, et sa ligne ne parle d’aucun renommage', async () => {
  const { figma } = fichierAvecUneRampe('colors/Azur');
  const { recette, palette } = await reprendre(figma);
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  poserLesRegles(figma);
  figma.journal.length = 0;
  const apres = tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma)));
  assert.equal(apres.etat, 'a-jour');
  assert.equal(apres.aRenommer.length, 11);
  assert.ok(apres.aRenommer.every(({ cause }) => cause === 'regles'));
  assert.equal(ligneDeLaReprise(apres), 'Primitives / colors/Azur · Thèmes en modes · 11 variables');
  assert.equal(ligneDeLaReprise(apres, 'en'), 'Primitives / colors/Azur · Themes in modes · 11 variables');
});

test('[VAR-07] une palette de la destination dont le nom brut passe sous les règles annonce et fait aucun renommage, et nomme l’écart pour UCM Nomenclature', async () => {
  const { figma } = fichier({ regles: false });
  await ecrire(figma, [POPPY]);
  poserLesRegles(figma);
  figma.journal.length = 0;
  const lu = await lireLesVariablesDuFichier(api(figma));
  const tokens = tokensDeLaPalette(RECETTE, POPPY, lu);
  assert.equal(tokens.etat, 'a-jour');
  assert.deepEqual(tokens.aRenommer, []);
  assert.equal(tokens.ecartsLaissesANomenclature.length, 44);
  assert.deepEqual(tokens.ecartsLaissesANomenclature[0], { id: figma.variable('colors/Poppy/soft/light/50').id, nom: 'colors/Poppy/soft/light/50', plan: 'Color/Poppy/Soft/Light/50' });
  assert.deepEqual(await ecrire(figma, [POPPY]), [{ palette: POPPY.id, issue: 'ecrite', creees: 0, ecrites: 0 }]);
  assert.deepEqual(renommagesJournalises(figma), []);
  assert.ok(noms(figma).every((nom) => nom.startsWith('colors/Poppy/')));
});

test('[UI-34] ce que l’écriture n’a pas pu défaire se nomme variable par variable, mode et collection compris', () => {
  assert.deepEqual(restesNommes([
    { reste: 'variable-creee', id: 'v1', nom: 'Color/Ocean/50' },
    { reste: 'variable-changee', id: 'v2', nom: 'Color/Ocean/100' },
    { reste: 'mode', collection: 'Primitives', mode: 'Dark' },
    { reste: 'collection-creee', id: 'c1', nom: 'Primitives' },
  ]), [
    { nom: 'Color/Ocean/50', variable: true },
    { nom: 'Color/Ocean/100', variable: true },
    { nom: 'Dark', variable: false },
    { nom: 'Primitives', variable: false },
  ]);
});

// Une reprise renomme ses variables sous le groupe configuré, et une palette de la destination crée les mêmes noms : la première palette du lot les tient.
for (const repriseEnPremier of [true, false]) {
  test(`[VAR-07] [VAR-13] ${repriseEnPremier ? 'reprise puis destination' : 'destination puis reprise'} : la seconde palette est refusée avant toute mutation, et une reprise refusée ne renomme rien`, async () => {
    const { figma, collection } = fichierAvecUneRampe('anciens/Azur');
    const { palette: reprisee } = await reprendre(figma);
    // La palette reprise porte un autre nom que le dernier segment de son chemin d'origine : seul ce segment décide de ses noms.
    const reprise = renommer(reprisee, 'Mon bleu');
    const lu = await lireLesVariablesDuFichier(api(figma));
    figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lu.suivi, destination: { ...lu.suivi.destination, collection: { id: collection.id }, groupe: 'colors' } }));
    const rivale: Palette = { ...nouvellePalette(VIDE, 'p-000000a2', '#6B7280', 1)!, nom: 'Azur' };
    const recette = (repriseEnPremier ? [reprise, rivale] : [rivale, reprise]).reduce(ajouter, VIDE);
    figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
    const plan = planDuLot(recette, await lireLesVariablesDuFichier(api(figma)), { palettes: [reprise.id, rivale.id], remettre: [], remplacer: [] });
    const [premiere, seconde] = plan.palettes;
    assert.equal(premiere.decision, 'ecrire');
    assert.equal(seconde.decision, 'nom-pris');
    figma.journal.length = 0;
    const resultat = await ecrireLesVariables(api(figma), { palettes: [reprise.id, rivale.id], empreinteLue: empreinte(recette), remettre: [], remplacer: [] });
    assert.ok(resultat.issue === 'ecrites');
    const [ecrite, refusee] = resultat.palettes;
    assert.equal(refusee.issue, 'nom-pris');
    assert.deepEqual(refusee.issue === 'nom-pris' ? [refusee.nom, refusee.occupant] : null, ['colors/Azur/50', { palette: (repriseEnPremier ? reprise : rivale).id, dansLeLot: true }]);
    assert.equal(ecrite.issue, 'ecrite');
    if (repriseEnPremier) {
      assert.deepEqual(noms(figma), TAILWIND.map((nuance) => `colors/Azur/${nuance}`));
      assert.equal(figma.journal.filter((ligne) => ligne.startsWith('renommer variable ')).length, 11);
      assert.deepEqual(figma.journal.filter((ligne) => ligne.startsWith('créer variable ')), []);
    } else {
      // La reprise refusée ne renomme rien : ses variables gardent leurs noms d'origine.
      assert.deepEqual(figma.journal.filter((ligne) => ligne.startsWith('renommer variable ')), []);
      assert.equal(figma.locales.size, 22);
      assert.equal([...figma.locales.values()].filter((variable) => variable.name.startsWith('anciens/Azur/')).length, 11);
    }
    assert.equal(figma.journal.filter((ligne) => ligne === 'commitUndo').length, 1);
    await verifierLaLoiDuLot(figma, plan);
  });
}

test('la marque nommage se range une fois, ne remplace pas une marque existante, et un fichier en lecture seule ne la refuse pas', () => {
  const figma = new FauxFigma();
  rangerLaMarqueDeNommage(figma as never);
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'nommage'), '{"version":1}');
  figma.root.setSharedPluginData('ucm_palettes', 'nommage', '{"version":2}');
  rangerLaMarqueDeNommage(figma as never);
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'nommage'), '{"version":2}');
  const enLectureSeule = { root: { getSharedPluginData: () => '', setSharedPluginData: () => { throw new Error('lecture seule'); } } };
  assert.doesNotThrow(() => rangerLaMarqueDeNommage(enLectureSeule));
});
