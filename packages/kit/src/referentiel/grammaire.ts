/**
 * La grammaire des chemins de l'architecture UCM : un chemin de variable, segment par segment, contre `FORMES_DES_CHEMINS`.
 * Elle décrit le profil UCM. Une destination libre, un groupe personnalisé ou une palette aux crans libres sortent de son champ (voir `porteeDeLaGrammaire`).
 */
import {
  DESTINATION_DES_PALETTES, FORMES_DES_CHEMINS,
  REGISTRE_MESURES_LAYOUT,
  type Collection, type ContexteDuChemin, type FormeDeChemin, type IdentifiantDeForme, type PositionDeChemin, type RoleDeSegment,
} from './architecture.js';
import { formeReconnue, termeReconnu } from './reconnaissance.js';

export interface SegmentReconnu {
  /** Le segment tel qu'il est écrit. */
  readonly segment: string;
  readonly role: RoleDeSegment;
  /** L'identifiant du registre de la position. */
  readonly registre: string;
  /** L'identifiant du terme que `termeReconnu` trouve ; absent pour un nom extensible ou une mesure numérique hors registre. */
  readonly terme?: string;
}

export type RefusDuChemin =
  | { readonly raison: 'segment-mal-forme'; readonly rang: number }
  | { readonly raison: 'hors-contexte'; readonly forme: IdentifiantDeForme }
  | { readonly raison: 'aucune-forme'; readonly forme?: IdentifiantDeForme; readonly rang?: number; readonly role?: RoleDeSegment }
  | { readonly raison: 'ambigu'; readonly lectures: readonly { readonly forme: IdentifiantDeForme; readonly segments: readonly SegmentReconnu[] }[] };

export type CheminReconnu =
  | { readonly conforme: true; readonly forme: IdentifiantDeForme; readonly segments: readonly SegmentReconnu[] }
  | ({ readonly conforme: false } & RefusDuChemin);

/** Un segment écrit sans espace autour, sans `/` ni `.`, et non vide. */
function segmentBienForme(segment: string): boolean {
  return segment !== '' && segment.trim() === segment && !/[/.]/.test(segment);
}

/** Reconnaît un segment à une position : `exclues`, puis `valeurs`, puis le registre ou son extensibilité. */
function segmentALaPosition(position: PositionDeChemin, segment: string, contexte?: ContexteDuChemin): SegmentReconnu | undefined {
  const forme = formeReconnue(segment);
  if (position.exclues?.some((exclue) => formeReconnue(exclue) === forme)) return undefined;
  if (position.valeurs && !position.valeurs.some((valeur) => formeReconnue(valeur) === forme)) return undefined;
  const terme = termeReconnu(position.registre, segment);
  const valeursDeLAxe = position.role === 'palette' || position.role === 'style' || position.role === 'taille' || position.role === 'etat'
    ? contexte?.axes?.[position.role] : undefined;
  const dansLAxe = valeursDeLAxe?.some((valeur) => formeReconnue(valeur) === forme) ?? false;
  if (contexte?.axes && position.role === 'style' && valeursDeLAxe && !dansLAxe) return undefined;
  if (contexte && (position.role === 'palette' || position.role === 'taille' || position.role === 'etat') && !terme && !dansLAxe) return undefined;
  if (position.role === 'role' && !terme) return undefined;
  const mesure = position.registre === REGISTRE_MESURES_LAYOUT && /^\d+(?:,\d+)?$/.test(segment);
  if (!position.valeurs && !terme && !position.registre.extensible && !mesure && !dansLAxe) return undefined;
  return { segment, role: position.role, registre: position.registre.id, ...(terme ? { terme: terme.id } : {}) };
}

interface LectureDuComposant {
  readonly forme: IdentifiantDeForme;
  readonly segments: readonly SegmentReconnu[];
  readonly positions: readonly number[];
  readonly score: number;
}

function lecturesDuComposant(forme: FormeDeChemin, segments: readonly string[], contexte: ContexteDuChemin): LectureDuComposant[] {
  const lectures: LectureDuComposant[] = [];
  function parcourir(rang: number, segment: number, reconnus: SegmentReconnu[], positions: number[], score: number): void {
    if (rang === forme.positions.length) {
      if (segment === segments.length) lectures.push({ forme: forme.id, segments: reconnus, positions, score });
      return;
    }
    const position = forme.positions[rang];
    if (position.facultative) parcourir(rang + 1, segment, reconnus, positions, score);
    if (segment >= segments.length) return;
    const reconnu = segmentALaPosition(position, segments[segment], contexte);
    if (!reconnu) return;
    const axe = position.role === 'palette' || position.role === 'style' || position.role === 'taille' || position.role === 'etat'
      ? contexte.axes?.[position.role] : undefined;
    const connuParLAxe = axe?.some((valeur) => formeReconnue(valeur) === formeReconnue(segments[segment])) ?? false;
    parcourir(rang + 1, segment + 1, [...reconnus, reconnu], [...positions, rang], score + (reconnu.terme || connuParLAxe ? 1 : 0));
  }
  parcourir(0, 0, [], [], 0);
  return lectures;
}

function comparerLectures(gauche: LectureDuComposant, droite: LectureDuComposant): number {
  if (gauche.score !== droite.score) return droite.score - gauche.score;
  if (gauche.positions.length !== droite.positions.length) return droite.positions.length - gauche.positions.length;
  for (let rang = 0; rang < gauche.positions.length; rang++) {
    if (gauche.positions[rang] !== droite.positions[rang]) return gauche.positions[rang] - droite.positions[rang];
  }
  return 0;
}

/** Le nombre de segments reconnus avant le premier refus d'une forme de même longueur que le chemin. */
function debutReconnu(forme: FormeDeChemin, segments: readonly string[]): number {
  const rang = forme.positions.findIndex((position, i) => !segmentALaPosition(position, segments[i]));
  return rang < 0 ? forme.positions.length : rang;
}

function reconnuePar(forme: FormeDeChemin, segments: readonly string[]): SegmentReconnu[] | undefined {
  if (forme.positions.length !== segments.length) return undefined;
  const reconnus: SegmentReconnu[] = [];
  for (const [rang, position] of forme.positions.entries()) {
    const reconnu = segmentALaPosition(position, segments[rang]);
    if (!reconnu) return undefined;
    reconnus.push(reconnu);
  }
  return reconnus;
}

const duContexte = (forme: FormeDeChemin, contexte: ContexteDuChemin): boolean => forme.themes === undefined || forme.themes === contexte.themes;

/** Les formes du contexte qui reconnaissent les segments, dans l'ordre de `FORMES_DES_CHEMINS`. */
export function formesReconnues(collection: Collection, segments: readonly string[], contexte: ContexteDuChemin): IdentifiantDeForme[] {
  if (!segments.every(segmentBienForme)) return [];
  if (collection === 'components') return FORMES_DES_CHEMINS.components.filter((forme) => lecturesDuComposant(forme, segments, contexte).length > 0).map((forme) => forme.id);
  return FORMES_DES_CHEMINS[collection].filter((forme) => duContexte(forme, contexte) && reconnuePar(forme, segments)).map((forme) => forme.id);
}

/**
 * Reconnaît des segments sans préfixe de collection, dans le contexte des thèmes de la collection.
 * Pour les composants, plusieurs lectures aussi probantes rendent `ambigu`. Pour les autres collections, la première forme du contexte l'emporte.
 * Sinon, une forme de l'autre contexte donne `hors-contexte` ;
 * à défaut, `aucune-forme` désigne la forme de même longueur qui va le plus loin, le premier rang refusé et son rôle.
 */
export function reconnaitreLeChemin(collection: Collection, segments: readonly string[], contexte: ContexteDuChemin): CheminReconnu {
  const malForme = segments.findIndex((segment) => !segmentBienForme(segment));
  if (malForme >= 0) return { conforme: false, raison: 'segment-mal-forme', rang: malForme };
  if (collection === 'components') {
    const lectures = FORMES_DES_CHEMINS.components.flatMap((forme) => lecturesDuComposant(forme, segments, contexte)).sort(comparerLectures);
    if (!lectures.length) return { conforme: false, raison: 'aucune-forme' };
    const meilleures = lectures.filter((lecture) => lecture.score === lectures[0].score && lecture.positions.length === lectures[0].positions.length);
    if (meilleures.length > 1) return { conforme: false, raison: 'ambigu', lectures: meilleures.map(({ forme, segments }) => ({ forme, segments })) };
    return { conforme: true, forme: lectures[0].forme, segments: lectures[0].segments };
  }
  const formes = FORMES_DES_CHEMINS[collection];
  for (const forme of formes) {
    if (!duContexte(forme, contexte)) continue;
    const reconnus = reconnuePar(forme, segments);
    if (reconnus) return { conforme: true, forme: forme.id, segments: reconnus };
  }
  const ailleurs = formes.find((forme) => !duContexte(forme, contexte) && reconnuePar(forme, segments));
  if (ailleurs) return { conforme: false, raison: 'hors-contexte', forme: ailleurs.id };
  let proche: { readonly forme: FormeDeChemin; readonly debut: number } | undefined;
  for (const forme of formes) {
    if (!duContexte(forme, contexte) || forme.positions.length !== segments.length) continue;
    const debut = debutReconnu(forme, segments);
    if (!proche || debut > proche.debut) proche = { forme, debut };
  }
  if (!proche) return { conforme: false, raison: 'aucune-forme' };
  return { conforme: false, raison: 'aucune-forme', forme: proche.forme.id, rang: proche.debut, role: proche.forme.positions[proche.debut].role };
}

/** La reconnaissance dans le contexte de la destination de référence : les thèmes dans le chemin. */
export function cheminConforme(collection: Collection, segments: readonly string[]): boolean {
  return reconnaitreLeChemin(collection, segments, { themes: DESTINATION_DES_PALETTES.themes }).conforme;
}
