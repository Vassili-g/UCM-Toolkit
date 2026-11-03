/**
 * Les deux relations métamorphiques de la version allégée de F5 et F6 (Rel-1 et Rel-2 du plan, section 5.2). Pour un cas, elles
 * rejouent les contrôles du cas sur un composant dont l'ordre des variants est mélangé, puis sur un composant dont le nom d'un axe
 * change d'écriture, et comparent les constats à ceux du composant d'origine.
 *
 * Rel-1 mélange l'ordre des variants du relevé (graine du cas). Rel-2 réécrit le nom de chaque propriété de variant dans une autre
 * écriture que `axeDePropriete` lit avec le même rôle (minuscules, majuscules, majuscules initiales) : dans les propriétés, les valeurs
 * des variants et les noms de variants. Un axe sans autre écriture reconnue reste tel quel ; sans aucun axe réécrit, Rel-2 ne
 * s'applique pas au cas.
 *
 * Les constats se comparent par code, clé de rattachement et variants nommés, ces deux derniers en minuscules et sans séparateur :
 * les noms d'axe et de variant changent avec l'écriture, pas ce qu'ils désignent.
 */
import type { Constat } from '../../../src/controles/index.js';
import { axeDePropriete, controlerNommageParEtapes } from '../../../src/controles/nommage.js';
import { controlerOublisParEtapes } from '../../../src/controles/oublis.js';
import { controlerLaTypographieParEtapes } from '../../../src/controles/typographie.js';
import { graineDe, melanger, mulberry32 } from '../commun/prng.js';
import type { CasDeVariants } from './cas.js';
import type { ComposantDeBase } from './portF3.js';
import { cleDeConstatDuHarnais, type CasMixte, type ControleDeStress } from './typo/operateursTexte.js';
import { estUneDefinition } from './typo/definitionsDIcone.js';

export type Relation = 'ordre' | 'nom-d-axe';
export const RELATIONS: readonly Relation[] = ['ordre', 'nom-d-axe'];

export const CONTROLES_PAR_DEFAUT: readonly ControleDeStress[] = ['nommage', 'oublis'];
export const controlesDuCas = (cas: CasDeVariants): readonly ControleDeStress[] => (cas as Partial<CasMixte>).controles ?? CONTROLES_PAR_DEFAUT;

/** Conduit un contrôle pas à pas et l'abandonne au-delà de la limite. */
export function conduire<T>(calcul: Generator<void, T>, limiteMs: number): { valeur: T } | { abandonne: true } {
  const fin = Date.now() + limiteMs;
  let pas = 0;
  let etape = calcul.next();
  while (!etape.done) {
    pas += 1;
    if ((pas & 1023) === 0 && Date.now() > fin) return { abandonne: true };
    etape = calcul.next();
  }
  return { valeur: etape.value };
}

/** Les constats des contrôles du cas, dans l'ordre des contrôles ; `abandonne` nomme le contrôle qui a dépassé la limite. */
export function executerLesControles(composant: Pick<ComposantDeBase, 'releve' | 'catalogue'>, controles: readonly ControleDeStress[], limiteMs: number): { constats: Constat[] } | { abandonne: string } {
  const debut = Date.now();
  const constats: Constat[] = [];
  for (const controle of controles) {
    const { releve, catalogue } = composant;
    const calcul = controle === 'nommage' ? controlerNommageParEtapes(releve, catalogue)
      : controle === 'oublis' ? controlerOublisParEtapes(releve, catalogue)
        : controlerLaTypographieParEtapes(releve, catalogue);
    const resultat = conduire(calcul, limiteMs - (Date.now() - debut));
    if ('abandonne' in resultat) return { abandonne: controle };
    constats.push(...resultat.valeur);
  }
  return { constats };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Transformations

/** L'autre écriture d'un nom d'axe que `axeDePropriete` lit avec le même rôle, ou `undefined`. */
export function autreEcritureDuNom(nom: string): string | undefined {
  const role = axeDePropriete(nom);
  if (!role) return undefined;
  const initiales = nom.replace(/(^|[ _-])(\p{L})/gu, (_, separateur: string, lettre: string) => separateur + lettre.toUpperCase());
  return [nom.toLowerCase(), nom.toUpperCase(), initiales].find((candidat) => candidat !== nom && axeDePropriete(candidat) === role);
}

/** Réécrit en place le nom de chaque propriété de variant du composant ; rend les noms changés, de l'ancien au nouveau. */
export function reecrireLesNomsDAxe(composant: Pick<ComposantDeBase, 'releve'>): Map<string, string> {
  const { releve } = composant;
  const changes = new Map<string, string>();
  for (const propriete of releve.proprietes) {
    if (propriete.type !== 'VARIANT') continue;
    const autre = autreEcritureDuNom(propriete.nom);
    if (autre) changes.set(propriete.nom, autre);
  }
  if (changes.size === 0) return changes;
  const renommer = (valeurs: Record<string, string>): Record<string, string> => Object.fromEntries(Object.entries(valeurs).map(([axe, valeur]) => [changes.get(axe) ?? axe, valeur]));
  const renommerLeNom = (nom: string): string => nom.split(', ').map((partie) => {
    const [axe, ...reste] = partie.split('=');
    return reste.length > 0 && changes.has(axe) ? `${changes.get(axe)}=${reste.join('=')}` : partie;
  }).join(', ');
  for (const propriete of releve.proprietes) propriete.nom = changes.get(propriete.nom) ?? propriete.nom;
  for (const variant of releve.variants) {
    variant.valeurs = renommer(variant.valeurs);
    variant.nom = renommerLeNom(variant.nom);
  }
  for (const wrapper of releve.wrappers ?? []) {
    for (const propriete of wrapper.proprietes) propriete.nom = changes.get(propriete.nom) ?? propriete.nom;
    for (const variant of wrapper.variants) { variant.valeurs = renommer(variant.valeurs); variant.nom = renommerLeNom(variant.nom); }
  }
  return changes;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Comparaison

const normaliser = (texte: string): string => texte.toLowerCase().replace(/[\s_-]+/g, '');

function cleNormalisee(constat: Constat): string {
  return `${constat.code}|${normaliser(cleDeConstatDuHarnais(constat))}|${constat.variants.map(normaliser).sort().join(';')}`;
}

function differences(origine: readonly Constat[], autre: readonly Constat[]): string[] {
  const compter = (constats: readonly Constat[]): Map<string, number> => {
    const comptes = new Map<string, number>();
    for (const constat of constats) comptes.set(cleNormalisee(constat), (comptes.get(cleNormalisee(constat)) ?? 0) + 1);
    return comptes;
  };
  const avant = compter(origine);
  const apres = compter(autre);
  const messages: string[] = [];
  for (const [cle, nombre] of avant) if ((apres.get(cle) ?? 0) < nombre) messages.push(`perdu ${cle}`);
  for (const [cle, nombre] of apres) if ((avant.get(cle) ?? 0) < nombre) messages.push(`ajouté ${cle}`);
  return messages;
}

const resume = (messages: readonly string[]): string => `${messages.slice(0, 3).join(' ; ')}${messages.length > 3 ? ` (+${messages.length - 3})` : ''}`;

export interface EcartDeRelation {
  readonly cas: string;
  readonly operateur: string;
  readonly relation: Relation;
  readonly detail: string;
}

export interface ResultatDesRelations {
  readonly applicables: Readonly<Record<Relation, boolean>>;
  readonly ecarts: readonly EcartDeRelation[];
  /** Un contrôle a levé ou dépassé sa limite sur le cas transformé : la relation n'a pas été jugée. */
  readonly exceptions: readonly string[];
}

const NON_APPLICABLE: ResultatDesRelations = { applicables: { ordre: false, 'nom-d-axe': false }, ecarts: [], exceptions: [] };

/**
 * Rejoue les contrôles du cas sur un composant dont les variants sont mélangés, puis sur un composant dont les noms d'axe changent
 * d'écriture. `origine` est ce que les contrôles ont rendu sur le composant du cas ; `limiteMs` borne chaque rejeu.
 */
export function verifierLesRelations(cas: CasDeVariants, origine: readonly Constat[], graine: number, limiteMs: number): ResultatDesRelations {
  if (estUneDefinition(cas) || !cas.entree.materialiser) return NON_APPLICABLE;
  const controles = controlesDuCas(cas);
  const ecarts: EcartDeRelation[] = [];
  const exceptions: string[] = [];
  const noter = (relation: Relation, detail: string): void => { ecarts.push({ cas: cas.id, operateur: cas.operateur, relation, detail }); };
  const rejouer = (relation: Relation, transformer: (composant: ComposantDeBase) => boolean): boolean => {
    try {
      const { composant } = cas.entree.materialiser!();
      if (!transformer(composant)) return false;
      const rendu = executerLesControles(composant, controles, limiteMs);
      if ('abandonne' in rendu) { exceptions.push(`${relation} : ${rendu.abandonne} abandonné après ${limiteMs} ms`); return true; }
      const differents = differences(origine, rendu.constats);
      if (differents.length > 0) noter(relation, resume(differents));
      return true;
    } catch (erreur) {
      exceptions.push(`${relation} : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
      return true;
    }
  };
  const ordre = rejouer('ordre', (composant) => {
    composant.releve.variants = melanger(mulberry32(graineDe(graine, `${cas.id}:ordre`)), composant.releve.variants);
    return composant.releve.variants.length > 1;
  });
  const nomDAxe = rejouer('nom-d-axe', (composant) => reecrireLesNomsDAxe(composant).size > 0);
  return { applicables: { ordre, 'nom-d-axe': nomDAxe }, ecarts, exceptions };
}
