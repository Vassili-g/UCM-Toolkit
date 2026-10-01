/** L'écriture des palettes dans les variables du fichier, contre un double de Figma ([VAR-07] à [VAR-11], [VAR-16]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { fnv1a, jsonCanonique, octetsUtf8, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { ajouter, changerReference, nouvellePalette, remplacerPalette, supprimer } from '../src/edition';
import { ecrireLesVariables, rangerLaDestination, retirerLesVariables, type FigmaDesVariablesEcrites, type IssueDeLaPalette } from '../src/ecriture/variables';
import { lireLesVariablesDuFichier, lireLeSuiviRange } from '../src/lectureDesVariables';
import type { Destination } from '../src/variables/destination';
import { etatDesTokens } from '../src/variables/etat';
import { miseAJourDesTokens, simulationDeLaDestination, tokensDeLaPalette, variablesDesPalettesSupprimees } from '../src/variables/gestion';
import { planDesVariables } from '../src/variables/plan';
import { texteDuSuivi } from '../src/variables/suivi';
import { FauxFigma, type FausseCollection } from './figmaDeTest';

const VIDE = recetteParDefaut();
const BLEU: Palette = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9', 2)!, nom: 'Bleu' };
const GRIS: Palette = { ...nouvellePalette(VIDE, 'p-0000000b', '#6B7280', 1)!, nom: 'Gris' };
const RECETTE: Recette = [BLEU, GRIS].reduce(ajouter, VIDE);

const api = (figma: FauxFigma) => figma as unknown as FigmaDesVariablesEcrites;
const empreinte = (recette: Recette): string => fnv1a(octetsUtf8(jsonCanonique(recette)));

/** Un fichier qui porte la recette rangée, journal vidé. */
function fichier(recette: Recette = RECETTE): FauxFigma {
  const figma = new FauxFigma();
  ranger(figma, recette);
  figma.journal.length = 0;
  return figma;
}

function ranger(figma: FauxFigma, recette: Recette): void {
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
}

function poserLaDestination(figma: FauxFigma, destination: Destination): void {
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lireLeSuiviRange(figma.root), destination, confirmee: true }));
}

async function ecrire(figma: FauxFigma, palettes: readonly Palette[], recette: Recette = RECETTE, remettre: readonly Palette[] = []): Promise<readonly IssueDeLaPalette[]> {
  const resultat = await ecrireLesVariables(api(figma), { palettes: palettes.map(({ id }) => id), empreinteLue: empreinte(recette), remettre: remettre.map(({ id }) => id) });
  assert.equal(resultat.issue, 'ecrites');
  return resultat.issue === 'ecrites' ? resultat.palettes : [];
}

const commits = (figma: FauxFigma): number => figma.journal.filter((ligne) => ligne === 'commitUndo').length;
const hexa = (figma: FauxFigma, nom: string, mode?: string): string => {
  const variable = figma.variable(nom);
  const valeur = variable.valuesByMode[mode ?? variable.collection.defaultModeId] as { r: number; g: number; b: number };
  return `#${[valeur.r, valeur.g, valeur.b].map((composante) => Math.round(composante * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

/** L'état des tokens d'une palette, relu dans le fichier comme l'interface le calcule. */
async function etat(figma: FauxFigma, palette: Palette, recette: Recette = RECETTE) {
  const { variables, suivi } = await lireLesVariablesDuFichier(api(figma));
  return etatDesTokens(planDesVariables(recette, palette, suivi.destination), suivi.palettes[palette.id], new Map(variables.map((variable) => [variable.id, variable])), suivi.destination);
}

test('[VAR-07] une première écriture crée la collection « primitives » et 44 variables sans portée, à leurs couleurs, sous un seul commitUndo', async () => {
  const figma = fichier();
  assert.deepEqual(await ecrire(figma, [BLEU]), [{ palette: BLEU.id, issue: 'ecrite', creees: 44, ecrites: 44 }]);
  const [collection] = [...figma.collections.values()];
  assert.equal(collection.name, 'primitives');
  assert.equal(collection.modes.length, 1);
  const variables = figma.variablesDe(collection);
  const plan = planDesVariables(RECETTE, BLEU, { collection: { id: collection.id }, groupe: 'colors', themes: 'chemin' });
  assert.deepEqual(variables.map((variable) => variable.name), plan.map((entree) => entree.nom));
  assert.deepEqual(variables.map((variable) => hexa(figma, variable.name)), plan.map((entree) => entree.hexa));
  assert.ok(variables.every((variable) => variable.scopes.length === 0), 'une primitive ne paraît dans aucun sélecteur de calque');
  assert.equal(variables[0].getSharedPluginData('ucm_palettes', 'palette'), BLEU.id);
  assert.equal(variables[0].getSharedPluginData('ucm_palettes', 'cle'), 'soft/light/50');
  assert.equal(commits(figma), 1);

  // Le suivi désigne chaque variable par son identifiant, et la collection créée devient la destination.
  const suivi = lireLeSuiviRange(figma.root);
  assert.deepEqual(suivi.destination, { collection: { id: collection.id }, groupe: 'colors', themes: 'chemin' });
  assert.equal(suivi.confirmee, false);
  assert.deepEqual(suivi.palettes[BLEU.id].modes, { unique: collection.defaultModeId });
  assert.deepEqual(suivi.palettes[BLEU.id].variables['soft/light/50'], { id: variables[0].id, ecrite: plan[0].hexa });
  assert.equal((await etat(figma, BLEU)).etat, 'a-jour');
});

test('[VAR-07] [VAR-09] une seconde palette rejoint la collection créée, et un seul commitUndo clôt l’écriture de deux palettes', async () => {
  const figma = fichier();
  const issues = await ecrire(figma, [GRIS, BLEU]);
  // L'écriture suit l'ordre de la recette, pas celui de la demande.
  assert.deepEqual(issues.map((issue) => [issue.palette, issue.issue]), [[BLEU.id, 'ecrite'], [GRIS.id, 'ecrite']]);
  assert.equal(figma.collections.size, 1);
  assert.equal(figma.locales.size, 44 + 22);
  assert.equal(commits(figma), 1);
  assert.equal(figma.variable('colors/gris/light/50').collection, [...figma.collections.values()][0]);
});

test('[VAR-07] une réécriture ne crée aucun doublon : à jour, elle n’écrit rien ; après un changement, elle n’écrit que les couleurs changées', async () => {
  const figma = fichier();
  await ecrire(figma, [BLEU]);
  figma.journal.length = 0;
  assert.deepEqual(await ecrire(figma, [BLEU]), [{ palette: BLEU.id, issue: 'ecrite', creees: 0, ecrites: 0 }]);
  assert.equal(commits(figma), 0, 'rien à annuler quand rien ne change');

  const changee = remplacerPalette(RECETTE, changerReference(RECETTE, BLEU, '#2563EB')!);
  ranger(figma, changee);
  const attendues = (await etat(figma, changee.palettes[0], changee)).aEcrire.length;
  assert.ok(attendues > 0 && attendues <= 44);
  assert.deepEqual(await ecrire(figma, [BLEU], changee), [{ palette: BLEU.id, issue: 'ecrite', creees: 0, ecrites: attendues }]);
  assert.equal(figma.locales.size, 44);
  assert.equal(commits(figma), 1);
  assert.equal((await etat(figma, changee.palettes[0], changee)).etat, 'a-jour');
});

test('[VAR-07] une variable suivie qui a disparu se recrée, sous son nom', async () => {
  const figma = fichier();
  await ecrire(figma, [BLEU]);
  const disparue = figma.variable('colors/bleu/vivid/dark/950');
  disparue.remove();
  assert.equal((await etat(figma, BLEU)).etat, 'introuvables');
  assert.deepEqual(await ecrire(figma, [BLEU]), [{ palette: BLEU.id, issue: 'ecrite', creees: 1, ecrites: 1 }]);
  assert.notEqual(figma.variable('colors/bleu/vivid/dark/950').id, disparue.id);
  assert.equal((await etat(figma, BLEU)).etat, 'a-jour');
});

test('[VAR-08] un nom déjà pris par une variable que le plugin ne suit pas arrête la palette avant toute création', async () => {
  const figma = fichier();
  const collection = figma.variables.createVariableCollection('Primitives');
  figma.variables.createVariable('colors/bleu/vivid/light/600', collection, 'COLOR');
  poserLaDestination(figma, { collection: { id: collection.id }, groupe: 'colors', themes: 'chemin' });
  figma.journal.length = 0;
  assert.deepEqual(await ecrire(figma, [BLEU, GRIS]), [
    { palette: BLEU.id, issue: 'nom-pris', nom: 'colors/bleu/vivid/light/600' },
    { palette: GRIS.id, issue: 'ecrite', creees: 22, ecrites: 22 },
  ]);
  assert.equal(figma.locales.size, 1 + 22);
  assert.equal(lireLeSuiviRange(figma.root).palettes[BLEU.id], undefined);
});

test('[VAR-09] une collection locale du même nom que la destination n’est pas reprise : seul son identifiant la désigne', async () => {
  const figma = fichier();
  const homonyme = figma.variables.createVariableCollection('primitives');
  await ecrire(figma, [GRIS]);
  assert.equal(figma.collections.size, 2);
  assert.equal(homonyme.variableIds.length, 0);
});

test('[VAR-09] une collection désignée par un identifiant que le fichier ne porte plus arrête la palette', async () => {
  const figma = fichier();
  poserLaDestination(figma, { collection: { id: 'VariableCollectionId:9:9' }, groupe: 'colors', themes: 'chemin' });
  figma.journal.length = 0;
  assert.deepEqual(await ecrire(figma, [GRIS]), [{ palette: GRIS.id, issue: 'collection-introuvable' }]);
  assert.equal(figma.locales.size, 0);
  assert.equal(commits(figma), 0);
});

test('[VAR-06] des couleurs changées dans Figma refusent l’écriture sans le choix du designer, et se remettent avec lui', async () => {
  const figma = fichier();
  await ecrire(figma, [BLEU, GRIS]);
  const retouchee = figma.variable('colors/bleu/soft/light/50');
  retouchee.setValueForMode(retouchee.collection.defaultModeId, { r: 1, g: 0, b: 0, a: 1 });
  figma.journal.length = 0;
  assert.equal((await etat(figma, BLEU)).etat, 'modifies');
  assert.deepEqual(await ecrire(figma, [BLEU, GRIS]), [
    { palette: BLEU.id, issue: 'modifiee', couleurs: 1 },
    { palette: GRIS.id, issue: 'ecrite', creees: 0, ecrites: 0 },
  ]);
  assert.equal(hexa(figma, 'colors/bleu/soft/light/50'), '#FF0000');
  assert.equal(commits(figma), 0);

  assert.deepEqual(await ecrire(figma, [BLEU], RECETTE, [BLEU]), [{ palette: BLEU.id, issue: 'ecrite', creees: 0, ecrites: 1 }]);
  assert.equal((await etat(figma, BLEU)).etat, 'a-jour');
  assert.equal(commits(figma), 1);
});

test('[VAR-07] une erreur au milieu d’une palette retire les variables que l’écriture venait de créer pour elle ; les autres palettes continuent', async () => {
  const figma = fichier();
  figma.echouerALaValeur = 5;
  assert.deepEqual(await ecrire(figma, [BLEU, GRIS]), [
    { palette: BLEU.id, issue: 'interrompue', message: 'écriture de valeur refusée' },
    { palette: GRIS.id, issue: 'ecrite', creees: 22, ecrites: 22 },
  ]);
  assert.equal(figma.locales.size, 22);
  assert.ok([...figma.locales.values()].every((variable) => variable.name.startsWith('colors/gris/')));
  assert.equal(lireLeSuiviRange(figma.root).palettes[BLEU.id], undefined);
  assert.equal(commits(figma), 1);
  // La palette interrompue s'écrit entière au geste suivant.
  assert.deepEqual(await ecrire(figma, [BLEU]), [{ palette: BLEU.id, issue: 'ecrite', creees: 44, ecrites: 44 }]);
});

test('[VAR-07] une erreur pendant une mise à jour garde au suivi les valeurs déjà écrites : elles ne se lisent pas comme changées dans Figma', async () => {
  const figma = fichier();
  await ecrire(figma, [BLEU]);
  const changee = remplacerPalette(RECETTE, changerReference(RECETTE, BLEU, '#2563EB')!);
  ranger(figma, changee);
  figma.echouerALaValeur = 3;
  const [issue] = await ecrire(figma, [BLEU], changee);
  assert.equal(issue.issue, 'interrompue');
  const apres = await etat(figma, changee.palettes[0], changee);
  assert.equal(apres.etat, 'a-mettre-a-jour');
  assert.deepEqual(apres.modifiees, []);
});

test('[VAR-10] thèmes en modes : le mode d’une collection neuve se renomme Light, Dark s’ajoute, et 22 variables portent deux valeurs', async () => {
  const figma = fichier();
  poserLaDestination(figma, { collection: { nom: 'primitives' }, groupe: 'colors', themes: 'modes' });
  assert.deepEqual(await ecrire(figma, [BLEU]), [{ palette: BLEU.id, issue: 'ecrite', creees: 22, ecrites: 44 }]);
  const [collection] = [...figma.collections.values()];
  assert.deepEqual(collection.modes.map((mode) => mode.name), ['Light', 'Dark']);
  const [light, dark] = collection.modes.map((mode) => mode.modeId);
  const plan = planDesVariables(RECETTE, BLEU, { collection: { id: collection.id }, groupe: 'colors', themes: 'modes' });
  for (const entree of plan) assert.equal(hexa(figma, entree.nom, entree.mode === 'light' ? light : dark), entree.hexa, entree.cle);
  assert.deepEqual(lireLeSuiviRange(figma.root).palettes[BLEU.id].modes, { light, dark });
  assert.equal((await etat(figma, BLEU)).etat, 'a-jour');
});

test('[VAR-10] thèmes en modes dans une collection existante : les modes nommés Light et Dark se retrouvent sans casse, et un mode qui manque s’ajoute', async () => {
  const figma = fichier();
  const collection = figma.variables.createVariableCollection('Tokens');
  figma.variables.createVariable('spacing/4', collection, 'COLOR');
  collection.renameMode(collection.defaultModeId, ' light ');
  poserLaDestination(figma, { collection: { id: collection.id }, groupe: '', themes: 'modes' });
  await ecrire(figma, [GRIS]);
  assert.deepEqual(collection.modes.map((mode) => mode.name), [' light ', 'Dark']);
  assert.equal(figma.variablesDe(collection).length, 1 + 11);
});

test('[VAR-10] un mode que Figma refuse arrête la palette avec le message de Figma, sans variable créée', async () => {
  const figma = fichier();
  figma.limiteDeModes = 1;
  poserLaDestination(figma, { collection: { nom: 'primitives' }, groupe: 'colors', themes: 'modes' });
  const [issue] = await ecrire(figma, [GRIS]);
  assert.deepEqual(issue, { palette: GRIS.id, issue: 'modes-refuses', message: 'in addMode: Limited to 1 modes only' });
  assert.equal(figma.locales.size, 0);
  assert.equal(lireLeSuiviRange(figma.root).palettes[GRIS.id], undefined);
});

test('[VAR-10] thèmes dans le chemin, collection à deux modes : la même valeur s’écrit dans tous les modes', async () => {
  const figma = fichier();
  const collection = figma.variables.createVariableCollection('Brand');
  const second = collection.addMode('Marque 2');
  poserLaDestination(figma, { collection: { id: collection.id }, groupe: 'colors', themes: 'chemin' });
  await ecrire(figma, [GRIS]);
  for (const variable of figma.variablesDe(collection)) assert.deepEqual(variable.valuesByMode[second], variable.valuesByMode[collection.defaultModeId], variable.name);
  assert.equal((await etat(figma, GRIS)).etat, 'a-jour');
});

test('[VAR-02] une destination changée ne déplace aucune variable : la palette s’écrit dans la nouvelle, et les anciennes variables restent', async () => {
  const figma = fichier();
  await ecrire(figma, [GRIS]);
  const anciennes = [...figma.locales.keys()];
  const [premiere] = [...figma.collections.values()];
  assert.deepEqual(await rangerLaDestination(api(figma), { collection: { id: premiere.id }, groupe: 'palettes', themes: 'chemin' }), {
    issue: 'rangee',
    destination: { collection: { id: premiere.id }, groupe: 'palettes', themes: 'chemin' },
  });
  assert.equal((await etat(figma, GRIS)).etat, 'a-mettre-a-jour');
  assert.deepEqual(await ecrire(figma, [GRIS]), [{ palette: GRIS.id, issue: 'ecrite', creees: 22, ecrites: 22 }]);
  assert.equal(figma.locales.size, 44);
  assert.ok(anciennes.every((id) => figma.locales.has(id)), 'les anciennes variables restent dans le fichier');
  assert.equal(figma.variable('palettes/gris/light/50').collection, premiere);
  assert.ok(!anciennes.includes(lireLeSuiviRange(figma.root).palettes[GRIS.id].variables['unique/light/50'].id));
  assert.equal((await etat(figma, GRIS)).etat, 'a-jour');
});

test('[VAR-07] une recette rangée depuis la lecture, une recette absente ou un suivi futur n’écrivent rien', async () => {
  const figma = fichier();
  assert.deepEqual(await ecrireLesVariables(api(figma), { palettes: [BLEU.id], empreinteLue: 'aaaaaaaa', remettre: [] }), { issue: 'recette-changee' });
  const vide = new FauxFigma();
  assert.deepEqual(await ecrireLesVariables(api(vide), { palettes: [BLEU.id], empreinteLue: null, remettre: [] }), { issue: 'sans-recette' });
  const futur = JSON.stringify({ version: 2, palettes: {} });
  figma.root.setSharedPluginData('ucm_palettes', 'variables', futur);
  assert.deepEqual(await ecrireLesVariables(api(figma), { palettes: [BLEU.id], empreinteLue: empreinte(RECETTE), remettre: [] }), { issue: 'suivi-futur' });
  assert.deepEqual(await rangerLaDestination(api(figma), { collection: { nom: 'x' }, groupe: '', themes: 'chemin' }), { issue: 'suivi-futur' });
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'variables'), futur);
  assert.equal(figma.locales.size + figma.collections.size, 0);
  assert.equal(commits(figma), 0);
  // Une palette que la recette ne porte pas est dite absente.
  figma.root.setSharedPluginData('ucm_palettes', 'variables', '');
  assert.deepEqual(await ecrire(figma, [{ ...GRIS, id: 'p-ffffffff' }]), [{ palette: 'p-ffffffff', issue: 'absente' }]);
});

test('[VAR-16] la destination se range validée et confirmée ; une forme invalide ou une collection inconnue ne range rien', async () => {
  const figma = fichier();
  assert.deepEqual(await rangerLaDestination(api(figma), { collection: { nom: ' Tokens ' }, groupe: '/colors/', themes: 'modes' }), {
    issue: 'rangee',
    destination: { collection: { nom: 'Tokens' }, groupe: 'colors', themes: 'modes' },
  });
  const suivi = lireLeSuiviRange(figma.root);
  assert.equal(suivi.confirmee, true);
  assert.equal(commits(figma), 1);
  const range = figma.root.getSharedPluginData('ucm_palettes', 'variables');
  assert.deepEqual(await rangerLaDestination(api(figma), { collection: { nom: 'x' }, groupe: 'a.b', themes: 'chemin' }), { issue: 'invalide', refus: 'groupe' });
  assert.deepEqual(await rangerLaDestination(api(figma), { collection: { id: 'inconnue' }, groupe: '', themes: 'chemin' }), { issue: 'invalide', refus: 'collection' });
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'variables'), range);
  assert.equal(commits(figma), 1);
});

test('[VAR-11] « Supprimer les variables… » retire les seules variables suivies d’une palette supprimée, sous un seul commitUndo', async () => {
  const figma = fichier();
  await ecrire(figma, [BLEU, GRIS]);
  assert.deepEqual(await retirerLesVariables(api(figma), { palette: GRIS.id }), { issue: 'refuse' }, 'la recette porte encore la palette');
  ranger(figma, supprimer(RECETTE, GRIS.id));
  figma.journal.length = 0;
  assert.deepEqual(await retirerLesVariables(api(figma), { palette: GRIS.id }), { issue: 'retirees', retirees: 22 });
  assert.equal(figma.locales.size, 44);
  assert.ok([...figma.locales.values()].every((variable) => variable.name.startsWith('colors/bleu/')));
  assert.equal(lireLeSuiviRange(figma.root).palettes[GRIS.id], undefined);
  assert.equal(commits(figma), 1);
  // Une palette sans suivi n'a rien à retirer, et rien ne s'écrit.
  figma.journal.length = 0;
  assert.deepEqual(await retirerLesVariables(api(figma), { palette: GRIS.id }), { issue: 'retirees', retirees: 0 });
  assert.deepEqual(figma.journal, []);
});

test('[VAR-04] la lecture relève les collections, les variables de couleur et le suivi ; un alias se lit sans couleur', async () => {
  const figma = fichier();
  await ecrire(figma, [GRIS]);
  const [collection] = [...figma.collections.values()] as FausseCollection[];
  const alias = figma.variables.createVariable('brand/primary', collection, 'COLOR');
  alias.setValueForMode(collection.defaultModeId, { type: 'VARIABLE_ALIAS', id: figma.variable('colors/gris/light/600').id });
  const lu = await lireLesVariablesDuFichier(api(figma));
  assert.deepEqual(lu.collections, [{ id: collection.id, nom: 'primitives', modes: [{ id: collection.defaultModeId, nom: 'Mode 1' }], variables: 23 }]);
  assert.equal(lu.variables.length, 23);
  assert.deepEqual(lu.variables[22], { id: alias.id, nom: 'brand/primary', collection: collection.id, valeurs: { [collection.defaultModeId]: null } });
  assert.match(lu.variables[0].valeurs[collection.defaultModeId]!, /^#[0-9A-F]{6}$/);
  assert.equal(Object.keys(lu.suivi.palettes[GRIS.id].variables).length, 22);
});

test('[MOT-26] dans un document Display P3, les composantes écrites sont en P3, et la relecture retrouve les couleurs du plan', async () => {
  const figma = fichier();
  figma.root.documentColorProfile = 'DISPLAY_P3';
  await ecrire(figma, [BLEU]);
  const reference = planDesVariables(RECETTE, BLEU, lireLeSuiviRange(figma.root).destination).find((entree) => entree.hexa === '#1E6FD9')!;
  // Lues comme du sRGB, les composantes P3 ne redonnent pas l'hexa de la référence.
  assert.notEqual(hexa(figma, reference.nom), '#1E6FD9');
  assert.equal((await etat(figma, BLEU)).etat, 'a-jour');
});

// ------------------------------------------------------------ ce que Gestion en montre

test('[UI-31] avant une première écriture, la fiche compte 44 variables à créer dans « primitives », et rien à remplacer', async () => {
  const figma = fichier();
  const lu = await lireLesVariablesDuFichier(api(figma));
  const tokens = tokensDeLaPalette(RECETTE, BLEU, lu);
  assert.equal(tokens.etat, 'jamais-ecrits');
  assert.equal(tokens.variables, 44);
  assert.equal(tokens.aCreer.length, 44);
  assert.deepEqual([tokens.aCreer[0], tokens.aCreer[43]], ['colors/bleu/soft/light/50', 'colors/bleu/vivid/dark/950']);
  assert.equal(tokens.aRemplacer, 0);
  assert.equal(tokens.collection, 'primitives');
});

test('[UI-26] le compte d’une fiche est celui que l’écriture fait : créées et remplacées, palette à jour, changée, amputée, vers une autre destination', async () => {
  const figma = fichier();
  await ecrire(figma, [BLEU, GRIS]);
  const compter = async (palette: Palette, recette: Recette = RECETTE) => {
    const tokens = tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma)));
    return [tokens.etat, tokens.aCreer.length, tokens.aRemplacer];
  };
  assert.deepEqual(await compter(BLEU), ['a-jour', 0, 0]);

  const changee = remplacerPalette(RECETTE, changerReference(RECETTE, BLEU, '#2563EB')!);
  const [, , aRemplacer] = await compter(changee.palettes[0], changee);
  ranger(figma, changee);
  assert.deepEqual(await ecrire(figma, [BLEU], changee), [{ palette: BLEU.id, issue: 'ecrite', creees: 0, ecrites: aRemplacer }]);

  figma.variable('colors/gris/light/50').remove();
  assert.deepEqual(await compter(GRIS, changee), ['introuvables', 1, 0]);

  const [collection] = [...figma.collections.values()];
  await rangerLaDestination(api(figma), { collection: { id: collection.id }, groupe: 'colors', themes: 'modes' });
  // En modes, la palette crée 11 variables neuves : les anciennes restent, hors du compte.
  assert.deepEqual(await compter(GRIS, changee), ['introuvables', 11, 0]);
  figma.limiteDeModes = 4;
  assert.deepEqual(await ecrire(figma, [GRIS], changee), [{ palette: GRIS.id, issue: 'ecrite', creees: 11, ecrites: 22 }]);
});

test('[UI-28] « Tout mettre à jour » compte les palettes en retard, et exclut une palette modifiée dans Figma', async () => {
  const figma = fichier();
  await ecrire(figma, [BLEU]);
  const retouchee = figma.variable('colors/bleu/soft/light/50');
  retouchee.setValueForMode(retouchee.collection.defaultModeId, { r: 1, g: 0, b: 0, a: 1 });
  const lu = await lireLesVariablesDuFichier(api(figma));
  const tokens = new Map(RECETTE.palettes.map((palette) => [palette.id, tokensDeLaPalette(RECETTE, palette, lu)]));
  assert.deepEqual(miseAJourDesTokens(RECETTE, tokens), { palettes: [GRIS.id], creees: 22, ecrites: 0, modifiees: 1 });
});

test('[UI-30] la simulation suit la destination : quatre groupes d’une colonne dans le chemin, deux groupes de deux colonnes en modes', () => {
  const chemin = simulationDeLaDestination(RECETTE, { collection: { nom: 'primitives' }, groupe: 'colors', themes: 'chemin' })!;
  assert.deepEqual(chemin.colonnes, ['unique']);
  assert.equal(chemin.variables, 44);
  assert.deepEqual(chemin.groupes.map((groupe) => [groupe.chemin, groupe.lignes.length]), [
    ['colors/bleu/soft/light', 11], ['colors/bleu/soft/dark', 11], ['colors/bleu/vivid/light', 11], ['colors/bleu/vivid/dark', 11],
  ]);
  const plan = planDesVariables(RECETTE, BLEU, { collection: { nom: 'primitives' }, groupe: 'colors', themes: 'chemin' });
  assert.deepEqual(chemin.groupes[0].lignes[0], { nuance: '50', valeurs: [plan[0].hexa] });

  const modes = simulationDeLaDestination(RECETTE, { collection: { nom: 'primitives' }, groupe: '', themes: 'modes' })!;
  assert.deepEqual(modes.colonnes, ['light', 'dark']);
  assert.equal(modes.variables, 22);
  assert.deepEqual(modes.groupes.map((groupe) => [groupe.chemin, groupe.lignes.length]), [['bleu/soft', 11], ['bleu/vivid', 11]]);
  assert.deepEqual(modes.groupes[0].lignes[0], { nuance: '50', valeurs: [plan[0].hexa, plan[11].hexa] });
  assert.equal(simulationDeLaDestination(VIDE, { collection: { nom: 'primitives' }, groupe: '', themes: 'modes' }), null);
});

test('[UI-35] une palette supprimée laisse ses variables : leur nombre et leur chemin commun, tant que le fichier les porte', async () => {
  const figma = fichier();
  await ecrire(figma, [BLEU, GRIS]);
  const sansGris = supprimer(RECETTE, GRIS.id);
  assert.deepEqual(variablesDesPalettesSupprimees(RECETTE, await lireLesVariablesDuFichier(api(figma))), []);
  assert.deepEqual(variablesDesPalettesSupprimees(sansGris, await lireLesVariablesDuFichier(api(figma))), [{ palette: GRIS.id, variables: 22, chemin: 'colors/gris' }]);
  ranger(figma, sansGris);
  await retirerLesVariables(api(figma), { palette: GRIS.id });
  assert.deepEqual(variablesDesPalettesSupprimees(sansGris, await lireLesVariablesDuFichier(api(figma))), []);
});
