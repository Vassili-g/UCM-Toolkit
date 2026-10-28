/**
 * Les domaines du sandbox : chacun donne `TYPES`, les `type` de demande qu'il
 * traite, et `traiter(demande, contexte)`. Ajouter un domaine ajoute une ligne
 * à `DOMAINES`, qui doit couvrir chaque clé de `DemandesParDomaine`.
 * `code.ts` en tire la table `type → domaine`.
 */
import type { Domaine } from '../messages';
import * as accessibilite from './accessibilite';
import * as analyse from './analyse';
import * as arbre from './arbre';
import * as bibliotheque from './bibliotheque';
import * as commun from './commun';
import * as composant from './composant';
import * as configuration from './configuration';
import type { Contexte } from './contexte';
import * as corrections from './corrections';
import * as fiche from './fiche';
import * as ignores from './ignores';
import * as nomenclature from './nomenclature';
import * as preparation from './preparation';
import * as questions from './questions';
import * as rapport from './rapport';
import * as recherche from './recherche';
import * as regles from './regles';
import * as structure from './structure';

export interface DomaineDuSandbox {
  readonly TYPES: readonly string[];
  readonly traiter: (demande: never, contexte: Contexte) => Promise<void>;
}

export const DOMAINES: Readonly<Record<Domaine, DomaineDuSandbox>> = {
  commun, arbre, recherche, fiche, bibliotheque, nomenclature, structure, composant,
  analyse, corrections, questions, ignores, accessibilite, regles, preparation, configuration, rapport,
};

/** Chaque `type` de demande et le domaine qui le traite ; un `type` partagé par deux domaines est refusé à la construction. */
export function tableDesTypes(domaines: Readonly<Record<string, Pick<DomaineDuSandbox, 'TYPES'>>> = DOMAINES): ReadonlyMap<string, string> {
  const table = new Map<string, string>();
  for (const [domaine, { TYPES }] of Object.entries(domaines)) {
    for (const type of TYPES) {
      const deja = table.get(type);
      if (deja !== undefined) throw new Error(`Le type ${type} est déclaré par ${deja} et par ${domaine}.`);
      table.set(type, domaine);
    }
  }
  return table;
}
