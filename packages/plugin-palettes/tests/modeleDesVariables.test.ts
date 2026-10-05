/** Le modèle pur des variables ([VAR-01] à [VAR-05], [VAR-12]) : destination, noms, plan, suivi, état et détection. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { recetteParDefaut, validerRecette, type Palette, type Recette } from 'ucm-couleur';

import { analyserPalette } from '../src/analyse';
import { ajouter, nouvellePalette } from '../src/edition';
import { DESTINATION_PAR_DEFAUT, memeDestination, validerLaDestination, type Destination } from '../src/variables/destination';
import { palettesDuFichier } from '../src/variables/detection';
import { etatDesTokens } from '../src/variables/etat';
import { segmentDuNom, segmentsDesPalettes } from '../src/variables/noms';
import { nomsDuPlan, planDesVariables, type EntreeDuPlan } from '../src/variables/plan';
import { hexaDeFigma, type CollectionLue, type VariableLue } from '../src/variables/releve';
import { SUIVI_VIDE, lireLeSuivi, suiviFutur, texteDuSuivi, variablesSuivies, type PaletteSuivie, type SuiviDesVariables } from '../src/variables/suivi';

const VIDE = recetteParDefaut();
const BLEU: Palette = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9', 2)!, nom: 'Bleu' };
const GRIS: Palette = { ...nouvellePalette(VIDE, 'p-0000000b', '#6B7280', 1)!, nom: 'Gris' };
const LIBRE: Palette = { ...BLEU, id: 'p-0000000c', nom: 'Libre', crans: [100, 300, 500, 700, 900] };
const RECETTE: Recette = [BLEU, GRIS, LIBRE].reduce(ajouter, VIDE);
const EN_MODES: Destination = { collection: { id: 'VariableCollectionId:1:2' }, groupe: 'colors', themes: 'modes' };

// ------------------------------------------------------------ la destination

test('[VAR-02] la destination par défaut vise une collection neuve « primitives », le groupe « colors », les thèmes dans le chemin', () => {
  assert.deepEqual(DESTINATION_PAR_DEFAUT, { collection: { nom: 'primitives' }, groupe: 'colors', themes: 'chemin' });
  assert.deepEqual(validerLaDestination(DESTINATION_PAR_DEFAUT), { destination: DESTINATION_PAR_DEFAUT });
});

test('[VAR-02] la validation range un groupe sans espaces ni « / » de trop, accepte un groupe vide, et refuse le champ fautif', () => {
  assert.deepEqual(validerLaDestination({ collection: { nom: '  Primitives ' }, groupe: ' /colors / brand/ ', themes: 'modes' }), {
    destination: { collection: { nom: 'Primitives' }, groupe: 'colors/brand', themes: 'modes' },
  });
  assert.deepEqual(validerLaDestination({ collection: { id: '1:2' }, groupe: '', themes: 'chemin' }), { destination: { collection: { id: '1:2' }, groupe: '', themes: 'chemin' } });
  assert.deepEqual(validerLaDestination(null), { refus: 'collection' });
  assert.deepEqual(validerLaDestination({ collection: { nom: '   ' }, groupe: 'colors', themes: 'chemin' }), { refus: 'collection' });
  assert.deepEqual(validerLaDestination({ collection: { id: '' }, groupe: 'colors', themes: 'chemin' }), { refus: 'collection' });
  assert.deepEqual(validerLaDestination({ collection: { id: '1:2' }, groupe: 12, themes: 'chemin' }), { refus: 'groupe' });
  for (const groupe of ['colors.brand', 'colors/{brand}', '$colors', 'colors/$brand']) {
    assert.deepEqual(validerLaDestination({ collection: { id: '1:2' }, groupe, themes: 'chemin' }), { refus: 'groupe' }, groupe);
  }
  assert.deepEqual(validerLaDestination({ collection: { id: '1:2' }, groupe: 'colors', themes: 'colonnes' }), { refus: 'themes' });
});

test('[VAR-02] deux destinations sont les mêmes par leur collection, leur groupe et leurs thèmes', () => {
  assert.equal(memeDestination(EN_MODES, { ...EN_MODES }), true);
  assert.equal(memeDestination(EN_MODES, { ...EN_MODES, themes: 'chemin' }), false);
  assert.equal(memeDestination(EN_MODES, { ...EN_MODES, groupe: '' }), false);
  assert.equal(memeDestination(EN_MODES, { ...EN_MODES, collection: { nom: 'VariableCollectionId:1:2' } }), false);
  assert.equal(memeDestination(DESTINATION_PAR_DEFAUT, { ...DESTINATION_PAR_DEFAUT, collection: { nom: 'primitives' } }), true);
});

// ------------------------------------------------------------ les noms

test('[VAR-03] le segment d’une palette garde la casse du nom : espaces en tirets, accents gardés', () => {
  assert.equal(segmentDuNom('Bleu'), 'Bleu');
  assert.equal(segmentDuNom('  Bleu   Pétrole '), 'Bleu-Pétrole');
  assert.equal(segmentDuNom('BRAND Primary'), 'BRAND-Primary');
});

test('[VAR-03] le segment perd ce que Figma refuse dans un nom de variable : « . », « { », « } », « / » et le « $ » de tête', () => {
  assert.equal(segmentDuNom('v1.2'), 'v12');
  assert.equal(segmentDuNom('{Brand}'), 'Brand');
  assert.equal(segmentDuNom('$brand'), 'brand');
  assert.equal(segmentDuNom('Bleu/Roi'), 'BleuRoi');
  assert.equal(segmentDuNom('prix $'), 'prix-$');
  assert.equal(segmentDuNom('{}'), '');
});

test('[VAR-03] une palette sans nom prend son identifiant, et la seconde palette d’un même segment prend le sien en suffixe', () => {
  const sansNom: Palette = { ...BLEU, id: 'p-00000001', nom: undefined };
  const vide: Palette = { ...BLEU, id: 'p-00000002', nom: '{.}' };
  const jumelle: Palette = { ...BLEU, id: 'p-00000003', nom: 'BLEU' };
  const segments = segmentsDesPalettes({ palettes: [BLEU, sansNom, vide, jumelle] });
  assert.deepEqual([...segments], [
    ['p-0000000a', { segment: 'Bleu', suffixe: false }],
    ['p-00000001', { segment: 'p-00000001', suffixe: false }],
    ['p-00000002', { segment: 'p-00000002', suffixe: false }],
    ['p-00000003', { segment: 'BLEU-p-00000003', suffixe: true }],
  ]);
});

// ------------------------------------------------------------ le plan

const hexasDeLAnalyse = (palette: Palette): string[] => {
  const analyse = analyserPalette(RECETTE, palette);
  return analyse.intensites.flatMap((intensite) => (['light', 'dark'] as const).flatMap((mode) => analyse.rampes[intensite]![mode].map((cran) => cran.hexa.toUpperCase())));
};

test('[VAR-01] deux intensités, thèmes dans le chemin : 44 entrées et 44 variables, de soft/light/50 à vivid/dark/950', () => {
  const plan = planDesVariables(RECETTE, BLEU, DESTINATION_PAR_DEFAUT);
  assert.equal(plan.length, 44);
  assert.equal(nomsDuPlan(plan).length, 44);
  assert.deepEqual(plan[0], { cle: 'soft/light/50', nom: 'colors/Bleu/soft/light/50', mode: 'unique', hexa: plan[0].hexa });
  assert.deepEqual([plan[11].nom, plan[22].nom, plan[43].nom], ['colors/Bleu/soft/dark/50', 'colors/Bleu/vivid/light/50', 'colors/Bleu/vivid/dark/950']);
  assert.ok(plan.every((entree) => entree.mode === 'unique' && /^#[0-9A-F]{6}$/.test(entree.hexa)));
  assert.equal(new Set(plan.map((entree) => entree.cle)).size, 44);
});

test('[VAR-01] les couleurs du plan sont celles de l’aperçu, dans l’ordre des intensités, des thèmes puis des nuances', () => {
  for (const palette of [BLEU, GRIS, LIBRE]) {
    assert.deepEqual(planDesVariables(RECETTE, palette, DESTINATION_PAR_DEFAUT).map((entree) => entree.hexa), hexasDeLAnalyse(palette), palette.nom);
  }
  // La référence garde ses octets exacts, à la nuance qui la porte ([MOT-17]).
  assert.ok(planDesVariables(RECETTE, BLEU, DESTINATION_PAR_DEFAUT).some((entree) => entree.hexa === '#1E6FD9'));
});

test('[VAR-01] thèmes en modes : 44 entrées pour 22 variables, chaque nom porté par une entrée Light et une entrée Dark', () => {
  const plan = planDesVariables(RECETTE, BLEU, EN_MODES);
  assert.equal(plan.length, 44);
  const noms = nomsDuPlan(plan);
  assert.equal(noms.length, 22);
  assert.deepEqual([noms[0], noms[21]], ['colors/Bleu/soft/50', 'colors/Bleu/vivid/950']);
  for (const nom of noms) assert.deepEqual(plan.filter((entree) => entree.nom === nom).map((entree) => entree.mode), ['light', 'dark']);
  // Les clés ne dépendent pas de la destination : le suivi retrouve ses variables après un changement.
  assert.deepEqual(plan.map((entree) => entree.cle), planDesVariables(RECETTE, BLEU, DESTINATION_PAR_DEFAUT).map((entree) => entree.cle));
});

test('[VAR-01] une palette à une intensité n’a pas de segment d’intensité, et un groupe vide pose la palette à la racine', () => {
  const plan = planDesVariables(RECETTE, GRIS, { ...DESTINATION_PAR_DEFAUT, groupe: '' });
  assert.equal(plan.length, 22);
  assert.deepEqual([plan[0].nom, plan[0].cle, plan[21].nom, plan[21].cle], ['Gris/light/50', 'unique/light/50', 'Gris/dark/950', 'unique/dark/950']);
  assert.deepEqual(planDesVariables(RECETTE, GRIS, { ...EN_MODES, groupe: 'a/b' }).slice(0, 2).map((entree) => entree.nom), ['a/b/Gris/50', 'a/b/Gris/100']);
});

test('[VAR-01] une palette libre écrit ses seules nuances', () => {
  const plan = planDesVariables(RECETTE, LIBRE, DESTINATION_PAR_DEFAUT);
  assert.equal(plan.length, 20);
  assert.deepEqual(plan.slice(0, 5).map((entree) => entree.nom), [100, 300, 500, 700, 900].map((nuance) => `colors/Libre/soft/light/${nuance}`));
});

// ------------------------------------------------------------ le suivi

const SUIVI_DE_BLEU: PaletteSuivie = {
  collection: 'VariableCollectionId:1:2',
  groupe: 'colors',
  modes: { unique: '1:0' },
  variables: { 'soft/light/50': { id: 'VariableID:1:3', ecrite: '#F5F8FE' }, 'soft/light/100': { id: 'VariableID:1:4', ecrite: '#E8F0FD' } },
  liaison: 'destination',
};

test('[VAR-04] un suivi rangé se relit tel quel ; un texte vide, cassé ou d’une autre forme donne un suivi vide', () => {
  const suivi: SuiviDesVariables = { version: 1, destination: EN_MODES, confirmee: true, palettes: { [BLEU.id]: SUIVI_DE_BLEU } };
  assert.deepEqual(lireLeSuivi(texteDuSuivi(suivi)), suivi);
  for (const texte of ['', '{', '[]', '"suivi"', 'null']) assert.deepEqual(lireLeSuivi(texte), SUIVI_VIDE, texte);
  assert.deepEqual(SUIVI_VIDE, { version: 1, destination: DESTINATION_PAR_DEFAUT, confirmee: false, palettes: {} });
});

test('[VAR-04] la lecture ignore un champ inattendu sans écarter les autres, et une destination illisible revient au défaut, à confirmer', () => {
  const texte = JSON.stringify({
    destination: { collection: {}, groupe: 'colors', themes: 'chemin' },
    confirmee: true,
    palettes: {
      'p-1': { collection: '1:2', modes: { light: '1:0', dark: 7 }, variables: { a: { id: '1:3', ecrite: '#abcdef' }, b: { id: 4, ecrite: '#000000' }, c: 'non' }, liaison: 'reprise' },
      'p-2': { modes: {} },
      'p-3': 'non',
    },
  });
  assert.deepEqual(lireLeSuivi(texte), {
    version: 1,
    destination: DESTINATION_PAR_DEFAUT,
    confirmee: false,
    palettes: { 'p-1': { collection: '1:2', groupe: '', modes: { light: '1:0' }, variables: { a: { id: '1:3', ecrite: '#ABCDEF' } }, liaison: 'reprise' } },
  });
});

test('[VAR-04] un suivi d’une version plus récente ne se lit pas, et se dit futur', () => {
  const futur = lireLeSuivi(JSON.stringify({ version: 2, destination: EN_MODES, confirmee: true, palettes: { [BLEU.id]: SUIVI_DE_BLEU } }));
  assert.deepEqual(futur, { ...SUIVI_VIDE, version: 2 });
  assert.equal(suiviFutur(futur), true);
  assert.equal(suiviFutur(SUIVI_VIDE), false);
});

test('[VAR-04] les variables suivies sont celles de toutes les palettes', () => {
  const suivi: SuiviDesVariables = { ...SUIVI_VIDE, palettes: { a: SUIVI_DE_BLEU, b: { ...SUIVI_DE_BLEU, variables: { x: { id: 'VariableID:9:9', ecrite: '#000000' } } } } };
  assert.deepEqual([...variablesSuivies(suivi)].sort(), ['VariableID:1:3', 'VariableID:1:4', 'VariableID:9:9']);
});

// ------------------------------------------------------------ l'état

const DESTINATION: Destination = { collection: { id: 'C' }, groupe: 'colors', themes: 'chemin' };
const PLAN: EntreeDuPlan[] = [
  { cle: 'unique/light/50', nom: 'colors/Gris/light/50', mode: 'unique', hexa: '#F0F0F0' },
  { cle: 'unique/light/100', nom: 'colors/Gris/light/100', mode: 'unique', hexa: '#E0E0E0' },
];
const ecrit = (ecrites: readonly string[]): PaletteSuivie => ({
  collection: 'C',
  groupe: 'colors',
  modes: { unique: 'm' },
  variables: Object.fromEntries(ecrites.map((hexa, rang) => [PLAN[rang].cle, { id: `v${rang}`, ecrite: hexa }])),
  liaison: 'destination',
});
const lues = (hexas: readonly (string | null)[]): Map<string, VariableLue> =>
  new Map(hexas.map((hexa, rang) => [`v${rang}`, { id: `v${rang}`, nom: `Figma/${rang}`, collection: 'C', valeurs: { m: hexa } }]));

test('[VAR-05] sans suivi, ou sans variable suivie, les tokens ne sont pas encore écrits, et tout le plan est à écrire', () => {
  for (const suivi of [undefined, ecrit([])]) {
    const etat = etatDesTokens(PLAN, suivi, new Map(), DESTINATION);
    assert.equal(etat.etat, 'jamais-ecrits');
    assert.deepEqual(etat.aEcrire, [
      { cle: 'unique/light/50', nom: 'colors/Gris/light/50', ecrite: null, plugin: '#F0F0F0' },
      { cle: 'unique/light/100', nom: 'colors/Gris/light/100', ecrite: null, plugin: '#E0E0E0' },
    ]);
  }
});

test('[VAR-05] la table des états, ligne à ligne : Figma, dernière écrite, plugin', () => {
  const cas: [string, readonly string[], readonly (string | null)[], string][] = [
    ['les trois lectures égales', ['#F0F0F0', '#E0E0E0'], ['#F0F0F0', '#E0E0E0'], 'a-jour'],
    ['le plugin a changé une couleur', ['#F0F0F0', '#DDDDDD'], ['#F0F0F0', '#DDDDDD'], 'a-mettre-a-jour'],
    ['Figma a changé une couleur', ['#F0F0F0', '#E0E0E0'], ['#F0F0F0', '#123456'], 'modifies'],
    ['Figma a changé une couleur que le plugin a changée aussi', ['#F0F0F0', '#DDDDDD'], ['#F0F0F0', '#123456'], 'modifies'],
    ['Figma porte déjà la couleur que le plugin calcule, sans que le plugin l’ait écrite', ['#F0F0F0', '#DDDDDD'], ['#F0F0F0', '#E0E0E0'], 'modifies'],
    ['un alias a remplacé la couleur', ['#F0F0F0', '#E0E0E0'], ['#F0F0F0', null], 'modifies'],
  ];
  for (const [quoi, ecrites, figma, attendu] of cas) assert.equal(etatDesTokens(PLAN, ecrit(ecrites), lues(figma), DESTINATION).etat, attendu, quoi);
});

test('[VAR-05] l’état nomme les couleurs concernées, valeur de Figma et valeur du plugin, sous le nom que Figma porte', () => {
  const etat = etatDesTokens(PLAN, ecrit(['#EEEEEE', '#E0E0E0']), lues(['#EEEEEE', '#123456']), DESTINATION);
  assert.equal(etat.etat, 'modifies');
  assert.deepEqual(etat.modifiees, [{ cle: 'unique/light/100', nom: 'Figma/1', figma: '#123456', plugin: '#E0E0E0' }]);
  assert.deepEqual(etat.aEcrire, [{ cle: 'unique/light/50', nom: 'Figma/0', ecrite: '#EEEEEE', plugin: '#F0F0F0' }]);
});

test('[VAR-05] une variable suivie qui a disparu rend les tokens introuvables, avant toute autre condition', () => {
  const etat = etatDesTokens(PLAN, ecrit(['#F0F0F0', '#E0E0E0']), new Map([...lues(['#123456'])]), DESTINATION);
  assert.equal(etat.etat, 'introuvables');
  assert.deepEqual(etat.introuvables, ['unique/light/100']);
});

test('[VAR-05] une clé du plan absente du suivi est à mettre à jour ; une clé du suivi absente du plan ne compte pas', () => {
  const partiel = etatDesTokens(PLAN, ecrit(['#F0F0F0']), lues(['#F0F0F0']), DESTINATION);
  assert.equal(partiel.etat, 'a-mettre-a-jour');
  assert.deepEqual(partiel.aEcrire, [{ cle: 'unique/light/100', nom: 'colors/Gris/light/100', ecrite: null, plugin: '#E0E0E0' }]);
  const ancien: PaletteSuivie = { ...ecrit(['#F0F0F0', '#E0E0E0']), variables: { ...ecrit(['#F0F0F0', '#E0E0E0']).variables, 'soft/light/50': { id: 'disparue', ecrite: '#000000' } } };
  assert.equal(etatDesTokens(PLAN, ancien, lues(['#F0F0F0', '#E0E0E0']), DESTINATION).etat, 'a-jour');
});

test('[VAR-05] une destination changée depuis l’écriture demande une mise à jour : collection, groupe ou forme des thèmes', () => {
  const aJour = (destination: Destination) => etatDesTokens(PLAN, ecrit(['#F0F0F0', '#E0E0E0']), lues(['#F0F0F0', '#E0E0E0']), destination);
  assert.equal(aJour(DESTINATION).destinationChangee, false);
  for (const destination of [
    { ...DESTINATION, collection: { id: 'D' } },
    { ...DESTINATION, collection: { nom: 'primitives' } },
    { ...DESTINATION, groupe: 'palettes' },
    { ...DESTINATION, themes: 'modes' as const },
  ]) {
    const etat = aJour(destination);
    assert.equal(etat.etat, 'a-mettre-a-jour', JSON.stringify(destination));
    assert.equal(etat.destinationChangee, true);
  }
  // Une palette reprise du fichier garde ses variables d'origine : la destination ne la concerne pas.
  const reprise: PaletteSuivie = { ...ecrit(['#F0F0F0', '#E0E0E0']), liaison: 'reprise' };
  const sansNom = PLAN.map((entree) => ({ ...entree, nom: '' }));
  assert.equal(etatDesTokens(sansNom, reprise, lues(['#F0F0F0', '#E0E0E0']), { ...DESTINATION, groupe: 'palettes' }).etat, 'a-jour');
  // Le nom que le plan lui donne, quand il diffère de celui du fichier, la demande à renommer.
  assert.deepEqual(etatDesTokens(PLAN, reprise, lues(['#F0F0F0', '#E0E0E0']), DESTINATION).etat, 'a-mettre-a-jour');
});

test('[VAR-05] un groupe renommé dans Figma et dans la destination reste à jour si les variables suivies y sont déjà', () => {
  const suivi = ecrit(['#F0F0F0', '#E0E0E0']);
  const plan = PLAN.map((entree) => ({ ...entree, nom: entree.nom.replace('colors/', 'Colors/') }));
  const variables = new Map([
    ['v0', { id: 'v0', nom: 'Colors/Gris/light/50', collection: suivi.collection, valeurs: { m: '#F0F0F0' } }],
    ['v1', { id: 'v1', nom: 'Colors/Gris/light/100', collection: suivi.collection, valeurs: { m: '#E0E0E0' } }],
  ]);
  const etat = etatDesTokens(plan, { ...suivi, groupe: 'colors' }, variables, { ...DESTINATION, groupe: 'Colors' });
  assert.deepEqual([etat.etat, etat.destinationChangee, etat.aEcrire.length], ['a-jour', false, 0]);
});

test('[VAR-05] deux couleurs sont égales à l’octet : les composantes de Figma s’arrondissent', () => {
  assert.equal(hexaDeFigma({ r: 0.11764705926179886, g: 0.43529412150382996, b: 0.8509804010391235 }), '#1E6FD9');
  assert.equal(hexaDeFigma({ r: 1, g: 1, b: 1, a: 1 }), '#FFFFFF');
  assert.equal(hexaDeFigma({ r: 0.4999, g: 0.5001, b: 0, a: 1 }), '#7F8000');
  // Une couleur qui n'est pas opaque ne vaut aucune couleur écrite par le plugin.
  assert.equal(hexaDeFigma({ r: 1, g: 1, b: 1, a: 0.5 }), '#FFFFFF80');
});

// ------------------------------------------------------------ la détection

const collection = (id: string, nom: string, modes: readonly string[] = ['Mode 1']): CollectionLue => ({ id, nom, modes: modes.map((mode, rang) => ({ id: `${id}:${rang}`, nom: mode })), variables: 0 });
const variablesDe = (dans: CollectionLue, noms: readonly string[]): VariableLue[] =>
  noms.map((nom, rang) => ({ id: `${dans.id}/${nom}`, nom, collection: dans.id, valeurs: Object.fromEntries(dans.modes.map((mode, colonne) => [mode.id, `#${(rang * 16 + colonne).toString(16).padStart(6, '0').toUpperCase()}`])) }));
const TAILWIND = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

test('[VAR-12] des noms Tailwind : une palette par teinte, ses nuances triées, et rien pour white, black ou une rampe de quatre', () => {
  const primitives = collection('C1', 'Primitives');
  const variables = variablesDe(primitives, [
    'white', 'black',
    ...[...TAILWIND].reverse().map((nuance) => `slate/${nuance}`),
    ...TAILWIND.map((nuance) => `emerald/${nuance}`),
    'tiny/100', 'tiny/200', 'tiny/300', 'tiny/400',
    'spacing/4',
  ]);
  const palettes = palettesDuFichier(variables, [primitives]);
  assert.deepEqual(palettes.map((palette) => [palette.chemin, palette.nuances.length, palette.reference]), [['slate', 11, 600], ['emerald', 11, 600]]);
  assert.deepEqual(palettes[0].nuances, TAILWIND);
  assert.deepEqual(palettes[0].variables.slice(0, 2), ['C1/slate/50', 'C1/slate/100']);
  assert.deepEqual(palettes[0].modes, [{ id: 'C1:0', nom: 'Mode 1' }]);
  assert.equal(palettes[0].couleurs['C1:0'].length, 11);
  assert.equal(palettes[0].nomDeLaCollection, 'Primitives');
});

test('[VAR-12] des tons Material : la nuance la plus proche de 600 sert de référence, et la plus sombre à distance égale', () => {
  const material = collection('C2', 'Material', ['Light', 'Dark']);
  const tons = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];
  const palettes = palettesDuFichier(variablesDe(material, [...tons.map((ton) => `ref/primary/${ton}`), 'sys/color/primary', 'sys/color/on-primary']), [material]);
  assert.deepEqual(palettes.map((palette) => [palette.chemin, palette.nuances.length, palette.reference]), [['ref/primary', 13, 100]]);
  assert.deepEqual(Object.keys(palettes[0].couleurs), ['C2:0', 'C2:1']);
  const egales = palettesDuFichier(variablesDe(material, [500, 550, 650, 700, 800].map((nuance) => `x/${nuance}`)), [material]);
  assert.equal(egales[0].reference, 650);
});

test('[VAR-12] une même palette dans deux collections en fait deux ; les variables du suivi et les alias sont écartés', () => {
  const locale = collection('C1', 'Primitives');
  const marque = collection('C3', 'Brand');
  const variables = [
    ...variablesDe(locale, TAILWIND.map((nuance) => `colors/Bleu/soft/light/${nuance}`)),
    ...variablesDe(locale, TAILWIND.map((nuance) => `slate/${nuance}`)),
    ...variablesDe(marque, TAILWIND.map((nuance) => `slate/${nuance}`)),
    // Une rampe d'alias : aucune couleur à lire.
    ...TAILWIND.map((nuance) => ({ id: `C3/primary/${nuance}`, nom: `primary/${nuance}`, collection: 'C3', valeurs: { 'C3:0': null } })),
    // Deux écritures de la même nuance : la première lue la garde.
    ...variablesDe(marque, ['zinc/050', 'zinc/50', 'zinc/100', 'zinc/200', 'zinc/300', 'zinc/400']),
  ];
  const possedees = new Set(TAILWIND.map((nuance) => `C1/colors/Bleu/soft/light/${nuance}`));
  const palettes = palettesDuFichier(variables, [locale, marque], possedees);
  assert.deepEqual(palettes.map((palette) => `${palette.nomDeLaCollection} ${palette.chemin} ${palette.nuances.length}`), ['Primitives slate 11', 'Brand slate 11', 'Brand zinc 5']);
  assert.equal(palettes[2].variables[0], 'C3/zinc/050');
  // Sans le suivi, les variables du plugin seraient une palette du fichier.
  assert.equal(palettesDuFichier(variables, [locale, marque]).length, 4);
});

test('[VAR-12] les chemins de la bibliothèque Intencial : chaque rampe de couleur de son tokens.json est une palette', (t) => {
  const fichier = path.resolve(__dirname, '../../../../intencial-library/src/tokens/tokens.json');
  if (!fs.existsSync(fichier)) {
    t.skip('le dépôt voisin intencial-library est absent');
    return;
  }
  const feuilles: string[][] = [];
  const parcourir = (noeud: unknown, chemin: string[]): void => {
    if (!noeud || typeof noeud !== 'object') return;
    const groupe = noeud as Record<string, unknown>;
    if ('$value' in groupe) {
      // Un littéral de couleur, pas une référence : la détection ne suit pas les alias.
      if (groupe.$type === 'color' && typeof groupe.$value === 'object') feuilles.push(chemin);
      return;
    }
    for (const [cle, enfant] of Object.entries(groupe)) if (!cle.startsWith('$')) parcourir(enfant, [...chemin, cle]);
  };
  parcourir(JSON.parse(fs.readFileSync(fichier, 'utf8')), []);
  const collections = [...new Set(feuilles.map(([premier]) => premier))].map((nom) => collection(nom, nom));
  const variables = feuilles.map(([premier, ...reste]) => ({ id: [premier, ...reste].join('/'), nom: reste.join('/'), collection: premier, valeurs: { [`${premier}:0`]: '#000000' } }));
  const palettes = palettesDuFichier(variables, collections);
  const rampes = palettes.map((palette) => `${palette.nomDeLaCollection}/${palette.chemin}`);
  assert.ok(rampes.includes('primitives/colors/titanium'), rampes.join(', '));
  assert.ok(rampes.length >= 9, rampes.join(', '));
  assert.ok(palettes.every((palette) => palette.nuances.length >= 5));
});

// ------------------------------------------------------------ une palette figée (format 8)

test('[VAR-13] une palette figée s’analyse sans garantie, et son plan écrit ses couleurs telles quelles, une variable par thème et par nuance', () => {
  const nuances = [50, 100, 200, 300, 400];
  const light = ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8'];
  const dark = ['#020617', '#0F172A', '#1E293B', '#334155', '#475569'];
  const { parts: _parts, ...sansParts } = GRIS;
  const figee: Palette = { ...sansParts, id: 'p-0000000f', nom: 'slate', reference: '#E2E8F0', crans: nuances, figees: { light, dark } };
  const recette = ajouter(VIDE, figee);
  assert.deepEqual(validerRecette(recette), { recette });
  const analyse = analyserPalette(recette, figee);
  assert.equal(analyse.libre, true);
  assert.deepEqual(analyse.promesses, []);
  assert.deepEqual(analyse.intensites, ['unique']);
  assert.equal(analyse.ancrage.crans.light, 200);
  const plan = planDesVariables(recette, figee, DESTINATION_PAR_DEFAUT);
  assert.deepEqual(plan.map((entree) => entree.hexa), [...light, ...dark]);
  assert.deepEqual([plan[0].nom, plan[9].nom], ['colors/slate/light/50', 'colors/slate/dark/400']);
});
