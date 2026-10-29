/**
 * Ce que l'onglet Corrections montre des constats : des cartes, une par règle
 * que plusieurs corrections partagent, rangées sous quatre intertitres. Le
 * calcul ne touche pas au DOM. Une carte réunit les corrections qui changent
 * le même segment (`info` devient `success`), qui lient un texte sans fond,
 * qui lient une taille de la même famille, ou que le constat range sous un
 * même modèle de variant ; les autres corrections ont chacune leur carte.
 *
 * Les noms de variables s'affichent sans le préfixe du composant
 * (`alert/colors/...` devient `colors/...`), comme la vue Composant les montre.
 */
import type { Constat, Correction } from '../../messages/commun';
import { TEXTES } from '../textes';
import { lieuDesVariants, pairesDuNom, type MorceauDeLieu, type PaireDeVariant } from '../composant/variants';

const T = TEXTES.correctionsDuComposant;

/** Du texte, un variant écrit comme Figma le nomme, un chemin dans une phrase, ou les puces des paires d'un lieu. */
export type Morceau = MorceauDeLieu | { readonly variant: string } | { readonly chemin: string };

export type SectionDeCorrections = 'liaisons' | 'tailles' | 'regles' | 'noms';

/** L'ordre des intertitres. */
export const SECTIONS: readonly SectionDeCorrections[] = ['liaisons', 'tailles', 'regles', 'noms'];

export interface LigneDeCarte {
  readonly id: string;
  /** Le constat qui propose la correction ; `null` pour une liaison que la préparation propose. */
  readonly constat: Constat | null;
  readonly correction: Correction;
  /** Le nom d'avant, sans préfixe du composant ; un texte comme « couleur en dur » quand rien n'était lié. */
  readonly avant: string;
  /** Les paires du variant de la ligne, pour une valeur en dur lue dans un seul variant ; vide sinon. Le diff les montre sous la valeur en dur. */
  readonly variant: readonly PaireDeVariant[];
  readonly apres: string;
  /** Les rangs de segment à marquer, de chaque côté. */
  readonly marquesAvant: readonly number[];
  readonly marquesApres: readonly number[];
}

/** Une liaison préparée dont la variable n'est pas dans la library publiée : le layer et le variant s'écrivent comme Figma les nomme. */
export interface LigneEnAttente {
  readonly variable: string;
  /** Le nom du layer, ou `null` quand la lecture du composant ne le connaît pas. */
  readonly layer: string | null;
  readonly variant: string | null;
}

/**
 * Une ligne d'une carte de tailles : un layer, les variants où il porte la même valeur en dur, et le token du composant qui la vaut.
 * La case de la ligne coche toutes ses corrections.
 */
export interface GroupeDeTaille {
  readonly cle: string;
  readonly layer: string;
  /** Le nombre de variants où le layer porte cette valeur. */
  readonly fois: number;
  readonly champ: string;
  /** La valeur lue en dur, en pixels ; `null` quand le constat ne la donne pas. */
  readonly valeur: number | null;
  /** Le token, sans préfixe du composant. */
  readonly apres: string;
  readonly collection: string | null;
  readonly valeurApres: number | null;
  readonly ids: readonly string[];
}

/** D'où vient une carte : des constats, d'un modèle de variant qu'on copie, ou des liaisons d'une préparation. */
export type OrigineDeCarte = 'constats' | 'modele' | 'preparation';

export interface CarteDeCorrections {
  readonly cle: string;
  readonly origine: OrigineDeCarte;
  readonly section: SectionDeCorrections;
  readonly jetons: readonly [string, string] | null;
  readonly phrase: readonly Morceau[];
  readonly meta: readonly Morceau[];
  readonly lignes: readonly LigneDeCarte[];
  /** Les layers que le clic sélectionne dans Figma. */
  readonly layers: readonly string[];
  /** Les constats de la carte : « Ne plus proposer » range leur proposition. */
  readonly constats: readonly Constat[];
  /** Ce que la carte ciblée relit : la propriété et la règle. */
  readonly faits: ReadonlyArray<{ readonly etiquette: string; readonly valeur: string }>;
  /** Les liaisons sans case, sous les lignes cochables ; vide hors d'une carte de préparation. */
  readonly attente: readonly LigneEnAttente[];
  /** Les lignes d'une carte de tailles, une par layer et par valeur ; absent hors d'une carte de tailles. */
  readonly groupes?: readonly GroupeDeTaille[];
}

export interface ContexteDeCartes {
  readonly composant: string;
  readonly variants: ReadonlyArray<{ readonly id: string; readonly nom: string }>;
  /** Le nom d'un layer par son identifiant, quand la vue Composant le connaît. */
  readonly layers: ReadonlyMap<string, string>;
  /** Le nom de la library de tokens choisie dans la Configuration, `null` quand aucune ne l'est. */
  readonly library?: string | null;
  /** Tous les constats visibles, pour compter les cas d'un modèle qui sont des questions. */
  readonly constats: readonly Constat[];
}

type Genre = 'modele' | 'regles' | 'nom' | 'tailles' | 'texte' | 'jetons' | 'lier';

const segments = (nom: string): string[] => nom.split('/');

function sansPrefixe(nom: string, composant: string): string {
  const prefixe = `${composant.toLowerCase()}/`;
  return nom.toLowerCase().startsWith(prefixe) ? nom.slice(prefixe.length) : nom;
}

const texte = (valeur: string | number | undefined): string | null => (typeof valeur === 'string' && valeur !== '' ? valeur : null);

/** Le segment seul qui change entre deux noms de même longueur, ou `null`. */
function segmentUnique(avant: string, apres: string): [number, string, string] | null {
  const a = segments(avant);
  const b = segments(apres);
  if (a.length !== b.length) return null;
  const rangs = a.flatMap((segment, rang) => (segment === b[rang] ? [] : [rang]));
  return rangs.length === 1 ? [rangs[0], a[rangs[0]], b[rangs[0]]] : null;
}

function genreDe(constat: Constat, correction: Correction, contexte: ContexteDeCartes): { cle: string; genre: Genre; section: SectionDeCorrections } {
  if (texte(constat.faits.modele) !== null) return { cle: `modele:${constat.faits.modele}`, genre: 'modele', section: 'liaisons' };
  if (correction.sorte === 'regles') return { cle: `regles:${correction.id}`, genre: 'regles', section: 'regles' };
  if (correction.sorte === 'nom-de-valeur') return { cle: `nom:${correction.cible.champ ?? ''}:${correction.avant ?? ''}:${correction.apres.nom}`, genre: 'nom', section: 'noms' };
  if (constat.code === 'C59') return { cle: `texte:${constat.code}`, genre: 'texte', section: 'liaisons' };
  if (constat.famille === 'tailles') return { cle: `tailles:${TEXTES.correctionsDuComposant.famille(correction.cible.champ ?? '')}`, genre: 'tailles', section: 'tailles' };
  const unique = correction.avant === null ? null : segmentUnique(sansPrefixe(correction.avant, contexte.composant), sansPrefixe(correction.apres.nom, contexte.composant));
  if (unique) return { cle: `jetons:${unique[1]}>${unique[2]}`, genre: 'jetons', section: 'liaisons' };
  return { cle: `lier:${constat.code}:${correction.apres.nom}`, genre: 'lier', section: 'liaisons' };
}

function ligneDe(constat: Constat, correction: Correction, contexte: ContexteDeCartes): LigneDeCarte {
  const apres = sansPrefixe(correction.apres.nom, contexte.composant);
  const apresSegments = segments(apres);
  if (correction.avant === null) {
    const variant = contexte.variants.find((candidat) => constat.variants.includes(candidat.id) || constat.variants.includes(candidat.nom));
    const paires = variant ? pairesDuNom(variant.nom) : [];
    const valeurs = new Set(paires.map(([, valeur]) => valeur.toLowerCase()));
    const ajout = texte(constat.faits.ajout);
    return {
      id: correction.id, constat, correction, avant: T.enDur(correction.cible.champ ?? ''), variant: constat.variants.length === 1 ? paires : [], apres,
      marquesAvant: [], marquesApres: apresSegments.flatMap((segment, rang) => (ajout === segment || (ajout === null && valeurs.has(segment.toLowerCase())) ? [rang] : [])),
    };
  }
  const avant = sansPrefixe(correction.avant, contexte.composant);
  const a = segments(avant);
  const rangs = a.length !== apresSegments.length ? a.map((_, rang) => rang) : a.flatMap((segment, rang) => (segment === apresSegments[rang] ? [] : [rang]));
  return { id: correction.id, constat, correction, avant, variant: [], apres, marquesAvant: rangs, marquesApres: a.length !== apresSegments.length ? apresSegments.map((_, rang) => rang) : rangs };
}

const uniques = <Type>(valeurs: readonly Type[]): Type[] => [...new Set(valeurs)];
const nombreOuNull = (valeur: unknown): number | null => (typeof valeur === 'number' ? valeur : null);

/** Les lignes d'une carte de tailles : les corrections d'un même layer, d'une même valeur et d'un même token font une ligne. */
function groupesDeTaille(lignes: readonly LigneDeCarte[], contexte: ContexteDeCartes): GroupeDeTaille[] {
  const groupes = new Map<string, { groupe: Omit<GroupeDeTaille, 'fois' | 'ids'>; variants: Set<string>; ids: string[] }>();
  for (const ligne of lignes) {
    const { correction, constat } = ligne;
    const layer = correction.cible.layer === undefined ? null : nomDuLayer(constat, correction.cible.layer, contexte);
    const valeur = nombreOuNull(correction.aRelire.valeur) ?? nombreOuNull(constat?.faits.valeur);
    const nom = layer ?? contexte.composant;
    const cle = `${nom}\u0000${valeur ?? ''}\u0000${ligne.apres}`;
    const entree = groupes.get(cle) ?? {
      groupe: { cle, layer: nom, champ: correction.cible.champ ?? '', valeur, apres: ligne.apres, collection: correction.apres.collection ?? null, valeurApres: nombreOuNull(correction.apres.valeur) },
      variants: new Set<string>(),
      ids: [],
    };
    for (const variant of constat?.variants ?? []) entree.variants.add(variant);
    entree.ids.push(ligne.id);
    groupes.set(cle, entree);
  }
  return [...groupes.values()].map(({ groupe, variants, ids }) => ({ ...groupe, fois: Math.max(variants.size, 1), ids }));
}

function nomDuLayer(constat: Constat | null, layer: string, contexte: ContexteDeCartes): string | null {
  return (constat !== null && constat.layers.length === 1 ? texte(constat.faits.calque) : null) ?? contexte.layers.get(layer) ?? null;
}

function carteDe(cle: string, genre: Genre, section: SectionDeCorrections, lignes: readonly LigneDeCarte[], contexte: ContexteDeCartes): CarteDeCorrections {
  const constats = uniques(lignes.flatMap((ligne) => (ligne.constat === null ? [] : [ligne.constat])));
  const nomsDeVariants = uniques(constats.flatMap((constat) => constat.variants.map((id) => contexte.variants.find((variant) => variant.id === id)?.nom ?? id)));
  const identifiantsDeLayers = uniques(lignes.map((ligne) => ligne.correction.cible.layer).filter((layer): layer is string => layer !== undefined));
  const noms = uniques(lignes.flatMap((ligne) => {
    const layer = ligne.correction.cible.layer;
    const nom = layer === undefined ? null : nomDuLayer(ligne.constat, layer, contexte);
    return nom === null ? [] : [nom];
  }));
  const variantsDeLaMeta: Morceau[] = lieuDesVariants(nomsDeVariants);
  const premiere = lignes[0];
  const faitsPremiers = premiere.constat?.faits ?? {};
  let phrase: readonly Morceau[] = [];
  let jetons: [string, string] | null = null;
  let meta: Morceau[] = [...variantsDeLaMeta, ', ', T.layers(noms, identifiantsDeLayers.length)];
  let groupes: GroupeDeTaille[] | undefined;

  if (genre === 'jetons') {
    const unique = segmentUnique(premiere.avant, premiere.apres);
    jetons = unique ? [unique[1], unique[2]] : null;
  } else if (genre === 'texte') {
    phrase = [T.lierLeTexte];
  } else if (genre === 'tailles') {
    groupes = groupesDeTaille(lignes, contexte);
    phrase = [T.lierLaTaille(T.famille(premiere.correction.cible.champ ?? ''), uniques(groupes.map((groupe) => groupe.layer)), contexte.composant)];
  } else if (genre === 'regles') {
    phrase = [T.creerLesRegles(contexte.composant)];
    meta = [T.reglesMeta(Number(faitsPremiers.regles ?? 0), texte(faitsPremiers.proprietes) ?? '')];
  } else if (genre === 'modele') {
    const modele = String(faitsPremiers.modele);
    const questions = contexte.constats.filter((constat) => constat.question !== undefined && constat.faits.modele === modele).length;
    phrase = [T.copier, { variant: modele }];
    meta = [T.copieMeta(nomsDeVariants.length, lignes.length, questions)];
  } else if (genre === 'nom') {
    phrase = [T.renommer, premiere.avant, T.en, premiere.apres];
    meta = [premiere.correction.cible.champ ?? ''];
  } else {
    phrase = [T.lier(noms[0] ?? 'le layer'), { chemin: premiere.apres }];
  }

  const proprietes = uniques(lignes.flatMap((ligne) => {
    const layer = ligne.correction.cible.layer;
    const nom = layer === undefined ? null : nomDuLayer(ligne.constat, layer, contexte);
    const champ = T.champDeFigma(ligne.correction.cible.champ ?? '');
    return ligne.correction.cible.champ === undefined ? [] : [nom === null ? champ : T.duLayer(champ, nom)];
  }));
  const regles = uniques(lignes.map((ligne) => ligne.correction.aRelire.regle).filter((regle) => regle !== ''));
  const faits = [
    ...(proprietes.length > 0 ? [{ etiquette: T.propriete, valeur: proprietes.join(', ') }] : []),
    ...(regles.length > 0 ? [{ etiquette: T.regle, valeur: regles.join(' ') }] : []),
  ];
  return { cle, section, jetons, phrase, meta, lignes, layers: genre === 'regles' ? [] : uniques(constats.flatMap((constat) => constat.layers)), constats, faits, origine: genre === 'modele' ? 'modele' : 'constats', attente: [], ...(groupes ? { groupes } : {}) };
}

/** Les cartes des corrections des constats, par intertitre puis dans l'ordre des constats. */
export function cartesDeCorrections(constats: readonly Constat[], contexte: ContexteDeCartes): CarteDeCorrections[] {
  const groupes = new Map<string, { genre: Genre; section: SectionDeCorrections; lignes: LigneDeCarte[] }>();
  for (const constat of constats) {
    const { correction } = constat;
    if (!correction) continue;
    const { cle, genre, section } = genreDe(constat, correction, contexte);
    const groupe = groupes.get(cle) ?? { genre, section, lignes: [] };
    groupe.lignes.push(ligneDe(constat, correction, contexte));
    groupes.set(cle, groupe);
  }
  const cartes = [...groupes].map(([cle, groupe]) => carteDe(cle, groupe.genre, groupe.section, groupe.lignes, contexte));
  return SECTIONS.flatMap((section) => cartes.filter((carte) => carte.section === section));
}
