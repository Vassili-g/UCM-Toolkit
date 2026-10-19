/// <reference types="@figma/plugin-typings" />
/**
 * Aller-retour entre UCM Nomenclature et UCM Palettes sur un fichier inventé : des palettes écrites par Palettes en minuscules
 * (liaison destination et liaison reprise, deux intensités, thèmes dans le chemin), des règles PascalCase et `colors` qui devient
 * `color`. Nomenclature calcule les renommages par le socle et les écrit par son code d'écriture ; le plan de Palettes, sur le
 * fichier renommé, ne renomme rien et donne les mêmes noms. Sans la marque de Palettes, les variables de Palettes restent
 * protégées et leurs dossiers gardent leur nom.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { fnv1a, jsonCanonique, lireHexa, octetsUtf8, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { appliquerLesRenommages, creerPortDeRegles, creerPortEcriture, type RenommageDemande } from '../packages/plugin-nomenclature/src/ecriture';
import { ecrireLesVariables, reprendreLaPalette, type FigmaDesVariablesEcrites } from '../packages/plugin-palettes/src/ecriture/variables';
import { rangerLaMarqueDeNommage } from '../packages/plugin-palettes/src/ecriture/marque';
import { ajouter, nouvellePalette, reprendreDuFichier } from '../packages/plugin-palettes/src/edition';
import { lireLesVariablesDuFichier, lireLeSuiviRange } from '../packages/plugin-palettes/src/lectureDesVariables';
import { FauxFigma } from '../packages/plugin-palettes/tests/figmaDeTest';
import { palettesDuFichier } from '../packages/plugin-palettes/src/variables/detection';
import { tokensDeLaPalette } from '../packages/plugin-palettes/src/variables/gestion';
import { nommeurDuFichier, planDeLaPalette } from '../packages/plugin-palettes/src/variables/nommeur';
import { nomsDuPlan } from '../packages/plugin-palettes/src/variables/plan';
import { texteDuSuivi, variablesSuivies } from '../packages/plugin-palettes/src/variables/suivi';
import { idsNonRenommables, nomsSelonLesReglesSync } from '../packages/plugin-socle/src/nomsSelonLesRegles';
import { palettesLibres } from '../packages/plugin-socle/src/inventaireDeNoms';
import { lireReglesDeNommage } from '../packages/plugin-socle/src/reglesDeNommage';

const VIDE = recetteParDefaut();
const POPPY: Palette = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9', 2)!, nom: 'Poppy' };
const TAILWIND = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const GRIS = ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617'];
const ECRITURE = JSON.stringify({ version: 1, groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } });

const api = (figma: FauxFigma) => figma as unknown as FigmaDesVariablesEcrites;
const empreinte = (recette: Recette): string => fnv1a(octetsUtf8(jsonCanonique(recette)));
const noms = (figma: FauxFigma): string[] => [...figma.locales.values()].map((variable) => variable.name);
const composantes = (hexa: string) => {
  const [r, g, b] = lireHexa(hexa)!;
  return { r: r / 255, g: g / 255, b: b / 255, a: 1 };
};

type Liaison = 'destination' | 'reprise';
interface FichierDePalettes { readonly figma: FauxFigma; readonly recette: Recette; readonly palette: Palette; readonly prefixe: string; readonly attendu: number }

/**
 * Un fichier où Palettes a écrit en minuscules, avant toute règle, et des variables de composants. Liaison `destination` : Poppy
 * dans `colors`, 44 variables, deux intensités, thèmes dans le chemin. Liaison `reprise` : Azur, onze variables d'origine reprises
 * par leur chemin. La destination du fichier ne porte qu'un choix de thèmes : les deux liaisons ont chacune leur fichier.
 */
async function fichierEcritParPalettes(liaison: Liaison): Promise<FichierDePalettes> {
  const figma = new FauxFigma();
  const primitives = figma.variables.createVariableCollection('Primitives');
  const composants = figma.variables.createVariableCollection('Components');
  for (const taille of ['big', 'small']) for (const nom of ['border-radius', 'padding-x']) figma.variables.createVariable(`button/sizes/${taille}/${nom}`, composants, 'COLOR');
  const seule = ajouter(VIDE, POPPY);
  let fichier: Omit<FichierDePalettes, 'attendu'>;
  if (liaison === 'destination') {
    const destination = { collection: { id: primitives.id }, groupe: 'colors', themes: 'chemin' as const };
    figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(seule));
    figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lireLeSuiviRange(figma.root), destination, confirmee: true }));
    const ecrit = await ecrireLesVariables(api(figma), { palettes: [POPPY.id], empreinteLue: empreinte(seule), remettre: [], remplacer: [] });
    assert.equal(ecrit.issue, 'ecrites');
    fichier = { figma, recette: seule, palette: POPPY, prefixe: 'Color/Poppy/' };
  } else {
    TAILWIND.forEach((nuance, rang) => figma.variables.createVariable(`colors/Azur/${nuance}`, primitives, 'COLOR').setValueForMode(primitives.defaultModeId, composantes(GRIS[rang])));
    const lu = await lireLesVariablesDuFichier(api(figma));
    const source = palettesDuFichier(lu.variables, lu.collections, variablesSuivies(lu.suivi, new Set())).find((candidate) => candidate.chemin.startsWith('colors/Azur'))!;
    // La reprise range ses thèmes en modes, sous le groupe de la rampe.
    figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lu.suivi, destination: { ...lu.suivi.destination, groupe: source.chemin.split('/').slice(0, -1).join('/'), themes: 'modes' } }));
    const azur = reprendreDuFichier(VIDE, 'p-000000a1', source, 'recalculees')!;
    const recette = ajouter(VIDE, azur);
    const reprise = await reprendreLaPalette(api(figma), { recette, empreinteLue: null, palette: azur.id, source: { collection: source.collection, chemin: source.chemin } });
    assert.equal(reprise.issue, 'reprise');
    fichier = { figma, recette, palette: azur, prefixe: 'Color/Azur/' };
  }
  figma.journal.length = 0;
  const attendu = liaison === 'destination' ? 44 : 11;
  assert.equal(noms(figma).filter((nom) => nom.startsWith('colors/')).length, attendu);
  return { ...fichier, attendu };
}

/** Ce que fait UCM Nomenclature : lire le fichier, calculer par le socle, écrire par son code d'écriture. */
async function nomenclatureRenomme(figma: FauxFigma): Promise<{ libres: boolean; demandes: number; sautes: readonly string[] }> {
  const plugin = figma as unknown as PluginAPI;
  const stockage = creerPortDeRegles(plugin);
  const regles = lireReglesDeNommage(stockage.cles().map((cle) => [cle, stockage.lire(cle)] as const))!;
  const session = await creerPortEcriture(plugin).ouvrir();
  const libres = palettesLibres(session.inventaire, true);
  const { resultat } = nomsSelonLesReglesSync(session.inventaire, regles, idsNonRenommables(session.inventaire, regles.collectionsExclues, { palettesLibres: libres }));
  const entrees = new Map(session.inventaire.entrees.map((entree) => [entree.nom.id, entree]));
  const demandes = resultat.renommages.flatMap((renommage): RenommageDemande[] => {
    const cible = entrees.get(renommage.id)?.cible;
    return cible?.type === 'variable'
      ? [{ type: 'variable', id: renommage.id, figmaId: cible.variableId, collectionId: cible.collectionId, ancienNom: renommage.ancienNom, nouveauNom: renommage.nouveauNom }]
      : [];
  });
  const ecrit = appliquerLesRenommages({ demandes, session, stockage });
  return { libres, demandes: demandes.length, sautes: ecrit.sautes.map(({ motif }) => motif) };
}

function poserLesRegles(figma: FauxFigma, marque: boolean): void {
  figma.root.setSharedPluginData('ucm_architect', 'ecriture', ECRITURE);
  if (marque) rangerLaMarqueDeNommage(figma as never);
}

for (const liaison of ['destination', 'reprise'] as const) {
  test(`liaison ${liaison} : avec la marque de Palettes, Nomenclature renomme les palettes écrites en minuscules et le plan de Palettes ne renomme plus rien`, async () => {
    const { figma, recette, palette, prefixe, attendu } = await fichierEcritParPalettes(liaison);
    poserLesRegles(figma, true);
    const fait = await nomenclatureRenomme(figma);
    assert.deepEqual([fait.libres, fait.sautes], [true, []]);
    assert.ok(fait.demandes >= attendu, `${fait.demandes} renommages`);

    const apres = noms(figma);
    assert.equal(apres.filter((nom) => nom.startsWith(prefixe)).length, attendu);
    assert.equal(apres.filter((nom) => nom.startsWith('colors/')).length, 0, 'colors devient Color');
    if (liaison === 'destination') assert.ok(apres.includes('Color/Poppy/Vivid/Light/50') && apres.includes('Color/Poppy/Soft/Dark/950'), apres.slice(0, 3).join(' | '));
    assert.ok(apres.some((nom) => nom.startsWith('Button/')), 'les variables de composants suivent les règles');

    const lu = await lireLesVariablesDuFichier(api(figma));
    const jetons = tokensDeLaPalette(recette, palette, lu);
    // Les valeurs d'une palette reprise se recalculent : seule la palette de la destination est à jour, mais aucune n'a de nom à changer.
    if (liaison === 'destination') assert.equal(jetons.etat, 'a-jour');
    assert.deepEqual([jetons.aCreer, jetons.aRenommer, jetons.nomsOccupes], [[], [], []]);
    if (liaison === 'destination') {
      const lues = new Map(lu.variables.map((variable) => [variable.id, variable]));
      const collections = new Map(lu.collections.map((collection) => [collection.id, collection]));
      const plan = planDeLaPalette(nommeurDuFichier(lu), recette, palette, lu.suivi.destination, lu.suivi.palettes[palette.id], null, lues, collections);
      assert.deepEqual(new Set(nomsDuPlan(plan)), new Set(apres.filter((nom) => nom.startsWith(prefixe))));
    }

    figma.journal.length = 0;
    const ecriture = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [], remplacer: [] });
    assert.equal(ecriture.issue, 'ecrites');
    assert.deepEqual(figma.journal.filter((ligne) => /créer|renommer/.test(ligne)), []);
    assert.deepEqual(noms(figma), apres);
  });

  test(`liaison ${liaison} : sans la marque de Palettes, les variables de Palettes restent protégées et leurs dossiers gardent leur nom`, async () => {
    const { figma } = await fichierEcritParPalettes(liaison);
    poserLesRegles(figma, false);
    const avant = noms(figma).filter((nom) => nom.startsWith('colors/'));
    const fait = await nomenclatureRenomme(figma);
    assert.deepEqual([fait.libres, fait.sautes], [false, []]);
    assert.deepEqual(noms(figma).filter((nom) => nom.startsWith('colors/')), avant, 'colors et les dossiers de la palette gardent leur nom');
    assert.equal(noms(figma).filter((nom) => nom.startsWith('Color/')).length, 0);
    assert.ok(noms(figma).some((nom) => nom.startsWith('Button/')), 'les variables de composants suivent les règles');
  });
}

test('une marque d’une autre version laisse la protection', async () => {
  const { figma } = await fichierEcritParPalettes('destination');
  poserLesRegles(figma, false);
  figma.root.setSharedPluginData('ucm_palettes', 'nommage', '{"version":2}');
  assert.equal((await nomenclatureRenomme(figma)).libres, false);
});
