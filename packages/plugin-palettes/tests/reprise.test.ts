/** « Modifier dans le plugin » : reprendre une palette du fichier, la lier à ses variables d'origine et les remplacer ([VAR-13]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { fnv1a, jsonCanonique, lireHexa, octetsUtf8, recetteParDefaut, validerRecette, type Palette, type Recette } from 'ucm-couleur';

import { ajouter, nomDeLaReprise, remplacerPalette, reprendreDuFichier, supprimer } from '../src/edition';
import { ecrireLesVariables, reprendreLaPalette, retirerLesVariables, type FigmaDesVariablesEcrites } from '../src/ecriture/variables';
import { lireLesVariablesDuFichier, lireLeSuiviRange } from '../src/lectureDesVariables';
import { palettesDuFichier, type PaletteDuFichier } from '../src/variables/detection';
import { tokensDeLaPalette } from '../src/variables/gestion';
import { modesDeLaReprise, sourceDeLaReprise, suiviDeLaReprise } from '../src/variables/reprise';
import { variablesSuivies } from '../src/variables/suivi';
import { FauxFigma, type FausseCollection } from './figmaDeTest';

const VIDE = recetteParDefaut();
const TAILWIND = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const SLATE = ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617'];
const NUIT = [...SLATE].reverse();

const api = (figma: FauxFigma) => figma as unknown as FigmaDesVariablesEcrites;
const empreinte = (recette: Recette): string | null => (recette === VIDE ? null : fnv1a(octetsUtf8(jsonCanonique(recette))));
const composantes = (hexa: string) => {
  const [r, g, b] = lireHexa(hexa)!;
  return { r: r / 255, g: g / 255, b: b / 255, a: 1 };
};

/** Une collection du fichier qui porte une rampe sous `chemin`, une couleur par nuance et par mode. */
function rampe(figma: FauxFigma, collection: FausseCollection, chemin: string, nuances: readonly number[], couleurs: readonly (readonly string[])[]): void {
  nuances.forEach((nuance, rang) => {
    const variable = figma.variables.createVariable(chemin === '' ? String(nuance) : `${chemin}/${nuance}`, collection, 'COLOR');
    collection.modes.forEach((mode, colonne) => variable.setValueForMode(mode.modeId, composantes(couleurs[colonne][rang])));
  });
}

/** Un fichier qui porte `slate` dans une collection à un mode, sans recette. */
function fichierAvecSlate(): { figma: FauxFigma; collection: FausseCollection } {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Primitives');
  rampe(figma, collection, 'slate', TAILWIND, [SLATE]);
  figma.journal.length = 0;
  return { figma, collection };
}

async function duFichier(figma: FauxFigma, recette: Recette = VIDE): Promise<PaletteDuFichier[]> {
  const lu = await lireLesVariablesDuFichier(api(figma));
  return palettesDuFichier(lu.variables, lu.collections, variablesSuivies(lu.suivi, new Set(recette.palettes.map((palette) => palette.id))));
}

const hexa = (figma: FauxFigma, nom: string, mode?: string): string => {
  const variable = figma.variable(nom);
  const valeur = variable.valuesByMode[mode ?? variable.collection.defaultModeId] as { r: number; g: number; b: number };
  return `#${[valeur.r, valeur.g, valeur.b].map((composante) => Math.round(composante * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

async function reprendre(figma: FauxFigma, source: PaletteDuFichier, mode: 'recalculees' | 'telles-quelles', avant: Recette = VIDE): Promise<{ recette: Recette; palette: Palette }> {
  const palette = reprendreDuFichier(avant, 'p-000000a1', source, mode)!;
  const recette = ajouter(avant, palette);
  const issue = await reprendreLaPalette(api(figma), { recette, empreinteLue: empreinte(avant), palette: palette.id, source: { collection: source.collection, chemin: source.chemin } });
  assert.deepEqual(issue, { issue: 'reprise', empreinte: empreinte(recette) });
  return { recette, palette };
}

const tokens = async (figma: FauxFigma, recette: Recette, palette: Palette) => tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma)));

// ------------------------------------------------------------ la palette reprise

test('[VAR-13] une palette reprise porte une intensité, le nom de son dernier segment de chemin et la couleur de sa nuance 600 pour référence', async () => {
  const { figma } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const palette = reprendreDuFichier(VIDE, 'p-000000a1', source, 'recalculees')!;
  assert.equal(palette.nom, 'slate');
  assert.equal(palette.reference, '#475569');
  assert.equal(palette.intensites, 1);
  // Ses nuances sont celles de la recette : elle suit la liste commune.
  assert.equal(palette.crans, undefined);
  assert.equal(palette.figees, undefined);
  assert.deepEqual(validerRecette(ajouter(VIDE, palette)), { recette: ajouter(VIDE, palette) });
});

test('[VAR-13] le nom vient du dernier segment non numérique du chemin, ou de la collection pour des variables à la racine', () => {
  const source = { chemin: 'brand/emerald', nomDeLaCollection: 'Brand' } as PaletteDuFichier;
  assert.equal(nomDeLaReprise(source), 'emerald');
  assert.equal(nomDeLaReprise({ ...source, chemin: 'colors/2024/100' }), 'colors');
  assert.equal(nomDeLaReprise({ ...source, chemin: '' }), 'Brand');
});

test('[VAR-13] recalculée, une palette aux nuances propres devient libre quand une liste libre les accepte, et suit la liste commune sinon', async () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Tokens');
  rampe(figma, collection, 'gris', [100, 300, 500, 700, 900], [SLATE]);
  rampe(figma, collection, 'ton', [0, 10, 20, 30, 40, 50, 60], [SLATE]);
  const [gris, ton] = await duFichier(figma);
  const libre = reprendreDuFichier(VIDE, 'p-000000a1', gris, 'recalculees')!;
  assert.deepEqual(libre.crans, [100, 300, 500, 700, 900]);
  // La nuance la plus proche de 600 ; à distance égale, la plus sombre.
  assert.equal(libre.reference, SLATE[3]);
  assert.ok('recette' in validerRecette(ajouter(VIDE, libre)));
  // Quand la nuance 600 porte un alias en Light, la référence vient de la nuance colorée la plus proche, la plus sombre à distance égale.
  const themes = figma.variables.createVariableCollection('Thèmes');
  themes.renameMode(themes.defaultModeId, 'Light');
  themes.addMode('Dark');
  rampe(figma, themes, 'accent', [500, 600, 700, 800, 900], [SLATE, NUIT]);
  figma.variable('accent/600').setValueForMode(themes.defaultModeId, { type: 'VARIABLE_ALIAS', id: figma.variable('accent/500').id });
  const accent = (await duFichier(figma)).find((trouvee) => trouvee.chemin === 'accent')!;
  assert.equal(accent.reference, 600);
  assert.equal(reprendreDuFichier(VIDE, 'p-000000a3', accent, 'recalculees')!.reference, SLATE[2]);
  const commune = reprendreDuFichier(VIDE, 'p-000000a2', ton, 'recalculees')!;
  assert.equal(commune.crans, undefined);
  assert.equal(commune.reference, SLATE[6]);
});

test('[VAR-13] telle quelle, la palette est figée aux couleurs lues, thème Dark compris, sur les seules nuances que Light colore', async () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Brand');
  collection.renameMode(collection.defaultModeId, 'Light');
  const dark = collection.addMode('Dark');
  rampe(figma, collection, 'brand/slate', TAILWIND, [SLATE, NUIT]);
  // La nuance 50 porte un alias en Light, la 100 un alias en Dark.
  figma.variable('brand/slate/50').setValueForMode(collection.defaultModeId, { type: 'VARIABLE_ALIAS', id: figma.variable('brand/slate/100').id });
  figma.variable('brand/slate/100').setValueForMode(dark, { type: 'VARIABLE_ALIAS', id: figma.variable('brand/slate/200').id });
  const [source] = await duFichier(figma);
  const palette = reprendreDuFichier(VIDE, 'p-000000a1', source, 'telles-quelles')!;
  assert.deepEqual(palette.crans, TAILWIND.slice(1));
  assert.deepEqual(palette.figees, { light: SLATE.slice(1), dark: [SLATE[1], ...NUIT.slice(2)] });
  assert.ok('recette' in validerRecette(ajouter(VIDE, palette)));
  // Le plugin n'écrase pas un alias : la liaison ne suit pas la variable dans le thème où elle en porte un.
  const cles = Object.keys(suiviDeLaReprise(source).variables);
  assert.equal(cles.length, 20);
  assert.ok(!cles.includes('unique/light/50') && !cles.includes('unique/dark/100') && cles.includes('unique/dark/50'));
  // Une collection à un mode ne fige que Light.
  const { figma: simple } = fichierAvecSlate();
  assert.deepEqual(reprendreDuFichier(VIDE, 'p-000000a1', (await duFichier(simple))[0], 'telles-quelles')!.figees, { light: SLATE });
});

test('[VAR-13] Light vise le mode nommé « light » ou le premier, Dark un autre mode nommé « dark », et rien sans lui', () => {
  const modes = (...noms: string[]) => noms.map((nom, rang) => ({ id: `m${rang}`, nom }));
  assert.deepEqual(modesDeLaReprise(modes('Mode 1')), { light: { id: 'm0', nom: 'Mode 1' }, dark: null });
  assert.deepEqual(modesDeLaReprise(modes('Dark', 'LIGHT theme')), { light: { id: 'm1', nom: 'LIGHT theme' }, dark: { id: 'm0', nom: 'Dark' } });
  assert.deepEqual(modesDeLaReprise(modes('Marque A', 'Marque B')), { light: { id: 'm0', nom: 'Marque A' }, dark: null });
  assert.deepEqual(modesDeLaReprise(modes('Darkest', 'Dark')), { light: { id: 'm0', nom: 'Darkest' }, dark: { id: 'm1', nom: 'Dark' } });
  assert.deepEqual(modesDeLaReprise([]), { light: null, dark: null });
});

// ------------------------------------------------------------ la liaison

test('[VAR-13] la liaison de reprise désigne les variables d’origine, et la dernière couleur écrite prend la couleur lue', async () => {
  const { figma, collection } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const suivie = suiviDeLaReprise(source);
  assert.equal(suivie.liaison, 'reprise');
  assert.equal(suivie.collection, collection.id);
  assert.deepEqual(suivie.modes, { light: collection.defaultModeId });
  assert.deepEqual(Object.keys(suivie.variables), TAILWIND.map((nuance) => `unique/light/${nuance}`));
  assert.deepEqual(suivie.variables['unique/light/600'], { id: figma.variable('slate/600').id, ecrite: '#475569' });
});

test('[VAR-13] la reprise range la recette et la liaison ensemble, sous un seul commitUndo, sans écrire une variable', async () => {
  const { figma } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'telles-quelles');
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'recette'), jsonCanonique(recette));
  assert.equal(lireLeSuiviRange(figma.root).palettes[palette.id].liaison, 'reprise');
  assert.deepEqual(figma.journal.filter((ligne) => ligne !== 'lire variables'), ['commitUndo']);
  // La palette quitte « Déjà dans le fichier », et ses tokens sont à jour sans écriture.
  assert.deepEqual(await duFichier(figma, recette), []);
  const etat = await tokens(figma, recette, palette);
  assert.deepEqual([etat.etat, etat.variables, etat.aCreer.length, etat.aRemplacer, etat.reprise, etat.collection], ['a-jour', 11, 0, 0, true, 'Primitives']);
});

test('[VAR-13] recalculée, la palette est à mettre à jour ; l’écriture remplace les couleurs sans créer, renommer ni déplacer une variable', async () => {
  const { figma, collection } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  const avant = await tokens(figma, recette, palette);
  assert.equal(avant.etat, 'a-mettre-a-jour');
  assert.ok(avant.aRemplacer > 0 && avant.aRemplacer <= 11);
  // La couleur de la nuance 600 devient la référence, que le plugin ancre à la nuance de sa luminosité : la 800, sur ses courbes.
  assert.equal(avant.aEcrire.find((couleur) => couleur.cle === 'unique/light/800')?.plugin, '#475569');
  const noms = figma.variablesDe(collection).map((variable) => [variable.id, variable.name]);
  figma.journal.length = 0;

  const resultat = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(resultat, { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 0, ecrites: avant.aRemplacer }] });
  assert.deepEqual(figma.variablesDe(collection).map((variable) => [variable.id, variable.name]), noms);
  assert.equal(figma.collections.size, 1);
  assert.equal(figma.journal.filter((ligne) => ligne.startsWith('créer') || ligne.startsWith('retirer')).length, 0);
  assert.equal(figma.journal.filter((ligne) => ligne === 'commitUndo').length, 1);
  assert.equal(hexa(figma, 'slate/800'), '#475569');
  assert.equal((await tokens(figma, recette, palette)).etat, 'a-jour');
});

test('[VAR-13] une collection à deux modes Light et Dark reçoit les deux thèmes ; sans mode reconnu, seul le premier s’écrit', async () => {
  for (const [noms, ecritDark] of [[['Light', 'Dark'], true], [['Marque A', 'Marque B'], false]] as const) {
    const figma = new FauxFigma();
    const collection = figma.variables.createVariableCollection('Brand');
    collection.renameMode(collection.defaultModeId, noms[0]);
    const second = collection.addMode(noms[1]);
    rampe(figma, collection, 'slate', TAILWIND, [SLATE, NUIT]);
    const [source] = await duFichier(figma);
    const { recette, palette } = await reprendre(figma, source, 'recalculees');
    assert.deepEqual(Object.keys(lireLeSuiviRange(figma.root).palettes[palette.id].modes), ecritDark ? ['light', 'dark'] : ['light']);
    await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
    // Le second mode change quand il est le thème Dark, et garde ses couleurs sinon.
    const secondes = TAILWIND.map((nuance) => hexa(figma, `slate/${nuance}`, second));
    assert.equal(secondes.join() !== NUIT.join(), ecritDark, noms.join());
    assert.equal((await tokens(figma, recette, palette)).etat, 'a-jour');
  }
});

test('[VAR-13] [VAR-06] une variable d’origine retouchée dans Figma après la reprise refuse l’écriture sans le choix du designer', async () => {
  const { figma, collection } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'telles-quelles');
  figma.variable('slate/50').setValueForMode(collection.defaultModeId, composantes('#FF0000'));
  assert.equal((await tokens(figma, recette, palette)).etat, 'modifies');
  const refusee = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(refusee, { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'modifiee', couleurs: 1 }] });
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [palette.id] });
  assert.equal(hexa(figma, 'slate/50'), SLATE[0]);
});

test('[VAR-13] une variable d’origine disparue ne se recrée pas : elle quitte le suivi à l’écriture', async () => {
  const { figma } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  figma.variable('slate/950').remove();
  assert.equal((await tokens(figma, recette, palette)).etat, 'introuvables');
  const resultat = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.equal(resultat.issue === 'ecrites' && resultat.palettes[0].issue === 'ecrite' && resultat.palettes[0].creees, 0);
  assert.equal(figma.locales.size, 10);
  assert.equal(lireLeSuiviRange(figma.root).palettes[palette.id].variables['unique/light/950'], undefined);
  assert.equal((await tokens(figma, recette, palette)).etat, 'a-jour');
});

test('[VAR-13] passer de « Recalculées » à « Telles quelles » est un rangement ordinaire : le suivi garde les couleurs lues', async () => {
  const { figma } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  const figee = { ...reprendreDuFichier(VIDE, palette.id, source, 'telles-quelles')! };
  const basculee = remplacerPalette(recette, figee);
  assert.equal((await tokens(figma, basculee, figee)).etat, 'a-jour');
  assert.equal((await tokens(figma, recette, palette)).etat, 'a-mettre-a-jour');
});

test('[VAR-13] la reprise refuse une recette changée ailleurs, une recette invalide, une palette que le fichier ne porte plus et un suivi futur', async () => {
  const { figma } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const palette = reprendreDuFichier(VIDE, 'p-000000a1', source, 'recalculees')!;
  const recette = ajouter(VIDE, palette);
  const demande = { recette, empreinteLue: null, palette: palette.id, source: { collection: source.collection, chemin: source.chemin } };
  assert.deepEqual(await reprendreLaPalette(api(figma), { ...demande, empreinteLue: 'aaaaaaaa' }), { issue: 'modifiee-ailleurs' });
  assert.equal((await reprendreLaPalette(api(figma), { ...demande, recette: { ...recette, gamut: 'p3' } })).issue, 'invalide');
  assert.deepEqual(await reprendreLaPalette(api(figma), { ...demande, source: { ...demande.source, chemin: 'zinc' } }), { issue: 'palette-introuvable' });
  assert.deepEqual(await reprendreLaPalette(api(figma), { ...demande, palette: 'p-ffffffff' }), { issue: 'palette-introuvable' });
  assert.deepEqual(figma.journal.filter((ligne) => ligne === 'commitUndo'), []);
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'recette'), '');
  figma.root.setSharedPluginData('ucm_palettes', 'variables', JSON.stringify({ version: 2 }));
  assert.deepEqual(await reprendreLaPalette(api(figma), demande), { issue: 'suivi-futur' });
});

test('[VAR-13] une palette reprise puis supprimée rend ses variables à « Déjà dans le fichier », et son suivi s’oublie sans rien retirer', async () => {
  const { figma } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'telles-quelles');
  // Une palette reprise ne se reprend pas deux fois.
  const seconde = { recette: ajouter(recette, { ...palette, id: 'p-000000a2' }), empreinteLue: empreinte(recette), palette: 'p-000000a2', source: { collection: source.collection, chemin: source.chemin } };
  assert.deepEqual(await reprendreLaPalette(api(figma), seconde), { issue: 'palette-introuvable' });

  const sans = supprimer(recette, palette.id);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(sans));
  assert.deepEqual((await duFichier(figma, sans)).map((trouvee) => trouvee.chemin), ['slate']);
  assert.deepEqual(await retirerLesVariables(api(figma), { palette: palette.id }), { issue: 'retirees', retirees: 0 });
  assert.equal(figma.locales.size, 11);
  assert.equal(lireLeSuiviRange(figma.root).palettes[palette.id], undefined);
});

test('[UI-34] la liaison rend la palette du fichier qu’elle désigne, relue dans les variables d’aujourd’hui', async () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Brand');
  collection.renameMode(collection.defaultModeId, 'Light');
  collection.addMode('Dark');
  rampe(figma, collection, 'brand/slate', TAILWIND, [SLATE, NUIT]);
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  const lu = await lireLesVariablesDuFichier(api(figma));
  assert.deepEqual(sourceDeLaReprise(lu.suivi.palettes[palette.id], lu), source);
  const etat = tokensDeLaPalette(recette, palette, lu);
  assert.deepEqual([etat.reprise, etat.collection, etat.origine, etat.variables], [true, 'Brand', 'brand/slate', 11]);
  // Une collection disparue, ou des variables toutes retirées, ne rendent aucune palette.
  assert.equal(sourceDeLaReprise({ ...lu.suivi.palettes[palette.id], collection: 'inconnue' }, lu), null);
  assert.equal(sourceDeLaReprise(lu.suivi.palettes[palette.id], { ...lu, variables: [] }), null);
});
