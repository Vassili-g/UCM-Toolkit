/** « Modifier dans le plugin » : reprendre une palette du fichier, la lier à ses variables d'origine et les remplacer ([VAR-13]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { fnv1a, intensitePorteuse, jsonCanonique, lireHexa, octetsUtf8, recetteParDefaut, validerRecette, type Palette, type Recette } from 'ucm-couleur';

import { ajouter, choisirLesIntensites, nomDeLaReprise, remplacerPalette, reprendreDuFichier, revenirAuModele, supprimer } from '../src/edition';
import { ecrireLesVariables, rangerLaDestination, reprendreLaPalette, retirerLesVariables, type FigmaDesVariablesEcrites } from '../src/ecriture/variables';
import { lireLesVariablesDuFichier, lireLeSuiviRange } from '../src/lectureDesVariables';
import { palettesDuFichier, type PaletteDuFichier } from '../src/variables/detection';
import { tokensDeLaPalette } from '../src/variables/gestion';
import { planDesVariables } from '../src/variables/plan';
import { modesDeLaReprise, sourceDeLaReprise, suiviDeLaReprise } from '../src/variables/reprise';
import { texteDuSuivi, variablesSuivies } from '../src/variables/suivi';
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
  const suivi = lireLeSuiviRange(figma.root);
  if (!suivi.confirmee) {
    const groupe = source.chemin.split('/').slice(0, -1).join('/');
    figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...suivi, destination: { ...suivi.destination, groupe } }));
  }
  const palette = reprendreDuFichier(avant, 'p-000000a1', source, mode)!;
  const recette = ajouter(avant, palette);
  const issue = await reprendreLaPalette(api(figma), { recette, empreinteLue: empreinte(avant), palette: palette.id, source: { collection: source.collection, chemin: source.chemin } });
  assert.deepEqual(issue, { issue: 'reprise', empreinte: empreinte(recette) });
  return { recette, palette };
}

const tokens = async (figma: FauxFigma, recette: Recette, palette: Palette) => tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma)));

test('[VAR-13] une collision Dark reste visible après l’écriture partielle et se résout après renommage', async () => {
  const { figma, collection } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  const etrangere = figma.variables.createVariable('slate/dark/50', collection, 'COLOR');
  etrangere.setValueForMode(collection.defaultModeId, composantes('#FF0000'));
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  const partielle = await tokens(figma, recette, palette);
  assert.deepEqual(partielle.nomsOccupes, ['slate/dark/50']);
  assert.equal(partielle.etat, 'a-mettre-a-jour');
  assert.equal(partielle.variables, 21);
  assert.equal(hexa(figma, 'slate/dark/50'), '#FF0000');
  etrangere.name = 'hors-palette/50';
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.equal((await tokens(figma, recette, palette)).etat, 'a-jour');
});

test('[VAR-13] un mode suivi supprimé refuse la reprise avant toute mutation et garde le suivi', async () => {
  const { figma, collection } = fichierAvecSlate();
  collection.renameMode(collection.defaultModeId, 'Light');
  const dark = collection.addMode('Dark');
  for (const variable of figma.variablesDe(collection)) variable.setValueForMode(dark, composantes('#010203'));
  const { recette, palette } = await reprendre(figma, (await duFichier(figma))[0], 'recalculees');
  collection.modes = collection.modes.filter((mode) => mode.modeId !== dark);
  const avant = figma.root.getSharedPluginData('ucm_palettes', 'variables');
  figma.journal.length = 0;
  assert.deepEqual(await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [palette.id] }), {
    issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'mode-introuvable', mode: 'dark' }],
  });
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'variables'), avant);
  assert.ok(!figma.journal.some((ligne) => /^(valeur|renommer|créer|commitUndo)/.test(ligne)));
});

test('[VAR-13] Telles quelles relit une retouche Dark dans une variable séparée', async () => {
  const { figma, collection } = fichierAvecSlate();
  const { recette, palette } = await reprendre(figma, (await duFichier(figma))[0], 'recalculees');
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  figma.variable('slate/dark/600').setValueForMode(collection.defaultModeId, composantes('#AABBCC'));
  const lu = await lireLesVariablesDuFichier(api(figma));
  const source = sourceDeLaReprise(lu.suivi.palettes[palette.id], lu)!;
  const figee = reprendreDuFichier(recette, palette.id, source, 'telles-quelles')!;
  assert.equal(figee.figees?.dark?.[TAILWIND.indexOf(600)], '#AABBCC');
  assert.equal((await tokens(figma, recette, palette)).themes, 'chemin');
  await rangerLaDestination(api(figma), { collection: { id: collection.id }, groupe: '', themes: 'modes' });
  assert.equal((await tokens(figma, recette, palette)).themes, 'chemin');
});

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

test('[VAR-13] une reprise choisit un mode avec des couleurs directes quand Light et Dark ne portent que des alias', async () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('primitives');
  collection.renameMode(collection.defaultModeId, 'Light');
  const dark = collection.addMode('Dark');
  const marque = collection.addMode('Marque');
  rampe(figma, collection, 'Colors/Deep', TAILWIND, [SLATE, NUIT, SLATE]);
  for (const nuance of TAILWIND) {
    const variable = figma.variable(`Colors/Deep/${nuance}`);
    variable.setValueForMode(collection.modes[0].modeId, { type: 'VARIABLE_ALIAS', id: variable.id });
    variable.setValueForMode(dark, { type: 'VARIABLE_ALIAS', id: variable.id });
  }
  const [source] = await duFichier(figma);
  assert.equal(source.modes.find((mode) => mode.id === marque)?.nom, 'Marque');
  const { recette, palette } = await reprendre(figma, source, 'telles-quelles');
  const tokensAvant = await tokens(figma, recette, palette);
  assert.deepEqual([tokensAvant.etat, tokensAvant.variables, tokensAvant.aCreer.length, tokensAvant.origine], ['a-jour', 11, 0, 'Colors/Deep']);
  const idsAvant = source.variables;
  const resultat = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(resultat, { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 0, ecrites: 0 }] });
  assert.deepEqual(figma.variablesDe(collection).map((variable) => variable.id), idsAvant);
  assert.equal(figma.collections.size, 1);
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

test('[VAR-13] une reprise sans variables suivies conserve son chemin et peut créer la palette', async () => {
  const { figma, collection } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  const suivi = lireLeSuiviRange(figma.root);
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({
    ...suivi,
    palettes: { ...suivi.palettes, [palette.id]: { ...suivi.palettes[palette.id], variables: {} } },
  }));
  const variables = [...figma.variablesDe(collection)];
  for (const variable of variables) variable.remove();

  const tokensAvant = await tokens(figma, recette, palette);
  assert.deepEqual([tokensAvant.etat, tokensAvant.aCreer.length], ['jamais-ecrits', 22]);
  assert.ok(tokensAvant.aCreer.every((nom) => nom.startsWith('slate/')));
  const resultat = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(resultat, { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 22, ecrites: 22 }] });
  assert.equal((await tokens(figma, recette, palette)).etat, 'a-jour');

  const fixe = fichierAvecSlate();
  const [sourceFixe] = await duFichier(fixe.figma);
  const repriseFixe = await reprendre(fixe.figma, sourceFixe, 'telles-quelles');
  for (const variable of fixe.figma.variablesDe(fixe.collection)) variable.remove();
  assert.equal((await tokens(fixe.figma, repriseFixe.recette, repriseFixe.palette)).aCreer.length, 22);
  const resultatFixe = await ecrireLesVariables(api(fixe.figma), { palettes: [repriseFixe.palette.id], empreinteLue: empreinte(repriseFixe.recette), remettre: [] });
  assert.deepEqual(resultatFixe, { issue: 'ecrites', palettes: [{ palette: repriseFixe.palette.id, issue: 'ecrite', creees: 22, ecrites: 22 }] });
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

test('[VAR-13] recalculée, la palette est à mettre à jour ; l’écriture remplace les couleurs d’origine, range leurs variables sous `light` sans changer leur identifiant, et crée le thème Dark sous `dark`', async () => {
  const { figma, collection } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  const avant = await tokens(figma, recette, palette);
  assert.equal(avant.etat, 'a-mettre-a-jour');
  assert.ok(avant.aRemplacer > 0 && avant.aRemplacer <= 11);
  // La collection n'a qu'un mode et la destination met les thèmes dans le chemin : le thème Dark se crée sous `dark`, et les variables d'origine passent sous `light`.
  assert.deepEqual(avant.aCreer, TAILWIND.map((nuance) => `slate/dark/${nuance}`));
  assert.deepEqual([avant.aRenommer.length, avant.aRenommer[0]], [11, { de: 'slate/50', vers: 'slate/light/50' }]);
  assert.equal(avant.variables, 22);
  // La couleur de la nuance 600 devient la référence, que le plugin ancre à la nuance de sa luminosité : la 800, sur ses courbes.
  assert.equal(avant.aEcrire.find((couleur) => couleur.cle === 'unique/light/800')?.plugin, '#475569');
  const origine = figma.variablesDe(collection).map((variable) => variable.id);
  figma.journal.length = 0;

  const resultat = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(resultat, { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 11, ecrites: avant.aRemplacer + 11 }] });
  assert.deepEqual(figma.variablesDe(collection).slice(0, 11).map((variable) => [variable.id, variable.name]), origine.map((id, rang) => [id, `slate/light/${TAILWIND[rang]}`]));
  assert.equal(figma.collections.size, 1);
  assert.equal(figma.journal.filter((ligne) => ligne.startsWith('créer variable')).length, 11);
  assert.equal(figma.journal.filter((ligne) => ligne.startsWith('retirer') || ligne.startsWith('ajouter mode')).length, 0);
  assert.equal(figma.journal.filter((ligne) => ligne === 'commitUndo').length, 1);
  assert.equal(hexa(figma, 'slate/light/800'), '#475569');
  // Une variable créée naît sans portée, comme toute primitive du plugin.
  assert.deepEqual(figma.variable('slate/dark/50').scopes, []);
  const apres = await tokens(figma, recette, palette);
  assert.deepEqual([apres.etat, apres.variables, apres.aCreer.length, apres.aRemplacer, apres.aRenommer.length, apres.origine], ['a-jour', 22, 0, 0, 0, 'slate']);
  // Une seconde écriture ne change rien.
  assert.deepEqual(await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] }), { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 0, ecrites: 0 }] });
});

test('[VAR-13] une reprise suit la casse du chemin quand Figma renomme ses variables sans changer leur structure', async () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('primitives');
  rampe(figma, collection, 'Colors/Titanium', TAILWIND, [SLATE]);
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');

  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.equal(lireLeSuiviRange(figma.root).palettes[palette.id].chemin, 'Colors/Titanium');
  for (const variable of figma.variablesDe(collection)) variable.name = variable.name.replace(/^Colors(?=\/)/, 'colors');

  const apres = await tokens(figma, recette, palette);
  assert.deepEqual([apres.etat, apres.aRenommer.length, apres.origine], ['a-jour', 0, 'colors/Titanium']);
});

test('[VAR-13] une reprise renomme les variables sous le groupe configuré sans en créer de doublons', async () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('primitives');
  rampe(figma, collection, 'Colors/Deep', TAILWIND, [SLATE]);
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');

  await rangerLaDestination(api(figma), { collection: { id: collection.id }, groupe: 'colors', themes: 'modes' });
  const avant = await tokens(figma, recette, palette);
  assert.equal(avant.aCreer.length, 0);
  assert.equal(avant.aRenommer.length, 11);
  assert.ok(avant.aRenommer.every(({ vers }) => vers.startsWith('colors/Deep/')));

  const ids = figma.variablesDe(collection).map((variable) => variable.id);
  const resultat = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(resultat, { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 0, ecrites: 22 }] });
  assert.deepEqual(figma.variablesDe(collection).map((variable) => [variable.id, variable.name]), ids.map((id, rang) => [id, `colors/Deep/${TAILWIND[rang]}`]));
  assert.equal(figma.collections.size, 1);
  assert.equal(figma.variablesDe(collection).filter((variable) => variable.name.startsWith('Colors/Deep/')).length, 0);
  assert.equal(figma.variablesDe(collection).filter((variable) => variable.name.startsWith('colors/Deep/')).length, 11);
  assert.equal(collection.modes.some((mode) => mode.name === 'Dark'), true);
  assert.deepEqual([(await tokens(figma, recette, palette)).etat, (await tokens(figma, recette, palette)).aCreer.length], ['a-jour', 0]);
});

test('[VAR-13] Deep sous colors respecte les deux destinations, les identifiants et le compte de Gestion après deux écritures', async () => {
  for (const themes of ['chemin', 'modes'] as const) {
    const figma = new FauxFigma();
    const collection = figma.variables.createVariableCollection('primitives');
    rampe(figma, collection, 'Colors/Deep', TAILWIND, [SLATE]);
    const ids = figma.variablesDe(collection).map((variable) => variable.id);
    const [source] = await duFichier(figma);
    const { recette, palette } = await reprendre(figma, source, 'recalculees');
    const destination = { collection: { id: collection.id }, groupe: 'colors', themes };
    await rangerLaDestination(api(figma), destination);
    const avant = await tokens(figma, recette, palette);
    assert.equal(avant.variables, themes === 'chemin' ? 22 : 11);
    assert.equal(avant.aCreer.length, themes === 'chemin' ? 11 : 0);
    const demande = { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] };
    const resultat = await ecrireLesVariables(api(figma), demande);
    assert.equal(resultat.issue === 'ecrites' && resultat.palettes[0].issue, 'ecrite');
    const attendu = planDesVariables(recette, palette, destination);
    assert.deepEqual(figma.variablesDe(collection).map((variable) => variable.name), [...new Set(attendu.map((entree) => entree.nom))]);
    TAILWIND.forEach((nuance, rang) => assert.equal(figma.variable(`colors/Deep/${themes === 'chemin' ? 'light/' : ''}${nuance}`).id, ids[rang]));
    const suivi = lireLeSuiviRange(figma.root).palettes[palette.id];
    for (const entree of attendu) {
      const mode = entree.mode === 'unique' ? suivi.modes.light : suivi.modes[entree.mode];
      assert.equal(hexa(figma, entree.nom, mode), entree.hexa);
    }
    assert.equal((await tokens(figma, recette, palette)).etat, 'a-jour');
    const tousLesIds = [...figma.locales.keys()];
    assert.deepEqual(await ecrireLesVariables(api(figma), demande), { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 0, ecrites: 0 }] });
    assert.deepEqual([...figma.locales.keys()], tousLesIds);
  }
});

test('[VAR-13] une recette changée pendant la lecture de reprise reste intacte', async () => {
  const { figma } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const palette = reprendreDuFichier(VIDE, 'p-000000a1', source, 'recalculees')!;
  const recette = ajouter(VIDE, palette);
  const lire = figma.variables.getLocalVariablesAsync;
  const changee = { ...VIDE, seuils: { ...VIDE.seuils, texte: 7 } };
  figma.variables.getLocalVariablesAsync = async (type) => {
    const variables = await lire(type);
    figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(changee));
    return variables;
  };
  assert.deepEqual(await reprendreLaPalette(api(figma), { recette, empreinteLue: null, palette: palette.id, source }), { issue: 'modifiee-ailleurs' });
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'recette'), jsonCanonique(changee));
});

test('[VAR-13] une palette reprise qui gagne des nuances et une intensité n’est plus à jour : les nuances se créent à côté des variables d’origine, et chaque intensité prend son segment', async () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('primitives');
  // Neuf nuances, de 50 à 800, sous `Colors/Titanium`, dans une collection à un mode.
  rampe(figma, collection, 'Colors/Titanium', TAILWIND.slice(0, 9), [SLATE]);
  const [source] = await duFichier(figma);
  const { recette: reprise, palette: libre } = await reprendre(figma, source, 'recalculees');
  assert.deepEqual(libre.crans, TAILWIND.slice(0, 9));
  await ecrireLesVariables(api(figma), { palettes: [libre.id], empreinteLue: empreinte(reprise), remettre: [] });
  assert.equal((await tokens(figma, reprise, libre)).etat, 'a-jour');

  // Rendue au modèle, la palette porte les onze nuances de la recette.
  const commune = revenirAuModele(reprise, libre);
  const recette = remplacerPalette(reprise, commune);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
  const avant = await tokens(figma, recette, commune);
  assert.equal(avant.etat, 'a-mettre-a-jour');
  assert.deepEqual(avant.aCreer, ['Colors/Titanium/light/900', 'Colors/Titanium/light/950', 'Colors/Titanium/dark/900', 'Colors/Titanium/dark/950']);
  await ecrireLesVariables(api(figma), { palettes: [commune.id], empreinteLue: empreinte(recette), remettre: [] });
  const plan = planDesVariables(recette, commune, lireLeSuiviRange(figma.root).destination);
  assert.equal(hexa(figma, 'Colors/Titanium/light/950'), plan.find((entree) => entree.cle === 'unique/light/950')!.hexa);
  assert.equal(hexa(figma, 'Colors/Titanium/dark/950'), plan.find((entree) => entree.cle === 'unique/dark/950')!.hexa);
  assert.deepEqual([(await tokens(figma, recette, commune)).etat, (await tokens(figma, recette, commune)).variables], ['a-jour', 22]);

  // À deux intensités, celle qui porte la référence garde les variables d'origine, renommées sous son segment ; l'autre se crée sous le sien.
  const deux = choisirLesIntensites(recette, commune, 2);
  const double = remplacerPalette(recette, deux);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(double));
  const porteuse = intensitePorteuse(double, deux);
  const autre = porteuse === 'soft' ? 'vivid' : 'soft';

  figma.variable('Colors/Titanium/light/600').name = 'Colors/Titanium/light/600-';
  const tiretSeul = await tokens(figma, double, deux);
  assert.ok(tiretSeul.aRenommer.some(({ de, vers }) => de.endsWith('/600-') && vers.endsWith('/600')), 'un tiret seul ne forme pas de suffixe');

  const aDeux = await tokens(figma, double, deux);
  assert.equal(aDeux.etat, 'a-mettre-a-jour');
  assert.deepEqual([aDeux.aCreer.length, aDeux.aRenommer.length], [22, 22]);
  assert.ok(aDeux.aRenommer.some(({ de, vers }) => de.endsWith('/600-') && vers.endsWith(`/${porteuse}/light/600`)));
  for (const rampeACreer of [`${autre}/light`, `${autre}/dark`]) assert.ok(aDeux.aCreer.includes(`Colors/Titanium/${rampeACreer}/950`), rampeACreer);
  assert.ok(aDeux.aRenommer.some(({ de, vers }) => de === 'Colors/Titanium/dark/950' && vers === `Colors/Titanium/${porteuse}/dark/950`));
  await ecrireLesVariables(api(figma), { palettes: [deux.id], empreinteLue: empreinte(double), remettre: [] });
  const complet = planDesVariables(double, deux, lireLeSuiviRange(figma.root).destination);
  assert.equal(hexa(figma, `Colors/Titanium/${porteuse}/light/600`), complet.find((entree) => entree.cle === `${porteuse}/light/600`)!.hexa);
  assert.equal(lireLeSuiviRange(figma.root).palettes[deux.id].intensite, porteuse);
  assert.equal(figma.locales.size, 44);
  assert.equal(hexa(figma, `Colors/Titanium/${autre}/light/600`), complet.find((entree) => entree.cle === `${autre}/light/600`)!.hexa);
  assert.equal((await tokens(figma, double, deux)).etat, 'a-jour');
  assert.deepEqual(await duFichier(figma, double), []);

  figma.variable(`Colors/Titanium/${porteuse}/light/600`).name = `Colors/Titanium/${porteuse}/light/600-base-note`;
  const suffixeSeul = await tokens(figma, double, deux);
  assert.deepEqual([suffixeSeul.etat, suffixeSeul.aRenommer.length], ['a-jour', 0]);

  const une = choisirLesIntensites(double, deux, 1);
  const simple = remplacerPalette(double, une);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(simple));
  const avantUne = await tokens(figma, simple, une);
  assert.ok(avantUne.aRenommer.some(({ de, vers }) => de.endsWith('/600-base-note') && vers.endsWith('/light/600-base-note')));
  await ecrireLesVariables(api(figma), { palettes: [une.id], empreinteLue: empreinte(simple), remettre: [] });
  assert.equal(figma.variable('Colors/Titanium/light/600-base-note').name, 'Colors/Titanium/light/600-base-note');
  assert.equal((await tokens(figma, simple, une)).etat, 'a-jour');
});

test('[VAR-13] un suivi sans chemin, dont le thème Dark est déjà sous `dark` et la rampe Light à la racine, ne fait que renommer les variables d’origine', async () => {
  const { figma, collection } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  // Le fichier tel qu'une écriture sans renommage le laissait : les couleurs du plan, Light à la racine, Dark sous `dark`.
  const plan = planDesVariables(recette, palette, lireLeSuiviRange(figma.root).destination);
  const suivi = lireLeSuiviRange(figma.root);
  const variables: { [cle: string]: { id: string; ecrite: string } } = {};
  for (const entree of plan) {
    const [, mode, nuance] = entree.cle.split('/');
    const variable = mode === 'light' ? figma.variable(`slate/${nuance}`) : figma.variables.createVariable(`slate/dark/${nuance}`, collection, 'COLOR');
    variable.setValueForMode(collection.defaultModeId, composantes(entree.hexa));
    variables[entree.cle] = { id: variable.id, ecrite: entree.hexa };
  }
  figma.root.setSharedPluginData('ucm_palettes', 'variables', JSON.stringify({ ...suivi, palettes: { [palette.id]: { ...suivi.palettes[palette.id], variables } } }));

  const avant = await tokens(figma, recette, palette);
  assert.deepEqual([avant.etat, avant.aCreer.length, avant.aRemplacer, avant.aRenommer.length], ['a-mettre-a-jour', 0, 0, 11]);
  figma.journal.length = 0;
  const resultat = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(resultat, { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 0, ecrites: 0 }] });
  assert.deepEqual(figma.variablesDe(collection).map((variable) => variable.name), [...TAILWIND.map((nuance) => `slate/light/${nuance}`), ...TAILWIND.map((nuance) => `slate/dark/${nuance}`)]);
  assert.equal(figma.journal.filter((ligne) => ligne === 'commitUndo').length, 1);
  // Le suivi garde le chemin d'origine, que les noms ne rendent plus.
  assert.equal(lireLeSuiviRange(figma.root).palettes[palette.id].chemin, 'slate');
  const apres = await tokens(figma, recette, palette);
  assert.deepEqual([apres.etat, apres.aRenommer.length, apres.origine], ['a-jour', 0, 'slate']);
});

test('[VAR-13] [VAR-10] avec les thèmes en modes, une palette reprise trouve ou crée le mode Dark de sa collection, et n’y crée aucune variable', async () => {
  const { figma, collection } = fichierAvecSlate();
  figma.root.setSharedPluginData('ucm_palettes', 'variables', JSON.stringify({ version: 1, destination: { collection: { nom: 'primitives' }, groupe: 'colors', themes: 'modes' }, confirmee: true, palettes: {} }));
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  const avant = await tokens(figma, recette, palette);
  assert.deepEqual([avant.etat, avant.aCreer.length, avant.variables], ['a-mettre-a-jour', 0, 11]);
  figma.journal.length = 0;
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(collection.modes.map((mode) => mode.name), ['Mode 1', 'Dark']);
  assert.equal(figma.journal.filter((ligne) => ligne.startsWith('créer variable')).length, 0);
  const plan = planDesVariables(recette, palette, lireLeSuiviRange(figma.root).destination);
  assert.equal(hexa(figma, 'colors/slate/50', collection.modes[1].modeId), plan.find((entree) => entree.cle === 'unique/dark/50')!.hexa);
  assert.equal((await tokens(figma, recette, palette)).etat, 'a-jour');

  // Une offre limitée à un mode refuse le mode Dark : la palette s'arrête, sans rien écrire.
  const { figma: limite } = fichierAvecSlate();
  limite.limiteDeModes = 1;
  limite.root.setSharedPluginData('ucm_palettes', 'variables', figma.root.getSharedPluginData('ucm_palettes', 'variables').replace(/"palettes":\{.*\}\}$/, '"palettes":{}}'));
  const [autre] = await duFichier(limite);
  const refusee = await reprendre(limite, autre, 'recalculees');
  const resultat = await ecrireLesVariables(api(limite), { palettes: [refusee.palette.id], empreinteLue: empreinte(refusee.recette), remettre: [] });
  assert.equal(resultat.issue === 'ecrites' && resultat.palettes[0].issue, 'modes-refuses');
  assert.equal(hexa(limite, 'slate/800'), SLATE[8]);
});

test('[VAR-13] une palette reprise ne crée pas sous un nom que le fichier porte déjà, et n’écrase pas un alias', async () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Brand');
  collection.renameMode(collection.defaultModeId, 'Light');
  const dark = collection.addMode('Dark');
  rampe(figma, collection, 'slate', TAILWIND, [SLATE, NUIT]);
  // La nuance 100 porte un alias en Dark.
  figma.variable('slate/100').setValueForMode(dark, { type: 'VARIABLE_ALIAS', id: figma.variable('slate/200').id });
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(figma.variable('slate/100').valuesByMode[dark], { type: 'VARIABLE_ALIAS', id: figma.variable('slate/200').id });
  const etat = await tokens(figma, recette, palette);
  assert.deepEqual([etat.etat, etat.variables, etat.aCreer.length], ['a-jour', 11, 0]);

  // Une variable `slate/dark/50` que le plugin ne suit pas garde sa couleur : l'entrée de ce nom sort du plan.
  const { figma: simple, collection: primitives } = fichierAvecSlate();
  simple.variables.createVariable('slate/dark/50', primitives, 'COLOR').setValueForMode(primitives.defaultModeId, composantes('#FF0000'));
  const [slate] = await duFichier(simple);
  const reprise = await reprendre(simple, slate, 'recalculees');
  assert.equal((await tokens(simple, reprise.recette, reprise.palette)).aCreer.length, 10);
  await ecrireLesVariables(api(simple), { palettes: [reprise.palette.id], empreinteLue: empreinte(reprise.recette), remettre: [] });
  assert.equal(hexa(simple, 'slate/dark/50'), '#FF0000');
  assert.equal((await tokens(simple, reprise.recette, reprise.palette)).etat, 'a-mettre-a-jour');
});

test('[VAR-13] sans variable restante, une reprise recrée les deux thèmes dans le chemin configuré malgré ses anciens modes', async () => {
  for (const forme of ['recalculees', 'telles-quelles'] as const) {
    const { figma, collection } = fichierAvecSlate();
    collection.renameMode(collection.defaultModeId, 'Light');
    const dark = collection.addMode('Dark');
    for (const [rang, variable] of [...figma.locales.values()].entries()) {
      variable.setValueForMode(dark, composantes(NUIT[rang]));
    }
    const { recette, palette } = await reprendre(figma, (await duFichier(figma))[0], forme);
    await rangerLaDestination(api(figma), { collection: { id: collection.id }, groupe: 'colors', themes: 'chemin' });
    for (const variable of [...figma.locales.values()]) variable.remove();
    const avant = await tokens(figma, recette, palette);
    assert.equal(avant.aCreer.length, 22);
    assert.ok(avant.aCreer.includes('colors/slate/light/50'));
    assert.ok(avant.aCreer.includes('colors/slate/dark/950'));
    const resultat = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
    assert.deepEqual(resultat, { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 22, ecrites: 22 }] });
    const apres = await tokens(figma, recette, palette);
    assert.equal(apres.etat, 'a-jour');
    assert.equal(apres.aCreer.length, 0);
    const suivi = lireLeSuiviRange(figma.root);
    const plan = planDesVariables(recette, palette, suivi.destination);
    for (const entree of plan) {
      for (const mode of collection.modes) assert.equal(hexa(figma, entree.nom, mode.modeId), entree.hexa, entree.cle);
    }
    assert.equal(lireLeSuiviRange(figma.root).palettes[palette.id].modes.dark, undefined);
    assert.deepEqual(await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] }), {
      issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 0, ecrites: 0 }],
    });
  }
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
    // Sans mode Dark, les thèmes vont dans le chemin : les variables d'origine passent sous `light`.
    const secondes = TAILWIND.map((nuance) => hexa(figma, ecritDark ? `slate/${nuance}` : `slate/light/${nuance}`, second));
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

test('[VAR-13] une variable d’origine disparue se recrée sous son nom pour une palette recalculée ; figée, la palette ne crée rien et la variable quitte le suivi', async () => {
  const { figma } = fichierAvecSlate();
  const [source] = await duFichier(figma);
  const { recette, palette } = await reprendre(figma, source, 'recalculees');
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  figma.variable('slate/light/950').remove();
  const sans = await tokens(figma, recette, palette);
  assert.deepEqual([sans.etat, sans.aCreer], ['introuvables', ['slate/light/950']]);
  const recreee = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.deepEqual(recreee, { issue: 'ecrites', palettes: [{ palette: palette.id, issue: 'ecrite', creees: 1, ecrites: 1 }] });
  assert.equal(lireLeSuiviRange(figma.root).palettes[palette.id].variables['unique/light/950'].id, figma.variable('slate/light/950').id);
  assert.equal((await tokens(figma, recette, palette)).etat, 'a-jour');

  const { figma: fige } = fichierAvecSlate();
  const [slate] = await duFichier(fige);
  const figee = await reprendre(fige, slate, 'telles-quelles');
  fige.variable('slate/950').remove();
  assert.equal((await tokens(fige, figee.recette, figee.palette)).etat, 'introuvables');
  const resultat = await ecrireLesVariables(api(fige), { palettes: [figee.palette.id], empreinteLue: empreinte(figee.recette), remettre: [] });
  assert.equal(resultat.issue === 'ecrites' && resultat.palettes[0].issue === 'ecrite' && resultat.palettes[0].creees, 0);
  assert.equal(fige.locales.size, 10);
  assert.equal(lireLeSuiviRange(fige.root).palettes[figee.palette.id].variables['unique/light/950'], undefined);
  assert.equal((await tokens(fige, figee.recette, figee.palette)).etat, 'a-jour');
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
