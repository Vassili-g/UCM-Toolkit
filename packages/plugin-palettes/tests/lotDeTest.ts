/** Un lot dont deux noms convergent sous la convention du fichier. */
import { fnv1a, jsonCanonique, octetsUtf8, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';
import { ajouter, nouvellePalette } from '../src/edition';
import { ecrireLesVariables, type FigmaDesVariablesEcrites } from '../src/ecriture/variables';
import assert from 'node:assert/strict';
import { lireLeSuiviRange, lireLesVariablesDuFichier } from '../src/lectureDesVariables';
import type { PlanDuLot } from '../src/variables/lot';
import { texteDuSuivi } from '../src/variables/suivi';
import { FauxFigma } from './figmaDeTest';

export const vide = recetteParDefaut();
export const bleu: Palette = { ...nouvellePalette(vide, 'p-0000000a', '#1E6FD9', 2)!, nom: 'Ocean-Blue' };
export const autre: Palette = { ...nouvellePalette(vide, 'p-0000000b', '#D93F1E', 2)!, nom: 'OceanBlue' };
export const api = (figma: FauxFigma) => figma as unknown as FigmaDesVariablesEcrites;
export const empreinte = (recette: Recette) => fnv1a(octetsUtf8(jsonCanonique(recette)));
export function fichierDuLot(palettes: readonly Palette[] = [bleu, autre], neuve = false) {
  const figma = new FauxFigma();
  const collection = neuve ? null : figma.variables.createVariableCollection('Primitives');
  const recette = palettes.reduce(ajouter, vide);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
  figma.root.setSharedPluginData('ucm_architect', 'ecriture', JSON.stringify({ version: 1, groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } }));
  figma.root.setSharedPluginData('ucm_palettes', 'variables', texteDuSuivi({ ...lireLeSuiviRange(figma.root), destination: { collection: collection ? { id: collection.id } : { nom: 'Primitives' }, groupe: 'colors', themes: 'chemin' }, confirmee: true }));
  figma.journal.length = 0;
  return { figma, collection, recette };
}

/**
 * La loi du lot : ce que le plan annonce est ce que l'écriture a fait. Le journal du double ne porte que cette
 * écriture : l'appelant le vide avant d'écrire.
 */
export async function verifierLaLoiDuLot(figma: FauxFigma, plan: PlanDuLot): Promise<void> {
  const ecrites = plan.palettes.flatMap((decision) => (decision.decision === 'ecrire' ? [decision] : []));
  const creees = figma.journal.filter((ligne) => ligne.startsWith('créer variable ')).map((ligne) => ligne.slice('créer variable '.length));
  assert.deepEqual(creees, ecrites.flatMap((decision) => decision.creations.map((creation) => creation.nom)));
  const renommees = figma.journal.filter((ligne) => ligne.startsWith('renommer variable ')).map((ligne) => ligne.slice('renommer variable '.length)).sort();
  // Une variable tiers qui porte déjà le nom exact du plan n'est pas renommée.
  const annoncees = ecrites.flatMap((decision) => [...decision.remplacements, ...decision.renommages]).filter(({ de, vers }) => de !== vers).map(({ de, vers }) => `${de} -> ${vers}`).sort();
  assert.deepEqual(renommees, annoncees);
  const apres = await lireLesVariablesDuFichier(api(figma));
  const portes = new Set(apres.variables.map((variable) => variable.nom.toLowerCase()));
  for (const decision of ecrites) for (const nom of decision.reserves) assert.ok(portes.has(nom.toLowerCase()), `réservé mais absent : ${nom}`);
  const paire = (variable: { nom: string; palette?: string }) => `${variable.nom}|${variable.palette ?? ''}`;
  assert.deepEqual((apres.nommage?.variables ?? []).map(paire).sort(), (plan.inventaireApres.nommage?.variables ?? []).map(paire).sort());
  assert.deepEqual(apres.collections.map((collection) => collection.nom).sort(), plan.inventaireApres.collections.map((collection) => collection.nom).sort());
  assert.deepEqual(apres.collections.map((collection) => collection.modes.map((mode) => mode.nom)), plan.inventaireApres.collections.map((collection) => collection.modes.map((mode) => mode.nom)));
}
export const ecrire = (figma: FauxFigma, recette: Recette, palettes = recette.palettes.map((palette) => palette.id), remplacer: readonly string[] = []) => ecrireLesVariables(api(figma), { palettes, empreinteLue: empreinte(recette), remettre: palettes, remplacer });
