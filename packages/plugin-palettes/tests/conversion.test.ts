/** « Passer au format du plugin » : une palette reprise devient une palette du plugin, définitivement ([VAR-13]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { fnv1a, jsonCanonique, lireHexa, octetsUtf8, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { ajouter, remplacerPalette, reprendreDuFichier } from '../src/edition';
import { convertirLaReprise, ecrireLesVariables, reprendreLaPalette, type FigmaDesVariablesEcrites } from '../src/ecriture/variables';
import { lireLesVariablesDuFichier, lireLeSuiviRange } from '../src/lectureDesVariables';
import { palettesDuFichier } from '../src/variables/detection';
import { tokensDeLaPalette, variablesDesPalettesSupprimees } from '../src/variables/gestion';
import { planDesVariables } from '../src/variables/plan';
import { texteDuSuivi, variablesSuivies } from '../src/variables/suivi';
import { FauxFigma, type FausseCollection } from './figmaDeTest';

const VIDE = recetteParDefaut();
const TAILWIND = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const SLATE = ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617'];

const api = (figma: FauxFigma) => figma as unknown as FigmaDesVariablesEcrites;
const empreinte = (recette: Recette): string | null => (recette === VIDE ? null : fnv1a(octetsUtf8(jsonCanonique(recette))));
const composantes = (hexa: string) => {
  const [r, g, b] = lireHexa(hexa)!;
  return { r: r / 255, g: g / 255, b: b / 255, a: 1 };
};

/** Un fichier qui porte `slate` dans une collection à un mode ; la destination désigne cette collection, ou une collection à créer. */
function fichierAvecSlate(destinationDansLaCollection: boolean): { figma: FauxFigma; collection: FausseCollection } {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Primitives');
  TAILWIND.forEach((nuance, rang) => {
    figma.variables.createVariable(`slate/${nuance}`, collection, 'COLOR').setValueForMode(collection.defaultModeId, composantes(SLATE[rang]));
  });
  const suivi = lireLeSuiviRange(figma.root);
  const destination = { collection: destinationDansLaCollection ? { id: collection.id } : { nom: 'primitives' }, groupe: '', themes: 'chemin' as const };
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...suivi, destination, confirmee: true }));
  figma.journal.length = 0;
  return { figma, collection };
}

/** Reprend `slate` en mode `recalculees`, puis écrit ses tokens une fois. */
async function reprendreEtEcrire(figma: FauxFigma): Promise<{ recette: Recette; palette: Palette }> {
  const lu = await lireLesVariablesDuFichier(api(figma));
  const [source] = palettesDuFichier(lu.variables, lu.collections, variablesSuivies(lu.suivi, new Set()));
  const palette = reprendreDuFichier(VIDE, 'p-000000a1', source, 'recalculees')!;
  const recette = ajouter(VIDE, palette);
  assert.equal((await reprendreLaPalette(api(figma), { recette, empreinteLue: empreinte(VIDE), palette: palette.id, source: { collection: source.collection, chemin: source.chemin } })).issue, 'reprise');
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
  await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  return { recette, palette };
}

test('[VAR-13] une reprise dans la collection de la destination passe au format du plugin : ses variables gardent leur identifiant et prennent le nom du plugin', async () => {
  const { figma } = fichierAvecSlate(true);
  const { recette, palette } = await reprendreEtEcrire(figma);
  const ids = new Set(Object.values(lireLeSuiviRange(figma.root).palettes[palette.id].variables).map((variable) => variable.id));
  figma.journal.length = 0;

  const issue = await convertirLaReprise(api(figma), { palette: palette.id, empreinteLue: empreinte(recette) });
  assert.equal(issue.issue, 'convertie');
  assert.ok(issue.issue === 'convertie' && issue.enPlace);
  assert.equal(figma.journal.filter((ligne) => ligne === 'commitUndo').length, 1);
  const suivie = lireLeSuiviRange(figma.root).palettes[palette.id];
  assert.equal(suivie.liaison, 'destination');
  assert.deepEqual(new Set(Object.values(suivie.variables).map((variable) => variable.id)), ids);

  // Au format du plugin : la fiche ne parle plus de reprise, et la mise à jour ne crée ni ne renomme rien.
  const lu = await lireLesVariablesDuFichier(api(figma));
  assert.equal(tokensDeLaPalette(recette, palette, lu).reprise, false);
  const ecrites = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [] });
  assert.ok(ecrites.issue === 'ecrites' && ecrites.palettes[0].issue === 'ecrite' && ecrites.palettes[0].creees === 0);
  const noms = new Set(planDesVariables(recette, palette, lu.suivi.destination).map((entree) => entree.nom));
  for (const id of ids) assert.ok(noms.has(figma.locales.get(id)!.name), figma.locales.get(id)!.name);
  assert.equal(tokensDeLaPalette(recette, palette, await lireLesVariablesDuFichier(api(figma))).etat, 'a-jour');
});

test('[VAR-13] une reprise hors de la collection de la destination laisse ses variables en sortie ancienne', async () => {
  const { figma } = fichierAvecSlate(false);
  const { recette, palette } = await reprendreEtEcrire(figma);
  const issue = await convertirLaReprise(api(figma), { palette: palette.id, empreinteLue: empreinte(recette) });
  assert.deepEqual(issue, { issue: 'convertie', renommees: 0, enPlace: false });
  const suivi = lireLeSuiviRange(figma.root);
  assert.equal(suivi.palettes[palette.id], undefined);
  assert.equal(suivi.palettes[`ancienne:${palette.id}:1`]?.sortieAnterieureDe, palette.id);
  const lu = await lireLesVariablesDuFichier(api(figma));
  assert.equal(tokensDeLaPalette(recette, palette, lu).etat, 'jamais-ecrits');
  assert.deepEqual(variablesDesPalettesSupprimees(recette, lu).map(({ palette: id, ancienne }) => [id, ancienne]), [[`ancienne:${palette.id}:1`, true]]);
});

test('[VAR-13] un nom du plugin déjà porté par une autre variable refuse la conversion sans rien écrire', async () => {
  const { figma, collection } = fichierAvecSlate(true);
  const { recette: reprise, palette: reprisee } = await reprendreEtEcrire(figma);
  const palette = { ...reprisee, nom: 'Ardoise' };
  const recette = remplacerPalette(reprise, palette);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
  const [premiere] = planDesVariables(recette, palette, lireLeSuiviRange(figma.root).destination);
  figma.variables.createVariable(premiere.nom, collection, 'COLOR');
  const avant = figma.root.getSharedPluginData('ucm_palettes', 'variables');
  figma.journal.length = 0;
  assert.deepEqual(await convertirLaReprise(api(figma), { palette: palette.id, empreinteLue: empreinte(recette) }), { issue: 'nom-pris', nom: premiere.nom });
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'variables'), avant);
  assert.ok(!figma.journal.some((ligne) => /^(renommer|commitUndo)/.test(ligne)));
});

test('[VAR-13] une palette du plugin, ou une recette lue avant un changement, ne se convertit pas', async () => {
  const { figma } = fichierAvecSlate(true);
  const { recette, palette } = await reprendreEtEcrire(figma);
  assert.deepEqual(await convertirLaReprise(api(figma), { palette: palette.id, empreinteLue: 'autre' }), { issue: 'recette-changee' });
  assert.equal((await convertirLaReprise(api(figma), { palette: palette.id, empreinteLue: empreinte(recette) })).issue, 'convertie');
  assert.deepEqual(await convertirLaReprise(api(figma), { palette: palette.id, empreinteLue: empreinte(recette) }), { issue: 'refusee' });
});
