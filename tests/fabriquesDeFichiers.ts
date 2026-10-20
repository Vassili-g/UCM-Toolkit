/// <reference types="@figma/plugin-typings" />
/**
 * Les fichiers inventés des lois entre produits (`loisEntreProduits.test.ts`) : un fichier où UCM Palettes a écrit une palette
 * d'une forme donnée, les règles de nommage d'UCM Nomenclature rangées pour une convention, et des variables du thème nommées
 * selon cette convention. Le double de Figma accepte les doublons de noms par défaut : c'est UCM qui doit refuser un nom pris.
 */
import assert from 'node:assert/strict';

import { CLE_NOMMAGE_DE_PALETTES, CONVENTIONS, ESPACE_ARCHITECT, assembler, decouperSegment, motsAvecCasse, type Convention } from '@ucm-kit/core/referentiel';
import { texteDeLaMarque } from '@ucm-kit/core/protocoles';
import { fnv1a, grilleAuPrereglage, jsonCanonique, lireHexa, octetsUtf8, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { ajouter, choisirLesIntensites, nouvellePalette, reprendreDuFichier } from '../packages/plugin-palettes/src/edition';
import { ecrireLesVariables, reprendreLaPalette, type FigmaDesVariablesEcrites } from '../packages/plugin-palettes/src/ecriture/variables';
import { lireLesVariablesDuFichier, lireLeSuiviRange } from '../packages/plugin-palettes/src/lectureDesVariables';
import { palettesDuFichier } from '../packages/plugin-palettes/src/variables/detection';
import { texteDuSuivi, variablesSuivies } from '../packages/plugin-palettes/src/variables/suivi';
import { FauxFigma } from '../packages/plugin-palettes/tests/figmaDeTest';
import { alias, constructeur, couleur } from './releveDeTest';
import { nuanceAttendue, variableDuNom } from '../packages/plugin-explorateur/src/integrations/profilUcm';
import type { Releve } from '../packages/plugin-explorateur/src/modele';

export { CONVENTIONS, type Convention };

/** La forme d'une palette : les cinq axes de la matrice. */
export interface FormeDePalette {
  readonly convention: Convention;
  readonly intensites: 1 | 2;
  readonly themes: 'chemin' | 'modes';
  readonly nuances: 11 | 13;
  readonly liaison: 'destination' | 'reprise';
}

/** Un fichier où Palettes a écrit une palette de cette forme. */
export interface FichierDeTest {
  readonly figma: FauxFigma;
  readonly forme: FormeDePalette;
  readonly recette: Recette;
  readonly palette: Palette;
  /** L'identifiant de la collection `Primitives`, où la palette écrit. */
  readonly collection: string;
  /** Le groupe de la destination, tel que Palettes l'écrit. */
  readonly groupe: string;
}

const VIDE = recetteParDefaut();
export const GROUPE = 'color';
export const api = (figma: FauxFigma): FigmaDesVariablesEcrites => figma as unknown as FigmaDesVariablesEcrites;
export const empreinte = (recette: Recette): string => fnv1a(octetsUtf8(jsonCanonique(recette)));
export const nomsDe = (figma: FauxFigma): string[] => [...figma.locales.values()].map((variable) => variable.name);

/** Le titre lisible d'une forme : `PascalCase · deux intensités · thèmes en modes · 13 nuances · reprise`. */
export function titreDeLaForme(forme: FormeDePalette): string {
  const libelle = CONVENTIONS.find((candidate) => candidate.convention === forme.convention)?.specimen.fr ?? JSON.stringify(forme.convention);
  return [libelle, forme.intensites === 1 ? 'une intensité' : 'deux intensités', forme.themes === 'chemin' ? 'thèmes dans le chemin' : 'thèmes en modes', `${forme.nuances} nuances`, forme.liaison].join(' · ');
}

/** Un gris de plus en plus sombre : la couleur de la nuance de rang `rang` sur `sur`. */
function gris(rang: number, sur: number): string {
  const canal = Math.round(248 - (rang / (sur - 1)) * 228);
  return `#${[canal, canal + 4 > 255 ? 255 : canal + 4, canal + 10 > 255 ? 255 : canal + 10].map((valeur) => valeur.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

const composantes = (hexa: string) => {
  const [r, g, b] = lireHexa(hexa)!;
  return { r: r / 255, g: g / 255, b: b / 255, a: 1 };
};

/** Le texte de l'entrée `ecriture` que UCM Nomenclature range : la convention, sur les groupes et sur les variables. */
export function texteDesRegles(convention: Convention): string {
  return JSON.stringify({ version: 1, groupes: convention, variables: convention });
}

/**
 * Range les règles de Nomenclature pour la convention (entrée `ecriture`) et, sauf `marque: false`, la marque de Palettes.
 * Elle prend un fichier ou un double nu : `fichierDePalettes` s'en sert avant sa première écriture.
 */
export function rangerLesRegles(fichier: { readonly figma: FauxFigma }, convention: Convention, options: { readonly marque?: boolean } = {}): void {
  fichier.figma.root.setSharedPluginData(ESPACE_ARCHITECT, 'ecriture', texteDesRegles(convention));
  if (options.marque ?? true) fichier.figma.root.setSharedPluginData('ucm_palettes', CLE_NOMMAGE_DE_PALETTES, texteDeLaMarque());
}

/** Où la palette écrit : la collection et le groupe. Par défaut, la destination de référence (`Primitives`, `color`). */
export interface SortieDePalettes {
  readonly collection: string;
  readonly groupe: string;
}

export interface OptionsDuFichier {
  /** Le double accepte les doublons de noms (par défaut) : c'est UCM qui doit refuser. */
  readonly permissif?: boolean;
  /** Range les règles de `forme.convention` et la marque avant la première écriture. */
  readonly regles?: boolean;
  /** Liaison reprise : la mise à jour qui suit la reprise (par défaut) ; faux, le fichier s'arrête à « Modifier dans le plugin ». */
  readonly ecrite?: boolean;
  readonly sortie?: SortieDePalettes;
}

/**
 * Un fichier où Palettes a écrit une palette de cette forme, en minuscules, sans règle rangée (les règles de
 * `forme.convention` ne se rangent que si `options.regles` le demande, avant l'écriture). Liaison `destination` : Poppy, écrite
 * par `ecrireLesVariables`. Liaison `reprise` : Azur, dont les variables d'origine (`color/Azur/50`, une colonne de couleurs)
 * sont reprises par leur chemin, puis mises à jour par Palettes sauf `ecrite: false`. La destination du fichier est celle de la
 * forme, dans la collection et le groupe de `options.sortie`.
 */
export async function fichierDePalettes(forme: FormeDePalette, options: OptionsDuFichier = {}): Promise<FichierDeTest> {
  const sortie = options.sortie ?? { collection: 'Primitives', groupe: GROUPE };
  const figma = new FauxFigma();
  figma.accepterLesDoublons = options.permissif ?? true;
  const primitives = figma.variables.createVariableCollection(sortie.collection);
  const composants = figma.variables.createVariableCollection('Components');
  for (const taille of ['big', 'small']) for (const nom of ['border-radius', 'padding-x']) figma.variables.createVariable(`button/sizes/${taille}/${nom}`, composants, 'COLOR');
  const base: Recette = forme.nuances === 13 ? { ...VIDE, ...grilleAuPrereglage(VIDE, 13) } : VIDE;
  const destination = { collection: { id: primitives.id }, groupe: sortie.groupe, themes: forme.themes };
  if (options.regles) rangerLesRegles({ figma }, forme.convention);

  if (forme.liaison === 'destination') {
    const palette: Palette = { ...nouvellePalette(base, 'p-0000000a', '#1E6FD9', forme.intensites)!, nom: 'Poppy' };
    const recette = ajouter(base, palette);
    figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
    figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lireLeSuiviRange(figma.root), destination, confirmee: true }));
    const ecrit = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [], remplacer: [] });
    assert.equal(ecrit.issue, 'ecrites');
    figma.journal.length = 0;
    return { figma, forme, recette, palette, collection: primitives.id, groupe: sortie.groupe };
  }

  base.crans.forEach((nuance, rang) => {
    const origine = figma.variables.createVariable(`${sortie.groupe}/Azur/${nuance}`, primitives, 'COLOR');
    // Les primitives n'ont aucune portée : comme celles que Palettes écrit.
    origine.scopes = [];
    origine.setValueForMode(primitives.defaultModeId, composantes(gris(rang, base.crans.length)));
  });
  const lu = await lireLesVariablesDuFichier(api(figma));
  const source = palettesDuFichier(lu.variables, lu.collections, variablesSuivies(lu.suivi, new Set())).find((candidate) => candidate.chemin === `${sortie.groupe}/Azur`)!;
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lu.suivi, destination, confirmee: true }));
  const reprise = reprendreDuFichier(base, 'p-000000a1', source, 'recalculees')!;
  const palette = choisirLesIntensites(base, reprise, forme.intensites);
  const recette = ajouter(base, palette);
  const reprisee = await reprendreLaPalette(api(figma), { recette, empreinteLue: null, palette: palette.id, source: { collection: source.collection, chemin: source.chemin } });
  assert.equal(reprisee.issue, 'reprise');
  if (options.ecrite ?? true) {
    const ecrit = await ecrireLesVariables(api(figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [palette.id], remplacer: [] });
    assert.deepEqual([ecrit.issue, ecrit.issue === 'ecrites' ? ecrit.palettes.map((issue) => issue.issue) : null], ['ecrites', ['ecrite']]);
  }
  figma.journal.length = 0;
  return { figma, forme, recette, palette, collection: primitives.id, groupe: sortie.groupe };
}

/** Une palette de plus dans la recette rangée du fichier, jamais écrite : de quoi annoncer sa création. */
export function avecUnePaletteDePlus(fichier: FichierDeTest, nom: string, reference = '#D93F1E'): { readonly recette: Recette; readonly palette: Palette } {
  const palette: Palette = { ...nouvellePalette(fichier.recette, `p-${(fichier.recette.palettes.length + 11).toString(16).padStart(8, '0')}`, reference, fichier.forme.intensites)!, nom };
  const recette = ajouter(fichier.recette, palette);
  fichier.figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
  return { recette, palette };
}

/**
 * Un fichier à écrire d'un seul lot : les palettes nommées, jamais écrites, les règles de la convention et la marque
 * rangées, la destination confirmée. Les palettes de la forme `destination`.
 */
export function fichierDeLot(forme: FormeDePalette, noms: readonly string[]): { readonly figma: FauxFigma; readonly recette: Recette; readonly palettes: readonly Palette[] } {
  const figma = new FauxFigma();
  figma.accepterLesDoublons = true;
  const primitives = figma.variables.createVariableCollection('Primitives');
  const base: Recette = forme.nuances === 13 ? { ...VIDE, ...grilleAuPrereglage(VIDE, 13) } : VIDE;
  const references = ['#1E6FD9', '#D93F1E', '#2EA043'];
  const palettes = noms.map((nom, rang): Palette => ({ ...nouvellePalette(base, `p-${(rang + 10).toString(16).padStart(8, '0')}`, references[rang % references.length], forme.intensites)!, nom }));
  const recette = palettes.reduce(ajouter, base);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
  rangerLesRegles({ figma }, forme.convention);
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lireLeSuiviRange(figma.root), destination: { collection: { id: primitives.id }, groupe: GROUPE, themes: forme.themes }, confirmee: true }));
  figma.journal.length = 0;
  return { figma, recette, palettes };
}

/** Les identifiants des variables que le suivi de Palettes attribue à la palette. */
export function variablesDeLaPalette(fichier: Pick<FichierDeTest, 'figma' | 'palette'>): string[] {
  const suivie = lireLeSuiviRange(fichier.figma.root).palettes[fichier.palette.id];
  return [...new Set(Object.values(suivie?.variables ?? {}).map((variable) => variable.id))];
}

/** Les noms de ces variables, dans l'ordre des identifiants. */
export function nomsDeLaPalette(fichier: Pick<FichierDeTest, 'figma' | 'palette'>): string[] {
  return variablesDeLaPalette(fichier).map((id) => fichier.figma.locales.get(id)!.name);
}

/** Un nom sous une convention : chaque segment réécrit selon sa casse et son séparateur. */
export function nomSelonLaConvention(nom: string, convention: Convention): string {
  return nom.split('/').map((segment) => assembler(segment, motsAvecCasse(decouperSegment(segment), convention.casse), convention.separateur)).join('/');
}

/** Les variables du thème qu'un fichier de test porte : leur nom en minuscules, et la variable de dossier que le profil y lit. */
export const VARIABLES_DU_THEME = ['primary/solid/default', 'primary/solid/hover', 'primary/page/foreground-main', 'primary/surface/pressed', 'primary/identity'] as const;

/**
 * Des variables du thème qui visent la palette du fichier, nommées selon la convention. Palettes ne les écrit pas : elles
 * servent le contrôle de l'explorateur. Chaque variable du thème pointe vers une variable de `brands` (nommée selon la
 * convention aussi), qui pointe vers la variable de Palettes de la nuance que le profil attend dans le mode, sauf `solid/hover`
 * en Light, qui vise une autre nuance : le profil la signale. Les portées sont celles du profil.
 */
export function themeSelonLaConvention(fichier: FichierDeTest, convention: Convention): void {
  const { figma, palette } = fichier;
  const suivie = lireLeSuiviRange(figma.root).palettes[palette.id];
  /** La variable de la palette pour ce thème et cette nuance, dans la première intensité qui la porte. */
  const dePalettes = (mode: 'light' | 'dark', nuance: number): string => {
    const cles = Object.keys(suivie.variables).sort();
    const cle = cles.find((candidate) => candidate.endsWith(`/${mode}/${nuance}`)) ?? cles.find((candidate) => candidate.endsWith(`/light/${nuance}`));
    assert.ok(cle, `aucune variable de la palette pour ${mode}/${nuance}`);
    return suivie.variables[cle].id;
  };
  const marques = figma.variables.createVariableCollection(nomSelonLaConvention('brands', convention));
  const brands = new Map<string, string>();
  const deMarque = (mode: 'light' | 'dark', nuance: number): string => {
    const cle = `${mode}/${nuance}`;
    if (!brands.has(cle)) {
      const variable = figma.variables.createVariable(nomSelonLaConvention(`primary/${mode}/${nuance}`, convention), marques, 'COLOR');
      variable.scopes = [];
      variable.setValueForMode(marques.defaultModeId, { type: 'VARIABLE_ALIAS', id: dePalettes(mode, nuance) });
      brands.set(cle, variable.id);
    }
    return brands.get(cle)!;
  };
  const theme = figma.variables.createVariableCollection(nomSelonLaConvention('theme', convention));
  const dark = theme.addMode('Dark');
  theme.renameMode(theme.defaultModeId, 'Light');
  for (const nom of VARIABLES_DU_THEME) {
    const variable = figma.variables.createVariable(nomSelonLaConvention(nom, convention), theme, 'COLOR');
    const visee = (mode: 'light' | 'dark'): string => {
      const attendue = nuanceAttendue(nom, mode, fichier.recette) ?? 500;
      const decale = nom === 'primary/solid/hover' && mode === 'light';
      return deMarque(mode, decale ? (fichier.recette.crans.find((candidate) => candidate !== attendue) ?? attendue) : attendue);
    };
    const lue = variableDuNom(nom);
    if (lue) variable.scopes = [...lue.support.portees];
    variable.setValueForMode(theme.defaultModeId, { type: 'VARIABLE_ALIAS', id: visee('light') });
    variable.setValueForMode(dark, { type: 'VARIABLE_ALIAS', id: visee('dark') });
  }
}

/** Le relevé de l'explorateur pour un double de Figma : les identifiants suivent l'ordre de création, deux fichiers de même forme donnent les mêmes. */
export function releveDuFichier(figma: FauxFigma): Releve {
  const c = constructeur('Fichier de lois');
  const identifiants = new Map<string, string>();
  [...figma.collections.values()].forEach((collection, rang) => identifiants.set(collection.id, `c${rang}`));
  [...figma.locales.values()].forEach((variable, rang) => identifiants.set(variable.id, `v${rang}`));
  for (const collection of figma.collections.values()) c.collection(identifiants.get(collection.id)!, collection.name, collection.modes.map((mode) => mode.name));
  for (const variable of figma.locales.values()) {
    const collection = variable.collection;
    const valeurs = Object.fromEntries(collection.modes.map((mode) => {
      const valeur = variable.valuesByMode[mode.modeId];
      return [mode.name, 'type' in valeur ? alias(identifiants.get(valeur.id)!) : couleur(`#${[valeur.r, valeur.g, valeur.b].map((canal) => Math.round(canal * 255).toString(16).padStart(2, '0')).join('')}`)];
    }));
    c.variable(identifiants.get(variable.id)!, identifiants.get(collection.id)!, variable.name, 'COLOR', valeurs, [...variable.scopes]);
  }
  return c.releve();
}
