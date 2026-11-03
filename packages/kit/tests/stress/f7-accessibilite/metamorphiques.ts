/**
 * Les deux relations métamorphiques de la version allégée (propriété P8) : le même composant avec l'ordre de ses variants et de ses
 * layers mélangé, puis avec la casse des noms changée, doit donner les mêmes constats, aux ordres et à la casse près. La relation
 * rejoue la dégradation d'un cas sur une copie fraîche (aucun contrôle n'a encore lu les tableaux, la mémoire du kit n'est pas
 * périmée), transforme la copie, puis compare à ce que le cas a émis tel quel.
 *
 * Une relation ne s'applique pas à un cas que la transformation change légitimement : la borne de 5 000 combinaisons coupe les
 * derniers variants du relevé, donc l'ordre des variants change ce qu'elle mesure ; un cas à deux racines lit la première ; le cas
 * qui ne finit pas (`risqueDeBoucle`) ne se rejoue pas. Le rapport compte ces cas à part.
 */
import { controlerLAccessibilite } from '../../../src/controles/accessibilite.js';
import type { Constat } from '../../../src/controles/index.js';
import { graineDe, melanger, mulberry32 } from '../commun/prng.js';
import type { CasAccessibilite } from './cas.js';
import type { ComposantDeContraste } from './composantDeContraste.js';

export type Relation = 'ordre' | 'casse';
export const RELATIONS: readonly Relation[] = ['ordre', 'casse'];

export interface ResultatDeRelation {
  readonly cas: string;
  readonly relation: Relation;
  /** `ecart` quand les constats diffèrent, `exception` quand le contrôle lève sur la copie transformée, `ignore` quand la relation ne s'applique pas. */
  readonly issue: 'tenue' | 'ecart' | 'exception' | 'ignore';
  readonly detail?: string;
}

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/** Mélange en place l'ordre des variants et celui des layers de chaque variant, avec la graine du cas. */
function melangerLOrdre(composant: ComposantDeContraste, graine: number, identifiant: string): void {
  const tirer = mulberry32(graineDe(graine, `ordre:${identifiant}`));
  const { variants } = composant.releve;
  variants.splice(0, variants.length, ...melanger(tirer, variants));
  for (const variant of variants) variant.layers.splice(0, variant.layers.length, ...melanger(tirer, variant.layers));
}

/** Passe en capitales les noms de variants, de layers, de propriétés et de leurs valeurs, en place. */
function changerLaCasse(composant: ComposantDeContraste): void {
  const { releve } = composant;
  for (const propriete of releve.proprietes) {
    propriete.nom = propriete.nom.toUpperCase();
    if (propriete.valeurs) propriete.valeurs = propriete.valeurs.map((valeur) => valeur.toUpperCase());
  }
  for (const variant of releve.variants) {
    variant.nom = variant.nom.toUpperCase();
    variant.valeurs = Object.fromEntries(Object.entries(variant.valeurs).map(([axe, valeur]) => [axe.toUpperCase(), valeur.toUpperCase()]));
    for (const layer of variant.layers) layer.nom = layer.nom.toUpperCase();
  }
}

const etiquetteSansOrdre = (etiquette: string): string => etiquette.split(', ').sort().join(', ');

/** La forme comparable d'un constat : sans l'ordre des variants, des layers et des modes, et sans le mode retenu en cas d'égalité. */
function forme(constat: Constat, relation: Relation): string {
  const faits: Record<string, unknown> = { ...constat.faits };
  delete faits.mode;
  if (typeof faits.rapports === 'string') {
    const rapports = (JSON.parse(faits.rapports) as [string, number][]).map(([etiquette, rapport]) => [etiquetteSansOrdre(etiquette), rapport] as const);
    faits.rapports = rapports.sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x - y));
  }
  const texte = JSON.stringify({
    id: constat.id, code: constat.code, type: constat.type, limite: constat.limite ?? false,
    variants: [...constat.variants].sort(), layers: [...constat.layers].sort(), faits: Object.fromEntries(Object.keys(faits).sort().map((cle) => [cle, faits[cle]])),
  });
  return relation === 'casse' ? texte.toLowerCase() : texte;
}

const formes = (constats: readonly Constat[], relation: Relation): string[] => constats.map((constat) => forme(constat, relation)).sort();

/** La première différence entre deux listes de formes, en une phrase. */
function premiereDifference(avant: readonly string[], apres: readonly string[]): string {
  const [a, b] = [new Set(avant), new Set(apres)];
  const seulAvant = avant.find((texte) => !b.has(texte));
  const seulApres = apres.find((texte) => !a.has(texte));
  const court = (texte: string): string => (texte.length > 220 ? `${texte.slice(0, 220)}…` : texte);
  if (seulAvant && seulApres) return `avant ${court(seulAvant)} ; après ${court(seulApres)}`;
  if (seulAvant) return `constat perdu : ${court(seulAvant)}`;
  if (seulApres) return `constat gagné : ${court(seulApres)}`;
  return `nombre de constats ${avant.length} puis ${apres.length}`;
}

/** Pourquoi la relation ne s'applique pas à ce cas, ou `undefined`. */
export function raisonDIgnorer(cas: CasAccessibilite, relation: Relation, emis: readonly Constat[]): string | undefined {
  if (cas.risqueDeBoucle) return 'le contrôle ne finit pas sur ce cas';
  if (cas.sansRelation?.includes(relation)) return 'la transformation change légitimement le résultat';
  if (relation === 'ordre' && emis.some((constat) => constat.id === 'C49:borne')) return 'la borne coupe les derniers variants du relevé';
  return undefined;
}

/** Rejoue le cas transformé et compare à `emis`, ce que le cas a rendu tel quel. */
export function rejouerLaRelation(cas: CasAccessibilite, relation: Relation, emis: readonly Constat[], graine: number): ResultatDeRelation {
  const raison = raisonDIgnorer(cas, relation, emis);
  if (raison) return { cas: cas.id, relation, issue: 'ignore', detail: raison };
  try {
    const { composant } = cas.entree.materialiser();
    if (relation === 'ordre') melangerLOrdre(composant, graine, cas.id);
    else changerLaCasse(composant);
    const apres = controlerLAccessibilite(composant.releve, composant.catalogue, { niveau: cas.entree.niveau });
    const [avantFormes, apresFormes] = [formes(emis, relation), formes(apres, relation)];
    if (avantFormes.length === apresFormes.length && avantFormes.every((texte, rang) => texte === apresFormes[rang])) return { cas: cas.id, relation, issue: 'tenue' };
    return { cas: cas.id, relation, issue: 'ecart', detail: premiereDifference(avantFormes, apresFormes) };
  } catch (erreur) {
    return { cas: cas.id, relation, issue: 'exception', detail: messageDe(erreur) };
  }
}
