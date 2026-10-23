/// <reference types="@figma/plugin-typings" />
/**
 * Les lois entre UCM Palettes, UCM Architect et l'explorateur : un produit annonce ou lit ce qu'un autre écrit, quelle que
 * soit la convention de nommage du fichier. Chaque test de paquet passe seul ; ces lois croisent les produits.
 *
 * La matrice a cinq axes : la convention (chaque entrée de `CONVENTIONS`, sur les groupes et sur les variables), les
 * intensités (une ou deux), la place des thèmes (chemin ou modes), les nuances (11 ou 13) et la liaison (destination ou
 * reprise). Le produit complet ne tourne pas : la diagonale réunit trois formes où chaque valeur de chaque axe paraît au moins
 * une fois, et chaque forme se croise avec chaque convention. Les lois 1, 2, 5, 6 et 7 parcourent les trois formes. Les lois
 * 3 et 4 parcourent les formes de la liaison que l'écran concerne : destination (A et C) ou reprise (B). La loi 8 prend les
 * deux formes de destination. La loi 5 ne prend que la destination de référence, la loi 6 une sortie libre.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { DESTINATION_DES_PALETTES, porteeDeLaGrammaire, reconnaitreLeChemin, type IdentifiantDeForme, type RoleDeSegment } from '@ucm-kit/core/referentiel';
import { idsNonRenommables, nomsSelonLesReglesSync, palettesLibres } from '@ucm-kit/core/nommage';
import { lireReglesDeNommage } from '@ucm-kit/core/protocoles';
import { jsonCanonique, type Recette } from 'ucm-couleur';

import { appliquerLesRenommages, creerPortDeRegles, creerPortEcriture, type RenommageDemande } from '../packages/plugin-architect/src/ecriture/noms';
import { indexer } from '../packages/plugin-architect/src/indexation';
import { controlerLeProfil, variableDuNom, type AssociationDesCouches } from '../packages/plugin-architect/src/integrations/profilUcm';
import { changerReference, choisirLesIntensites } from '../packages/plugin-palettes/src/edition';
import { convertirLaReprise, ecrireLesVariables, type IssueDeLaPalette } from '../packages/plugin-palettes/src/ecriture/variables';
import { lireLesVariablesDuFichier, type VariablesDuFichier } from '../packages/plugin-palettes/src/lectureDesVariables';
import { segmentsDuGroupe } from '../packages/plugin-palettes/src/variables/destination';
import { tokensDeLaPalette } from '../packages/plugin-palettes/src/variables/gestion';
import { annonceDeLaConversion } from '../packages/plugin-palettes/src/variables/conversion';
import { planDuLot } from '../packages/plugin-palettes/src/variables/lot';
import { verifierLaLoiDuLot } from '../packages/plugin-palettes/tests/lotDeTest';
import type { FauxFigma } from '../packages/plugin-palettes/tests/figmaDeTest';
import {
  CONVENTIONS, api, avecUnePaletteDePlus, empreinte, fichierDeLot, fichierDePalettes, nomsDe, nomsDeLaPalette, rangerLesRegles,
  nomSelonLaConvention, releveDuFichier, themeSelonLaConvention, titreDeLaForme, variablesDeLaPalette, type Convention, type FichierDeTest, type FormeDePalette,
} from './fabriquesDeFichiers';

const A: Omit<FormeDePalette, 'convention'> = { intensites: 1, themes: 'chemin', nuances: 11, liaison: 'destination' };
const B: Omit<FormeDePalette, 'convention'> = { intensites: 2, themes: 'modes', nuances: 13, liaison: 'reprise' };
const C: Omit<FormeDePalette, 'convention'> = { intensites: 2, themes: 'modes', nuances: 13, liaison: 'destination' };
/** Trois formes : chaque valeur de chaque axe paraît au moins une fois. */
const DIAGONALE = [A, B, C] as const;
/** Une reprise dont les thèmes sont dans le chemin : les entrées Dark n'ont pas de variable d'origine, la conversion les crée. */
const B_EN_CHEMIN: Omit<FormeDePalette, 'convention'> = { intensites: 2, themes: 'chemin', nuances: 11, liaison: 'reprise' };

const croiser = (formes: readonly Omit<FormeDePalette, 'convention'>[]): FormeDePalette[] => CONVENTIONS.flatMap(({ convention }) => formes.map((forme) => ({ ...forme, convention })));
const lire = (fichier: Pick<FichierDeTest, 'figma'>): Promise<VariablesDuFichier> => lireLesVariablesDuFichier(api(fichier.figma));
const jetons = async (fichier: FichierDeTest, recette = fichier.recette, palette = fichier.palette) => tokensDeLaPalette(recette, palette, await lire(fichier));
const creees = (figma: FauxFigma): string[] => figma.journal.filter((ligne) => ligne.startsWith('créer variable ')).map((ligne) => ligne.slice('créer variable '.length));
const renommees = (figma: FauxFigma): string[] => figma.journal.filter((ligne) => ligne.startsWith('renommer variable ')).map((ligne) => ligne.slice('renommer variable '.length));
const sansDoublon = (noms: readonly string[]): boolean => new Set(noms.map((nom) => nom.toLowerCase())).size === noms.length;

/** Pour chaque forme de la diagonale croisée avec les conventions, un test au titre lisible. `todo` donne la raison d'un défaut connu du code, qui ne se corrige pas dans ce lot. */
function pourChaqueForme(loi: string, formes: readonly FormeDePalette[], corps: (forme: FormeDePalette) => Promise<void> | void, todo: (forme: FormeDePalette) => string | false = () => false): void {
  for (const forme of formes) test(`loi ${loi} · ${titreDeLaForme(forme)}`, { todo: todo(forme) }, () => corps(forme));
}

/** Ce que fait UCM Architect sur le fichier : lire, calculer par le socle, proposer des renommages, et au besoin les écrire par son code d'écriture. */
async function nomenclature(fichier: Pick<FichierDeTest, 'figma'>) {
  const plugin = fichier.figma as unknown as PluginAPI;
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
  return { libres, demandes, appliquer: () => appliquerLesRenommages({ demandes, session, stockage }) };
}

/** Les renommages qu'UCM Architect proposerait aux variables de Palettes. */
async function nomenclatureProposera(fichier: Pick<FichierDeTest, 'figma' | 'palette'>): Promise<{ readonly libres: boolean; readonly aLaPalette: readonly RenommageDemande[] }> {
  const { libres, demandes } = await nomenclature(fichier);
  const miennes = new Set(variablesDeLaPalette(fichier));
  return { libres, aLaPalette: demandes.filter((demande) => miennes.has(demande.figmaId)) };
}

/** Un instantané d'une variable : son nom, ses valeurs et ses données partagées. */
function instantane(figma: FauxFigma, id: string): string {
  const variable = figma.locales.get(id)!;
  return JSON.stringify([variable.name, variable.valuesByMode, [...variable.donnees]]);
}

/** Une variable qu'aucune palette ne suit, avec une valeur et une donnée partagée à elle. */
function variableTierce(figma: FauxFigma, collection: string, nom: string): string {
  const variable = figma.variables.createVariable(nom, figma.collections.get(collection)!, 'COLOR');
  variable.setValueForMode(variable.collection.defaultModeId, { r: 0.1, g: 0.2, b: 0.3, a: 1 });
  variable.setSharedPluginData('tiers', 'note', 'à moi');
  return variable.id;
}

const resume = (j: Awaited<ReturnType<typeof jetons>>) => ({
  etat: j.etat, aCreer: j.aCreer, aRemplacer: j.aRemplacer, nomsOccupes: j.nomsOccupes, refus: j.refus,
  renommagesDeForme: j.aRenommer.filter((renommage) => renommage.cause === 'forme').map(({ de, vers }) => [de.toLowerCase(), vers.toLowerCase()]),
});

// Loi 1. Avant écriture : changer seulement la convention ne rend pas une palette « à mettre à jour ».
pourChaqueForme('1 avant écriture', croiser(DIAGONALE), async (forme) => {
  const fichier = await fichierDePalettes(forme);
  const avant = await jetons(fichier);
  assert.equal(avant.etat, 'a-jour');
  rangerLesRegles(fichier, forme.convention, { marque: false });
  const apres = await jetons(fichier);
  assert.equal(apres.etat, 'a-jour', `à jour avant les règles, ${apres.etat} avec elles : ${JSON.stringify(apres.aRenommer.slice(0, 2))}`);
  assert.deepEqual(resume(apres), resume(avant));

  // Témoin : une vraie couleur changée reste signalée sous la même convention.
  const recette = { ...fichier.recette, palettes: fichier.recette.palettes.map((palette) => (palette.id === fichier.palette.id ? changerReference(fichier.recette, palette, '#D93F1E')! : palette)) } as Recette;
  const changee = await jetons(fichier, recette, recette.palettes[0]);
  assert.equal(changee.etat, 'a-mettre-a-jour');
  assert.ok(changee.aEcrire.length > 0);
});

// Loi 1, suite. Un changement de forme réel reste signalé sous chaque convention : une reprise qui passe d'une à deux intensités.
test('loi 1 · un changement de forme d’une reprise reste signalé sous chaque convention', async () => {
  for (const { convention } of CONVENTIONS) {
    const forme: FormeDePalette = { ...B, intensites: 1, convention };
    const fichier = await fichierDePalettes(forme);
    rangerLesRegles(fichier, convention, { marque: false });
    const palette = choisirLesIntensites(fichier.recette, fichier.palette, 2);
    const recette = { ...fichier.recette, palettes: [palette] } as Recette;
    const apres = await jetons(fichier, recette, palette);
    assert.equal(apres.etat, 'a-mettre-a-jour', JSON.stringify(convention));
    assert.ok(apres.aRenommer.some((renommage) => renommage.cause === 'forme'), `un renommage de forme est annoncé : ${JSON.stringify(convention)}`);
  }
});

// Loi 2. Après écriture : avec les règles, la marque et une collection non exclue, Nomenclature ne propose aucun renommage des variables de Palettes.
pourChaqueForme('2 après écriture', croiser(DIAGONALE), async (forme) => {
  const fichier = await fichierDePalettes(forme, { regles: true });
  assert.ok(variablesDeLaPalette(fichier).length > 0);
  const { libres, aLaPalette } = await nomenclatureProposera(fichier);
  assert.equal(libres, true, 'la marque de Palettes libère ses variables : la loi ne repose pas sur leur protection');
  assert.deepEqual(aLaPalette.map(({ ancienNom, nouveauNom }) => `${ancienNom} -> ${nouveauNom}`), []);
});

// Loi 2, cas ajouté. La convention change après la première écriture : la destination garde ses noms jusqu'au passage de Nomenclature (D2).
for (const forme of croiser([A, C])) {
  const rang = CONVENTIONS.findIndex((candidate) => candidate.convention === forme.convention);
  const autre: Convention = CONVENTIONS[(rang + 1) % CONVENTIONS.length].convention;
  test(`loi 2 · la convention passe à ${JSON.stringify(autre)} après l’écriture · ${titreDeLaForme(forme)}`, async () => {
    const fichier = await fichierDePalettes(forme, { regles: true });
    const ecrits = nomsDeLaPalette(fichier);
    rangerLesRegles(fichier, autre);
    const palette = changerReference(fichier.recette, fichier.palette, '#D93F1E')!;
    const recette = { ...fichier.recette, palettes: [palette] } as Recette;
    fichier.figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(recette));
    const annonce = await jetons(fichier, recette, palette);
    assert.deepEqual([annonce.etat, annonce.aCreer, annonce.aRenommer], ['a-mettre-a-jour', [], []]);
    assert.ok(annonce.ecartsLaissesANomenclature.every((ecart) => ecrits.includes(ecart.nom)), 'les écarts annoncés sont des noms que la palette porte déjà');

    const ecriture = await ecrireLesVariables(api(fichier.figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [], remplacer: [] });
    assert.deepEqual([ecriture.issue, ecriture.issue === 'ecrites' ? ecriture.palettes.map((issue: IssueDeLaPalette) => issue.issue) : null], ['ecrites', ['ecrite']]);
    assert.deepEqual([creees(fichier.figma), renommees(fichier.figma)], [[], []]);
    assert.deepEqual(nomsDeLaPalette(fichier), ecrits);
  });
}

// Loi 2, cas ajouté. Une reprise convertie au format du plugin porte les noms que les règles donnent : Nomenclature n'a rien à lui renommer.
pourChaqueForme('2 après la conversion', croiser([B, B_EN_CHEMIN]), async (forme) => {
  const fichier = await fichierDePalettes(forme, { regles: true, ecrite: false });
  const ecriture = await convertirLaReprise(api(fichier.figma), { palette: fichier.palette.id, empreinteLue: empreinte(fichier.recette) });
  assert.ok(ecriture.issue === 'convertie' && ecriture.enPlace);
  const { libres, aLaPalette } = await nomenclatureProposera(fichier);
  assert.equal(libres, true);
  assert.deepEqual(aLaPalette.map(({ ancienNom, nouveauNom }) => `${ancienNom} -> ${nouveauNom}`), []);
});

// Loi 3. Annonce et écriture : pour chaque écran, le nom annoncé est celui que l'écriture donne.
pourChaqueForme('3 annonce et écriture · création', croiser([A, C]), async (forme) => {
  const fichier = await fichierDePalettes(forme, { regles: true });
  const { recette, palette } = avecUnePaletteDePlus(fichier, 'Ocean');
  const annonce = (await jetons(fichier, recette, palette)).aCreer;
  assert.ok(annonce.length > 0);
  const ecriture = await ecrireLesVariables(api(fichier.figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [palette.id], remplacer: [] });
  assert.equal(ecriture.issue, 'ecrites');
  assert.deepEqual(creees(fichier.figma), annonce);
  assert.deepEqual(nomsDeLaPalette({ figma: fichier.figma, palette }), annonce);
});

pourChaqueForme('3 annonce et écriture · mise à jour', croiser([A, C]), async (forme) => {
  const fichier = await fichierDePalettes(forme, { regles: true });
  const retirees = variablesDeLaPalette(fichier).slice(0, 3);
  for (const id of retirees) fichier.figma.locales.get(id)!.remove();
  fichier.figma.journal.length = 0;
  const annonce = await jetons(fichier);
  assert.equal(annonce.aCreer.length, 3, JSON.stringify(annonce.aCreer));
  const ecriture = await ecrireLesVariables(api(fichier.figma), { palettes: [fichier.palette.id], empreinteLue: empreinte(fichier.recette), remettre: [fichier.palette.id], remplacer: [] });
  assert.equal(ecriture.issue, 'ecrites');
  assert.deepEqual(creees(fichier.figma), annonce.aCreer);
});

pourChaqueForme('3 annonce et écriture · remplacement', croiser([A, C]), async (forme) => {
  const fichier = await fichierDePalettes(forme, { regles: true });
  const { recette, palette } = avecUnePaletteDePlus(fichier, 'Ocean');
  const [premier] = (await jetons(fichier, recette, palette)).aCreer;
  const tierce = variableTierce(fichier.figma, fichier.collection, premier.toUpperCase());
  fichier.figma.journal.length = 0;
  const annonce = await jetons(fichier, recette, palette);
  // Sous des règles qui normalisent la casse, la variable remplacée garde le nom qu'elle porte : l'annonce le dit, et l'écriture le tient.
  assert.deepEqual(annonce.existantes.map((nom) => nom.toLowerCase()), [premier.toLowerCase()]);
  assert.deepEqual(annonce.variablesExistantes, [tierce]);
  assert.ok(!annonce.aCreer.some((nom) => nom.toLowerCase() === premier.toLowerCase()));
  const ecriture = await ecrireLesVariables(api(fichier.figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [palette.id], remplacer: [palette.id] });
  assert.equal(ecriture.issue, 'ecrites');
  assert.deepEqual(creees(fichier.figma), annonce.aCreer);
  assert.equal(fichier.figma.locales.get(tierce)!.name, annonce.existantes[0], 'la variable remplacée porte le nom annoncé');
  assert.ok(sansDoublon(nomsDe(fichier.figma)));
});

pourChaqueForme('3 annonce et écriture · reprise', croiser([B]), async (forme) => {
  const fichier = await fichierDePalettes(forme, { regles: true, ecrite: false });
  const annonce = await jetons(fichier);
  assert.equal(annonce.reprise, true);
  assert.ok(annonce.aCreer.length > 0 && annonce.aRenommer.length > 0, 'deux intensités : des variables à créer, et celles d’origine changent de forme');
  const ecriture = await ecrireLesVariables(api(fichier.figma), { palettes: [fichier.palette.id], empreinteLue: empreinte(fichier.recette), remettre: [fichier.palette.id], remplacer: [] });
  assert.equal(ecriture.issue, 'ecrites');
  assert.deepEqual(creees(fichier.figma), annonce.aCreer);
  assert.deepEqual(renommees(fichier.figma).sort(), annonce.aRenommer.filter(({ de, vers }) => de !== vers).map(({ de, vers }) => `${de} -> ${vers}`).sort());
  const apres = nomsDeLaPalette(fichier);
  for (const { vers } of annonce.aRenommer) assert.ok(apres.includes(vers), vers);
});

// La conversion se joue deux fois : sur des variables d'origine en minuscules, puis sur des variables qu'UCM Architect a déjà renommées selon la convention.
for (const apresNomenclature of [false, true]) {
  pourChaqueForme(`3 annonce et écriture · conversion ${apresNomenclature ? 'après le passage de Nomenclature' : 'avant'}`, croiser([B, B_EN_CHEMIN]), async (forme) => {
    const fichier = await fichierDePalettes(forme, { regles: true, ecrite: false });
    if (apresNomenclature) {
      const { libres, appliquer } = await nomenclature(fichier);
      assert.equal(libres, true);
      assert.deepEqual(appliquer().sautes, []);
    }
    const lu = await lire(fichier);
    const suivie = lu.suivi.palettes[fichier.palette.id];
    const annonce = annonceDeLaConversion(fichier.recette, fichier.palette, suivie, lu);
    assert.equal(annonce.enPlace, true);
    assert.equal(annonce.occupe, null);
    assert.ok(annonce.aRenommer.length > 0);
    fichier.figma.journal.length = 0;
    const ecriture = await convertirLaReprise(api(fichier.figma), { palette: fichier.palette.id, empreinteLue: empreinte(fichier.recette) });
    assert.deepEqual(ecriture, { issue: 'convertie', renommees: annonce.aRenommer.length, enPlace: true });
    assert.deepEqual(renommees(fichier.figma).sort(), annonce.aRenommer.map(({ de, vers }) => `${de} -> ${vers}`).sort());
    for (const { id, vers } of annonce.aRenommer) assert.equal(fichier.figma.locales.get(id)!.name, vers);
  });
}

// Loi 4. Nom pris : une variable non suivie porte le nom final dans une autre casse. L'écriture refuse, sans doublon et sans toucher à l'occupant.
pourChaqueForme('4 nom pris · destination', croiser([A, C]), async (forme) => {
  const fichier = await fichierDePalettes(forme, { regles: true });
  const { recette, palette } = avecUnePaletteDePlus(fichier, 'Ocean');
  const [premier] = (await jetons(fichier, recette, palette)).aCreer;
  const tierce = variableTierce(fichier.figma, fichier.collection, premier.toUpperCase());
  const avant = [nomsDe(fichier.figma).sort(), instantane(fichier.figma, tierce)];
  const annonce = await jetons(fichier, recette, palette);
  assert.deepEqual(annonce.existantes.map((nom) => nom.toLowerCase()), [premier.toLowerCase()], 'Gestion annonce le nom pris');
  fichier.figma.journal.length = 0;
  const ecriture = await ecrireLesVariables(api(fichier.figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [palette.id], remplacer: [] });
  assert.ok(ecriture.issue === 'ecrites');
  const [issue] = ecriture.palettes;
  assert.ok(issue.issue === 'nom-pris' && annonce.existantes.includes(issue.nom), JSON.stringify(issue));
  assert.deepEqual([creees(fichier.figma), renommees(fichier.figma)], [[], []]);
  assert.deepEqual([nomsDe(fichier.figma).sort(), instantane(fichier.figma, tierce)], avant);
  assert.ok(sansDoublon(nomsDe(fichier.figma)));
});

pourChaqueForme('4 nom pris · remplacement refusé quand une autre palette tient le nom', croiser([A, C]), async (forme) => {
  const fichier = await fichierDePalettes(forme, { regles: true });
  const { recette, palette } = avecUnePaletteDePlus(fichier, 'Ocean');
  const [premier] = (await jetons(fichier, recette, palette)).aCreer;
  // Une variable de Poppy porte, dans une autre casse, le nom que Ocean veut prendre.
  const [dePoppy] = variablesDeLaPalette(fichier);
  fichier.figma.locales.get(dePoppy)!.name = premier.toUpperCase();
  const avant = [nomsDe(fichier.figma).sort(), instantane(fichier.figma, dePoppy)];
  const annonce = await jetons(fichier, recette, palette);
  assert.deepEqual(annonce.refus?.palette, fichier.palette.id, 'Gestion annonce le refus et la palette qui tient le nom');
  fichier.figma.journal.length = 0;
  const ecriture = await ecrireLesVariables(api(fichier.figma), { palettes: [palette.id], empreinteLue: empreinte(recette), remettre: [palette.id], remplacer: [palette.id] });
  assert.ok(ecriture.issue === 'ecrites');
  const [issue] = ecriture.palettes;
  assert.ok(issue.issue === 'nom-pris' && issue.nom === annonce.refus?.nom && issue.occupant?.palette === fichier.palette.id, JSON.stringify(issue));
  assert.deepEqual([creees(fichier.figma), renommees(fichier.figma)], [[], []]);
  assert.deepEqual([nomsDe(fichier.figma).sort(), instantane(fichier.figma, dePoppy)], avant);
});

/** La reprise écrit le reste de la palette et laisse le nom pris : aucune création de ce nom, aucun doublon, aucune mutation de l'occupant. */
async function verifierLeNomPrisEnReprise(fichier: FichierDeTest): Promise<void> {
  const [premier] = (await jetons(fichier)).aCreer;
  const tierce = variableTierce(fichier.figma, fichier.collection, premier.toUpperCase());
  const avant = instantane(fichier.figma, tierce);
  const annonce = await jetons(fichier);
  // Avec les thèmes en modes, Light et Dark visent la même variable : le nom paraît une fois par thème.
  assert.deepEqual([...new Set(annonce.nomsOccupes.map((nom) => nom.toLowerCase()))], [premier.toLowerCase()], 'Gestion annonce le nom occupé');
  assert.ok(!annonce.aCreer.some((nom) => nom.toLowerCase() === premier.toLowerCase()));
  fichier.figma.journal.length = 0;
  const ecriture = await ecrireLesVariables(api(fichier.figma), { palettes: [fichier.palette.id], empreinteLue: empreinte(fichier.recette), remettre: [fichier.palette.id], remplacer: [] });
  assert.ok(ecriture.issue === 'ecrites');
  assert.deepEqual(creees(fichier.figma), annonce.aCreer);
  assert.ok(!creees(fichier.figma).some((nom) => nom.toLowerCase() === premier.toLowerCase()));
  assert.equal(instantane(fichier.figma, tierce), avant);
  assert.ok(sansDoublon(nomsDe(fichier.figma)));
}

pourChaqueForme('4 nom pris · reprise', croiser([B]), async (forme) => verifierLeNomPrisEnReprise(await fichierDePalettes(forme, { regles: true, ecrite: false })));
test('loi 4 · nom pris · reprise sans règle de nommage', async () => {
  await verifierLeNomPrisEnReprise(await fichierDePalettes({ ...B, convention: CONVENTIONS[0].convention }, { ecrite: false }));
});

pourChaqueForme('4 nom pris · conversion', croiser([B, B_EN_CHEMIN]), async (forme) => {
  const fichier = await fichierDePalettes(forme, { regles: true, ecrite: false });
  const lu = await lire(fichier);
  const suivie = lu.suivi.palettes[fichier.palette.id];
  const [premier] = annonceDeLaConversion(fichier.recette, fichier.palette, suivie, lu).aRenommer;
  const tierce = variableTierce(fichier.figma, fichier.collection, premier.vers.toUpperCase());
  const avant = [nomsDe(fichier.figma).sort(), instantane(fichier.figma, tierce)];
  const annonce = annonceDeLaConversion(fichier.recette, fichier.palette, suivie, await lire(fichier));
  assert.notEqual(annonce.occupe, null, 'l’écran annonce le nom occupé');
  assert.equal(annonce.occupe!.toLowerCase(), premier.vers.toLowerCase());
  fichier.figma.journal.length = 0;
  const ecriture = await convertirLaReprise(api(fichier.figma), { palette: fichier.palette.id, empreinteLue: empreinte(fichier.recette) });
  assert.deepEqual(ecriture, { issue: 'nom-pris', nom: annonce.occupe });
  assert.deepEqual([creees(fichier.figma), renommees(fichier.figma)], [[], []]);
  assert.deepEqual([nomsDe(fichier.figma).sort(), instantane(fichier.figma, tierce)], avant);
});

// Loi 5. Grammaire, dans le profil : chaque nom écrit vers la destination de référence est reconnu par la grammaire du kit, avec la forme attendue.
const FORMES_ATTENDUES: Readonly<Record<'chemin' | 'modes', Readonly<Record<1 | 2, { readonly forme: IdentifiantDeForme; readonly roles: readonly RoleDeSegment[] }>>>> = {
  chemin: {
    1: { forme: 'primitives:color/palette/theme/cran', roles: ['famille', 'palette', 'theme', 'cran'] },
    2: { forme: 'primitives:color/palette/intensite/theme/cran', roles: ['famille', 'palette', 'intensite', 'theme', 'cran'] },
  },
  modes: {
    1: { forme: 'primitives:color/palette/cran', roles: ['famille', 'palette', 'cran'] },
    2: { forme: 'primitives:color/palette/intensite/cran', roles: ['famille', 'palette', 'intensite', 'cran'] },
  },
};

pourChaqueForme('5 grammaire', croiser(DIAGONALE), async (forme) => {
  const fichier = await fichierDePalettes(forme, { regles: true });
  const noms = nomsDeLaPalette(fichier);
  assert.ok(noms.length > 0);
  const collection = fichier.figma.collections.get(fichier.collection)!.name;
  assert.equal(porteeDeLaGrammaire(collection, [noms[0].split('/')[0]]), 'reference');
  assert.equal(DESTINATION_DES_PALETTES.themes, 'chemin');
  const attendu = FORMES_ATTENDUES[forme.themes][forme.intensites];
  const refus: string[] = [];
  for (const nom of noms) {
    const reconnu = reconnaitreLeChemin('primitives', nom.split('/'), { themes: forme.themes });
    if (!reconnu.conforme) { refus.push(`${nom} : ${JSON.stringify(reconnu)}`); continue; }
    assert.equal(reconnu.forme, attendu.forme, nom);
    assert.deepEqual(reconnu.segments.map((segment) => segment.role), attendu.roles, nom);
  }
  assert.deepEqual(refus, []);
});

// Loi 6. Agnostique : une sortie vers un groupe libre ou une collection libre n'est ni bloquée par l'écriture, ni déclarée fautive.
const SORTIES_LIBRES = [
  { collection: 'Primitives', groupe: 'Brand/Couleurs' },
  { collection: 'Mes couleurs', groupe: 'color' },
] as const;
for (const sortie of SORTIES_LIBRES) {
  pourChaqueForme(`6 agnostique · ${sortie.collection} / ${sortie.groupe}`, croiser(DIAGONALE), async (forme) => {
    // `fichierDePalettes` vérifie que l'écriture, ou la mise à jour de la reprise, a réussi : rien ne la bloque.
    const fichier = await fichierDePalettes(forme, { regles: true, sortie });
    const noms = nomsDeLaPalette(fichier);
    assert.ok(noms.length > 0);
    const segments = segmentsDuGroupe(sortie.groupe)!;
    assert.equal(porteeDeLaGrammaire(sortie.collection, segments), 'libre', 'la grammaire ne juge pas cette sortie');
    assert.equal((await jetons(fichier)).etat, 'a-jour');
    // L'explorateur ne juge que ce que le designer a associé à une couche. Associée à `primitives`, la sortie n'a aucun constat ni limite.
    const index = indexer(releveDuFichier(fichier.figma));
    const libre: AssociationDesCouches = {};
    assert.deepEqual(controlerLeProfil(index, libre, { recette: fichier.recette }), { constats: [], limites: [] });
    const associee: AssociationDesCouches = { c0: 'primitives' };
    assert.deepEqual(controlerLeProfil(index, associee, { recette: fichier.recette }), { constats: [], limites: [] });
  });
}

// Loi 7. Explorateur : sur des variables du thème nommées selon la convention, le profil reconnaît la couche et le rôle, et rend les mêmes constats et limites qu'en minuscules.
const EN_MINUSCULES: Convention = CONVENTIONS[0].convention;
const controleDuProfil = async (forme: FormeDePalette) => {
  const fichier = await fichierDePalettes(forme, { regles: true });
  themeSelonLaConvention(fichier, forme.convention);
  // Dans l'ordre de création : Primitives, Components, brands, theme.
  const couches: AssociationDesCouches = { c0: 'primitives', c2: 'brands', c3: 'theme' };
  return { fichier, controle: controlerLeProfil(indexer(releveDuFichier(fichier.figma)), couches, { recette: fichier.recette }) };
};
const baseDeReference = new Map<string, ReturnType<typeof controleDuProfil>>();

pourChaqueForme('7 explorateur', croiser(DIAGONALE), async (forme) => {
  const { fichier, controle } = await controleDuProfil(forme);
  const cle = JSON.stringify({ ...forme, convention: null });
  if (!baseDeReference.has(cle)) baseDeReference.set(cle, controleDuProfil({ ...forme, convention: EN_MINUSCULES }));
  const reference = await baseDeReference.get(cle)!;
  assert.deepEqual(reference.controle.constats.map((constat) => constat.regle), ['nuance'], 'le témoin : une seule variable du thème vise une mauvaise nuance');
  assert.deepEqual(controle, reference.controle);
  // Le rôle de chaque variable du thème se reconnaît, quelle que soit la convention.
  const noms = [...fichier.figma.locales.values()].filter((variable) => variable.collection.name.toLowerCase() === 'theme').map((variable) => variable.name);
  assert.equal(noms.length, 5);
  assert.equal(noms.filter((nom) => variableDuNom(nom) !== null).length, 4, `le rôle se lit dans ${noms.join(' | ')}`);
  assert.deepEqual(controle.limites.filter((limite) => limite.cause === 'role-inconnu'), []);
});

// Loi 8. Lot entier : deux palettes dont les noms convergent sous la convention. L'annonce, l'issue de l'écriture et les mutations du double concordent.
const convergent = (convention: Convention): boolean => nomSelonLaConvention('Ocean-Blue', convention).toLowerCase() === nomSelonLaConvention('OceanBlue', convention).toLowerCase();

for (const forme of croiser([A, C])) {
  for (const ordre of [['Ocean-Blue', 'OceanBlue'], ['OceanBlue', 'Ocean-Blue']]) {
    test(`loi 8 · ${ordre.join(' puis ')} · ${titreDeLaForme(forme)}`, async () => {
      const { figma, recette, palettes } = fichierDeLot(forme, ordre);
      const ids = palettes.map((palette) => palette.id);
      const plan = planDuLot(recette, await lireLesVariablesDuFichier(api(figma)), { palettes: ids, remettre: ids, remplacer: [] });
      assert.deepEqual(plan.palettes.map((decision) => decision.decision), convergent(forme.convention) ? ['ecrire', 'nom-pris'] : ['ecrire', 'ecrire']);

      const ecriture = await ecrireLesVariables(api(figma), { palettes: ids, empreinteLue: empreinte(recette), remettre: ids, remplacer: [] });
      assert.ok(ecriture.issue === 'ecrites');
      const decision = plan.palettes[1];
      if (decision.decision === 'nom-pris') {
        assert.ok(decision.occupant.par === 'palette' && decision.occupant.dansLeLot);
        assert.deepEqual(ecriture.palettes[1], { palette: ids[1], issue: 'nom-pris', nom: decision.nom, occupant: { palette: ids[0], dansLeLot: true } });
        // Gestion, après le lot : le refus nomme la palette qui tient le nom.
        const apres = tokensDeLaPalette(recette, palettes[1], await lireLesVariablesDuFichier(api(figma)));
        assert.deepEqual(apres.refus, { nom: decision.nom, palette: ids[0] });
      } else {
        assert.deepEqual(ecriture.palettes.map((issue) => issue.issue), ['ecrite', 'ecrite']);
      }
      await verifierLaLoiDuLot(figma, plan);
      assert.ok(sansDoublon(nomsDe(figma)));
    });
  }
}
