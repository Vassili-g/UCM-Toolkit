/**
 * Les deux relations métamorphiques du stress test F8, rejouées sur les faux positifs et les opérateurs :
 * - `ordre` : l'ordre des règles de chaque conteneur, des conteneurs et des voisins de la page, des points du moteur et des
 *   corrections envoyées à l'écriture est mélangé (graine du cas) ; les constats et les résultats d'écriture restent les mêmes ;
 * - `casse` : le nom de propriété des cibles `@prop` et `@boolean` passe en capitales ; les constats restent les mêmes, aux
 *   majuscules près.
 *
 * Les constats se comparent sur leur code et leur clé (`cleDeConstat`) en minuscules : un identifiant qui dépend de l'ordre des
 * phrases (M3) est jugé par l'opérateur M3, non ici. Un cas dont la relation lève compte comme un écart de la relation.
 */
import type { Constat } from '@ucm-kit/core/controles';

import { graineDe } from '../../../../kit/tests/stress/commun/prng';
import { cleDeConstat, messageDe, type CasF8, type EcartDeRelation, type Relation, type SortieDeCas } from './cas';

export const RELATIONS: readonly Relation[] = ['ordre', 'casse'];

const cleMinuscule = (constat: Constat): string => `${constat.code}|${cleDeConstat(constat)}`.toLowerCase();

function differences(base: readonly Constat[], autre: readonly Constat[]): string[] {
  const avant = new Map<string, number>();
  const apres = new Map<string, number>();
  for (const constat of base) avant.set(cleMinuscule(constat), (avant.get(cleMinuscule(constat)) ?? 0) + 1);
  for (const constat of autre) apres.set(cleMinuscule(constat), (apres.get(cleMinuscule(constat)) ?? 0) + 1);
  return [
    ...[...avant].filter(([cle, nombre]) => apres.get(cle) !== nombre).map(([cle]) => `perdu ou compté autrement : ${cle}`),
    ...[...apres].filter(([cle]) => !avant.has(cle)).map(([cle]) => `ajouté : ${cle}`),
  ];
}

interface Rendu { ecrites?: string[]; sautees?: { id: string; motif: string }[] }

/** Les résultats d'écriture, comme un texte sans ordre. */
function ecritureDe(sortie: SortieDeCas): string | null {
  const rendu = (sortie.donnees as { rendu?: Rendu } | undefined)?.rendu;
  if (!rendu) return null;
  return JSON.stringify({ ecrites: [...(rendu.ecrites ?? [])].sort(), sautees: (rendu.sautees ?? []).map(({ id, motif }) => `${id}:${motif}`).sort() });
}

export async function verifierLesRelations(cas: CasF8, base: SortieDeCas, graine: number): Promise<EcartDeRelation[]> {
  const ecarts: EcartDeRelation[] = [];
  for (const relation of cas.entree.relations) {
    const variante = relation === 'ordre' ? { melange: graineDe(graine, cas.id) } : { casse: true };
    try {
      const autre = await cas.entree.jouer(variante);
      const messages = differences(base.constats, autre.constats);
      if (ecritureDe(base) !== ecritureDe(autre)) messages.push(`écriture différente : ${ecritureDe(base)} puis ${ecritureDe(autre)}`);
      if (messages.length > 0) ecarts.push({ cas: cas.id, relation, detail: `${messages.slice(0, 3).join(' ; ')}${messages.length > 3 ? ` (+${messages.length - 3})` : ''}` });
    } catch (erreur) {
      ecarts.push({ cas: cas.id, relation, detail: `exception : ${messageDe(erreur)}` });
    }
  }
  return ecarts;
}
