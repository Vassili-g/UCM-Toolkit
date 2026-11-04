/** Les cartes du mode Tokens, classées sans DOM dans les dix catégories du sommaire. */
import type { Bilan, GroupeVue, QuestionVue } from '../../messages/nomenclature';
import type { Constat, Correction } from '../../messages/commun';
import {
  GROUPES, lireLesConstats, lireLesCorrections,
  type CarteDeCrans, type CarteDeModes, type CarteDeScopes, type CarteDeVariables,
  type ConstatAFaire, type GroupeDeConstat, type Noms,
} from '../structure/lecture';
import { TEXTES } from '../textes';
import { TEXTES_TOKENS } from '../textes/tokens';

export type IdDeCategorie = 'noms' | GroupeDeConstat | 'scopes';
type CorrectionDeStructure = CarteDeVariables | CarteDeCrans | CarteDeModes | CarteDeScopes;

export type CarteDeCategorie =
  | { readonly sorte: 'renommage'; readonly groupe: GroupeVue; readonly estUneQuestion: false }
  | { readonly sorte: 'question-de-nom'; readonly question: QuestionVue; readonly estUneQuestion: true }
  | { readonly sorte: 'constat'; readonly constat: ConstatAFaire; readonly estUneQuestion: boolean }
  | { readonly sorte: 'correction'; readonly correction: CorrectionDeStructure; readonly estUneQuestion: false };

interface DefinitionDeCategorie {
  readonly id: IdDeCategorie;
  readonly libelle: string;
  readonly signe: string;
  readonly famille: 'rubrique-tokens';
}

export interface CategorieDeTokens extends DefinitionDeCategorie {
  readonly cartes: readonly CarteDeCategorie[];
  /** Le nombre de cartes, même quand une carte regroupe plusieurs corrections. */
  readonly nombre: number;
  readonly tenue: boolean;
}

const STRUCTURE: Readonly<Record<GroupeDeConstat, { readonly libelle: string; readonly signe: string }>> = {
  manquantes: { libelle: TEXTES.groupeVariablesManquantes, signe: 'a-creer' },
  crans: { libelle: TEXTES.groupeCrans, signe: 'cran' },
  alias: { libelle: TEXTES.groupeAlias, signe: 'rompue' },
  modes: { libelle: TEXTES.groupeModes, signe: 'mode' },
  valeurs: { libelle: TEXTES.groupeValeurs, signe: 'valeurs' },
  couches: { libelle: TEXTES.groupeCouches, signe: 'couches' },
  types: { libelle: TEXTES.groupeTypes, signe: 'types' },
  rangement: { libelle: TEXTES.groupeRangement, signe: 'rangement' },
};

const CATEGORIES: readonly DefinitionDeCategorie[] = [
  { id: 'noms', libelle: TEXTES_TOKENS.categorieNoms, signe: 'nom', famille: 'rubrique-tokens' },
  ...GROUPES.map((id) => ({ id, ...STRUCTURE[id], famille: 'rubrique-tokens' as const })),
  { id: 'scopes', libelle: TEXTES.groupeScopes, signe: 'scope', famille: 'rubrique-tokens' },
];

export interface DonneesDesCategories {
  readonly nomenclature: Pick<Bilan, 'groupes' | 'questions'> | null;
  /** Les constats visibles, après retrait des ignorés par le sandbox. */
  readonly constats: readonly Constat[];
  readonly corrections: readonly Correction[];
  readonly noms: Noms;
  readonly partielle: boolean;
}

/**
 * Reprend les cartes et regroupements des lecteurs existants, sans changer les objets reçus.
 * Les questions précèdent les autres cartes de leur catégorie. Une lecture partielle ne déclare aucune catégorie tenue.
 */
export function lireLesCategories({ nomenclature, constats, corrections, noms, partielle }: DonneesDesCategories): readonly CategorieDeTokens[] {
  const parCategorie = new Map<IdDeCategorie, CarteDeCategorie[]>(CATEGORIES.map(({ id }) => [id, []]));
  const ajouter = (id: IdDeCategorie, carte: CarteDeCategorie): void => { parCategorie.get(id)!.push(carte); };
  for (const question of nomenclature?.questions ?? []) ajouter('noms', { sorte: 'question-de-nom', question, estUneQuestion: true });
  for (const groupe of nomenclature?.groupes ?? []) ajouter('noms', { sorte: 'renommage', groupe, estUneQuestion: false });

  const questions = new Set(constats.filter((constat) => constat.question).map(({ id }) => id));
  for (const constat of lireLesConstats(constats, noms)) {
    ajouter(constat.groupe, { sorte: 'constat', constat, estUneQuestion: questions.has(constat.id) });
  }
  const lues = lireLesCorrections(corrections, noms, constats);
  for (const correction of lues.variables) ajouter('manquantes', { sorte: 'correction', correction, estUneQuestion: false });
  for (const correction of lues.crans) ajouter('crans', { sorte: 'correction', correction, estUneQuestion: false });
  for (const correction of lues.modes) ajouter('modes', { sorte: 'correction', correction, estUneQuestion: false });
  for (const correction of lues.scopes) ajouter('scopes', { sorte: 'correction', correction, estUneQuestion: false });

  return CATEGORIES.map((definition) => {
    const cartes = parCategorie.get(definition.id)!;
    const ordonnees = [...cartes.filter(({ estUneQuestion }) => estUneQuestion), ...cartes.filter(({ estUneQuestion }) => !estUneQuestion)];
    return { ...definition, cartes: ordonnees, nombre: cartes.length, tenue: !partielle && cartes.length === 0 };
  });
}
