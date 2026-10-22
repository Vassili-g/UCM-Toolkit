/**
 * Le nommeur de Palettes : les noms que le plan écrit passent par le calcul de renommage qu'UCM Architect emploie
 * (`ucm-plugin-socle`), sur l'inventaire du fichier entier. Les deux plugins tombent ainsi sur le même nom :
 * `colors/Poppy/vivid/light/50` devient `Color/Poppy/Vivid/Light/50` avec l'écriture PascalCase des groupes, et Palettes
 * ne défait plus un renommage. Pur : ni Figma, ni DOM ; `src/lectureDesVariables.ts` lit les données.
 *
 * Le calcul voit les variables suivies sous leur nom brut du plan (c'est le nom que l'écriture leur donne), les variables à
 * créer sous des identifiants temporaires, et les autres sous leur nom du fichier. Aucune variable de Palettes n'est protégée
 * ici : c'est Palettes qui suit les règles, la protection est celle d'UCM Architect. Sans règles enregistrées, ou dans une
 * collection que les règles excluent, il n'y a pas de nommeur pour la collection et le plan garde ses noms bruts.
 */
import type { Palette, Recette } from 'ucm-couleur';
import { inventaireDeLectures, type LecteurDeVariable, type ObjetNomme, type VariableLue as VariableDuSocle } from 'ucm-plugin-socle/src/inventaireDeNoms';
import { nomsSelonLesReglesSync } from '@ucm-kit/core/nommage';
import { lireReglesDeNommage } from '@ucm-kit/core/protocoles';

import type { Destination } from './destination';
import { destinationChangee } from './etat';
import { planDesVariables, type EntreeDuPlan, type Nommer, type NomReserve } from './plan';
import type { OrigineDeLaReprise } from './reprise';
import type { VariableLue } from './releve';
import type { PaletteSuivie } from './suivi';

/** Une variable locale du fichier, de n'importe quel type, réduite à ce que le calcul lit. */
export interface VariableNommee {
  readonly id: string;
  readonly nom: string;
  readonly collection: string;
  /** L'identifiant visé par l'alias de son premier mode. */
  readonly alias?: string;
  /** Son identifiant de palette (donnée partagée `palette`) : la variable est créée par Palettes. */
  readonly palette?: string;
}

/**
 * Ce que le calcul lit du fichier : les règles (couples clé, texte de `ESPACE_ARCHITECT`), les collections et toutes les
 * variables locales. C'est du JSON : le sandbox l'envoie à l'interface, qui calcule les mêmes noms que l'écriture.
 */
export interface DonneesDeNommage {
  readonly couples: readonly (readonly [string, string])[];
  readonly collections: readonly { readonly id: string; readonly nom: string }[];
  readonly variables: readonly VariableNommee[];
}

/** La collection où le plan écrit : une collection du fichier, ou une collection à créer sous ce nom. */
export type CollectionVisee = { readonly id: string } | { readonly nom: string };

export interface Nommeur {
  /** Le nommeur d'une écriture dans cette collection ; `undefined` quand les règles l'excluent ou qu'elle n'est pas dans le fichier. */
  pour(collection: CollectionVisee): Nommer | undefined;
}

/** L'identifiant sous lequel le nommeur, et le plan d'un lot, voient une collection que l'écriture crée. */
export const COLLECTION_A_CREER = 'ucm-palettes:collection-a-creer';
const PREFIXE_A_CREER = 'ucm-palettes:a-creer:';

/** Le nommeur du fichier ; `undefined` tant qu'aucune écriture n'est rangée par UCM Architect. */
export function creerNommeur(donnees: DonneesDeNommage): Nommeur | undefined {
  const regles = lireReglesDeNommage(donnees.couples);
  if (!regles) return undefined;
  const exclues = new Set(regles.collectionsExclues);
  const alias = new Map(donnees.variables.flatMap((variable) => (variable.alias ? [[variable.id, variable.alias] as const] : [])));
  const palettes = new Map(donnees.variables.flatMap((variable) => (variable.palette ? [[variable.id, variable.palette] as const] : [])));
  // Une variable à créer est déclarée : Palettes range sa donnée partagée `palette` dès qu'il la crée.
  const lecteur: LecteurDeVariable = {
    cibleAlias: (variable) => alias.get(variable.id),
    protegee: () => false,
    palette: (variable) => (variable.id.startsWith(PREFIXE_A_CREER) ? 'a-creer' : palettes.get(variable.id)),
  };
  const collectionsDuFichier: ObjetNomme[] = donnees.collections.map((collection) => ({ id: collection.id, name: collection.nom, remote: false }));

  const nommeursParCollection = new Map<string, Nommer | undefined>();
  const nommeurDeLaCollection = (visee: CollectionVisee): Nommer | undefined => {
    const collection = 'id' in visee ? visee.id : COLLECTION_A_CREER;
    if ('id' in visee ? exclues.has(collection) || !donnees.collections.some((candidate) => candidate.id === collection) : false) return undefined;
    const collections = 'id' in visee ? collectionsDuFichier : [...collectionsDuFichier, { id: COLLECTION_A_CREER, name: visee.nom.trim(), remote: false }];
    const deLaCollection = new Set(donnees.variables.filter((variable) => variable.collection === collection).map((variable) => variable.id));
    const memo = new Map<string, string[]>();

    return (entrees) => {
      const cleDuMemo = JSON.stringify(entrees.map((entree) => [entree.id ?? null, entree.nom]));
      const connu = memo.get(cleDuMemo);
      if (connu) return [...connu];

      // Un objet par variable : celle que le fichier porte pour l'entrée, sinon une à créer par nom brut.
      const objets = new Map<string, { readonly id: string; readonly nom: string }>();
      const cles = entrees.map((entree) => {
        if (entree.nom === '') return '';
        const cle = entree.id !== undefined && deLaCollection.has(entree.id) ? entree.id : `nom:${entree.nom}`;
        if (!objets.has(cle)) objets.set(cle, { id: cle.startsWith('nom:') ? `${PREFIXE_A_CREER}${objets.size}` : cle, nom: entree.nom });
        return cle;
      });
      const bruts = new Map([...objets.values()].map((objet) => [objet.id, objet.nom]));
      const variables: VariableDuSocle[] = [
        ...donnees.variables.map((variable) => ({ id: variable.id, name: bruts.get(variable.id) ?? variable.nom, variableCollectionId: variable.collection, remote: false })),
        ...[...objets.values()].filter((objet) => objet.id.startsWith(PREFIXE_A_CREER)).map((objet) => ({ id: objet.id, name: objet.nom, variableCollectionId: collection, remote: false })),
      ];

      const inventaire = inventaireDeLectures(collections, variables, lecteur);
      const idsDeNom = new Map(inventaire.entrees.flatMap((entree) => (entree.cible.type === 'variable' ? [[entree.cible.variableId, entree.nom.id] as const] : [])));
      const { resultat } = nomsSelonLesReglesSync(inventaire, regles, inventaire.entrees.filter((entree) => !entree.renommable).map((entree) => entree.nom.id));
      const finals = new Map(resultat.renommages.map((renommage) => [renommage.id, renommage.nouveauNom]));

      // Une variable à créer dont le nom entre en collision avec une variable que le plan ne touche pas prend le nom de celle-ci :
      // l'écriture reconnaît alors le nom pris, comme avant les règles.
      const autres = new Map(donnees.variables.filter((variable) => variable.collection === collection && !bruts.has(variable.id)).map((variable) => [idsDeNom.get(variable.id), variable.nom]));
      const prisParUneAutre = new Map<string, string>();
      for (const { ids } of resultat.collisions) {
        const autre = ids.map((id) => autres.get(id)).find((nom) => nom !== undefined);
        if (autre !== undefined) for (const id of ids) prisParUneAutre.set(id, autre);
      }

      const noms = new Map([...objets].map(([cle, objet]) => {
        const idDuNom = idsDeNom.get(objet.id)!;
        const aCreer = objet.id.startsWith(PREFIXE_A_CREER);
        return [cle, finals.get(idDuNom) ?? (aCreer ? prisParUneAutre.get(idDuNom) : undefined) ?? objet.nom] as const;
      }));
      const rendus = entrees.map((entree, rang) => (cles[rang] === '' ? entree.nom : noms.get(cles[rang])!));
      memo.set(cleDuMemo, rendus);
      return [...rendus];
    };
  };

  return {
    // Le même nommeur sert tous les plans d'une collection : son calcul se garde d'un plan à l'autre.
    pour(visee) {
      const cle = 'id' in visee ? `id:${visee.id}` : `nom:${visee.nom}`;
      if (!nommeursParCollection.has(cle)) nommeursParCollection.set(cle, nommeurDeLaCollection(visee));
      return nommeursParCollection.get(cle);
    },
  };
}

const nommeurs = new WeakMap<DonneesDeNommage, Nommeur | undefined>();

/** Le nommeur d'un fichier lu : les mêmes données donnent le même nommeur, et le calcul d'un plan se garde. */
export function nommeurDuFichier(fichier: { readonly nommage?: DonneesDeNommage }): Nommeur | undefined {
  const donnees = fichier.nommage;
  if (!donnees) return undefined;
  if (!nommeurs.has(donnees)) nommeurs.set(donnees, creerNommeur(donnees));
  return nommeurs.get(donnees);
}

/**
 * Le plan d'une palette sous ses noms finaux, quand le fichier a des règles. La collection où la palette écrit se choisit
 * comme l'écriture la choisit : celle de sa reprise ; celle de son suivi tant que la destination n'a pas changé ; sinon celle
 * de la destination. Elle se juge sur le plan brut, que le changement de destination ne distingue pas du plan final.
 * `collections` dit quelles collections le fichier porte. `reservesDuLot` et
 * `nomsReserves` suivent `planDesVariables` : ils ne servent qu'à une reprise.
 */
export function planDeLaPalette(
  nommeur: Nommeur | undefined,
  recette: Recette,
  palette: Palette,
  destination: Destination,
  suivie: PaletteSuivie | undefined,
  origine: OrigineDeLaReprise | null | undefined,
  lues: ReadonlyMap<string, VariableLue>,
  collections: { has(id: string): boolean },
  nomsOccupes?: string[],
  reservesDuLot?: ReadonlyMap<string, string>,
  nomsReserves?: NomReserve[],
): EntreeDuPlan[] {
  if (!nommeur) return planDesVariables(recette, palette, destination, suivie, origine, nomsOccupes, undefined, reservesDuLot, nomsReserves);
  if (suivie?.liaison === 'reprise') return planDesVariables(recette, palette, destination, suivie, origine, nomsOccupes, nommeur.pour({ id: suivie.collection }), reservesDuLot, nomsReserves);
  const brut = planDesVariables(recette, palette, destination, suivie, origine);
  const garde = suivie && !destinationChangee(suivie, destination, brut, lues) && collections.has(suivie.collection);
  const visee: CollectionVisee = garde ? { id: suivie.collection } : 'id' in destination.collection ? { id: destination.collection.id } : { nom: destination.collection.nom };
  const nommer = nommeur.pour(visee);
  return nommer ? planDesVariables(recette, palette, destination, suivie, origine, nomsOccupes, nommer) : brut;
}
