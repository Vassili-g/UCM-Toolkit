/**
 * Les relations métamorphiques de P8 pour le stress test F2, en version allégée. Pour un cas, elles rejouent les contrôles sur un
 * catalogue dont l'ordre des variables est mélangé (graine), puis sur un catalogue dont les noms de variables changent de casse,
 * et comparent les constats à ceux du catalogue d'origine. Les constats restent les mêmes aux noms près : la comparaison se fait sur
 * le code, le genre, la variable et le mode en minuscules. Les identifiants de constats restent ceux de l'appel d'origine, un
 * second appel sur la même entrée rend les mêmes identifiants dans le même ordre, et l'entrée n'est modifiée par aucun appel.
 *
 * Le changement de casse met en capitales initiales chaque segment d'un nom écrit en minuscules, et en minuscules un nom qui
 * porte déjà une capitale : il change donc tous les noms, quelle que soit l'écriture du profil. Les clés des variables, les noms des
 * collections et ceux des modes ne changent pas.
 */
import type { Constat } from '../../../src/controles/index.js';
import { graineDe, melanger, mulberry32 } from '../commun/prng.js';
import { cleDeConstat, constatsBruts, identifiantsEnDouble, sansDoublon, type CasDeStructure } from './cas.js';

export type Relation = 'ordre' | 'casse' | 'identifiants' | 'entree';

export interface EcartDeRelation {
  readonly cas: string;
  readonly operateur: string;
  readonly relation: Relation;
  readonly detail: string;
}

export const RELATIONS: readonly Relation[] = ['ordre', 'casse', 'identifiants', 'entree'];

/** L'autre écriture d'un nom : capitales initiales si le nom est en minuscules, minuscules sinon. */
export function autreCasse(nom: string): string {
  if (nom !== nom.toLowerCase()) return nom.toLowerCase();
  return nom.split('/').map((segment) => segment.replace(/(^|[-_ ])(\p{L})/gu, (_, separateur: string, lettre: string) => separateur + lettre.toUpperCase())).join('/');
}

/** Une copie du catalogue du cas dont les variables sont dans un autre ordre. */
export function catalogueMelange(cas: CasDeStructure, graine: number) {
  const copie = structuredClone(cas.entree.theme.catalogue);
  copie.variables = melanger(mulberry32(graineDe(graine, `${cas.id}:ordre`)), copie.variables);
  return copie;
}

/** Une copie du catalogue du cas dont les noms de variables changent de casse. */
export function catalogueEnAutreCasse(cas: CasDeStructure) {
  const copie = structuredClone(cas.entree.theme.catalogue);
  for (const variable of copie.variables) variable.nom = autreCasse(variable.nom);
  return copie;
}

const cleNormalisee = (constat: Constat): string => `${constat.code}|${cleDeConstat(constat)}`.toLowerCase();

function differences(origine: readonly Constat[], autre: readonly Constat[], parIdentifiant: boolean): string[] {
  const lire = parIdentifiant ? (constat: Constat) => constat.id : cleNormalisee;
  const avant = new Set(origine.map(lire));
  const apres = new Set(autre.map(lire));
  return [
    ...[...avant].filter((cle) => !apres.has(cle)).map((cle) => `perdu ${cle}`),
    ...[...apres].filter((cle) => !avant.has(cle)).map((cle) => `ajouté ${cle}`),
  ];
}

const resume = (messages: readonly string[]): string => `${messages.slice(0, 3).join(' ; ')}${messages.length > 3 ? ` (+${messages.length - 3})` : ''}`;

/**
 * Rejoue les contrôles du cas sur chaque catalogue transformé. `origine` est le résultat brut (avant dédoublonnage) de l'appel
 * d'origine, déjà lancé sur une copie du catalogue du cas.
 */
export function verifierLesRelations(cas: CasDeStructure, origine: readonly Constat[], graine: number): EcartDeRelation[] {
  const ecarts: EcartDeRelation[] = [];
  const noter = (relation: Relation, detail: string): void => { ecarts.push({ cas: cas.id, operateur: cas.operateur, relation, detail }); };
  const { ecriture, rolesIgnores } = cas.entree;
  const dedoublonnes = sansDoublon(origine);

  // Des identifiants uniques, et un second appel sur une copie neuve qui les rend dans le même ordre sans rien écrire dans l'entrée.
  const doubles = identifiantsEnDouble(origine);
  if (doubles.length > 0) noter('identifiants', `identifiant émis plusieurs fois : ${resume(doubles)}`);
  const entree = structuredClone(cas.entree.theme.catalogue);
  const avant = JSON.stringify(entree);
  const second = constatsBruts(entree, ecriture, rolesIgnores);
  if (JSON.stringify(entree) !== avant) noter('entree', 'un contrôle modifie le catalogue qu\'on lui donne');
  if (JSON.stringify(second.map((constat) => constat.id)) !== JSON.stringify(origine.map((constat) => constat.id))) noter('identifiants', 'un second appel rend d\'autres identifiants');

  const melange = sansDoublon(constatsBruts(catalogueMelange(cas, graine), ecriture, rolesIgnores));
  const ordre = [...differences(dedoublonnes, melange, true), ...differences(dedoublonnes, melange, false)];
  if (ordre.length > 0) noter('ordre', resume([...new Set(ordre)]));

  const recasse = sansDoublon(constatsBruts(catalogueEnAutreCasse(cas), ecriture, rolesIgnores));
  const casse = [...differences(dedoublonnes, recasse, true).map((message) => `identifiant ${message}`), ...differences(dedoublonnes, recasse, false)];
  if (casse.length > 0) noter('casse', resume(casse));
  return ecarts;
}
