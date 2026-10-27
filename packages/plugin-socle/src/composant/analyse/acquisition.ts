/**
 * Acquisition de trois familles de propriétés de nœud : la géométrie et la mise
 * en page scalaires (`layoutMode`, espacements, rayons, épaisseurs de contour),
 * les peintures (`fills`, `strokes`) et les segments de texte
 * (`getStyledTextSegments`). Un copieur lit un nœud côté Figma et rend des états
 * de `faits.ts` ; le relevé d'Architect et le moteur en tirent chacun leur
 * projection.
 *
 * Un champ se lit une fois, au moment où l'appelant le demande : le copieur
 * ne lit jamais un champ qu'on ne lui a pas nommé, car un nœud n'expose que
 * les champs de son type et chaque lecture nue se compte.
 *
 * Le nœud est un objet quelconque, sans type Figma. Aucun champ de cette
 * famille ne porte d'objet indexé par un nom du designer : la copie n'a pas à
 * se défendre de `__proto__`.
 */
import { MIXTE, acquis, refuse, type Acquis, type AliasDeVariable, type ArretDeDegradeLu, type ChampDeSegment, type ChampsDeNoeud, type CouleurLue, type EtatEcrit, type PeintureLue, type Refuse, type TableDesChamps } from './faits';

export const CHAMPS_DE_MISE_EN_PAGE = [
  'layoutMode',
  'layoutWrap',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'counterAxisSpacing',
  'itemSpacing',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'strokeWeight',
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
] as const satisfies readonly (keyof ChampsDeNoeud)[];

export type ChampDeMiseEnPage = (typeof CHAMPS_DE_MISE_EN_PAGE)[number];
export type ChampsDeMiseEnPage = Pick<ChampsDeNoeud, ChampDeMiseEnPage>;
export type ValeurScalaire = string | number | boolean | null;

const CHAMPS_TEXTE: ReadonlySet<string> = new Set<ChampDeMiseEnPage>(['layoutMode', 'layoutWrap', 'primaryAxisAlignItems', 'counterAxisAlignItems']);
/** `counterAxisSpacing` vaut `null` sous un espacement automatique. */
const CHAMPS_NULLABLES: ReadonlySet<string> = new Set<ChampDeMiseEnPage>(['counterAxisSpacing']);

const messageDErreur = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/** Ce qui lit `noeud[champ]` : l'accès natif, ou la mémoire de champs de la demande qui le rend une fois par nœud et champ. */
export type LecteurDeChamp = <T = unknown>(noeud: object, champ: string) => T;

/** L'accès natif, pour une lecture qui n'a pas de mémoire. */
export const lectureNative: LecteurDeChamp = <T = unknown>(noeud: object, champ: string): T => (noeud as Record<string, T>)[champ];

/**
 * Lit un champ scalaire (chaîne, nombre, booléen ou `null`) du nœud, une seule fois.
 * `undefined` : le type de nœud n'expose pas le champ (`absent`). Une lecture
 * qui lève est refusée (`leve`). Le symbole `figma.mixed` et toute forme qui
 * n'est ni chaîne, ni nombre, ni booléen, ni `null` sont mixtes. `lue` est appelé avant
 * l'accès natif, pour que l'appelant compte ses lectures. `lire` remplace l'accès natif
 * (la lecture mémorisée de la portée d'analyse) ; il lève comme lui.
 */
export function lireUnChamp(
  noeud: object,
  champ: string,
  lue?: () => void,
  lire: LecteurDeChamp = lectureNative,
): EtatEcrit<ValeurScalaire> {
  lue?.();
  let valeur: unknown;
  try {
    valeur = lire(noeud, champ);
  } catch (erreur) {
    return refuse('leve', messageDErreur(erreur));
  }
  if (valeur === undefined) return refuse('absent');
  if (valeur === null || typeof valeur === 'string' || typeof valeur === 'number' || typeof valeur === 'boolean') return acquis(valeur);
  return MIXTE;
}

/**
 * Copie les champs nommés, dans l'ordre donné, une lecture chacun. Un champ de
 * texte qui rend un nombre, un champ numérique qui rend une chaîne et un
 * `null` hors `counterAxisSpacing` sont mixtes : la forme n'est pas celle que
 * `ChampsDeNoeud` annonce.
 */
export function copierLaMiseEnPage<K extends ChampDeMiseEnPage>(noeud: object, champs: readonly K[], lue?: () => void, lire?: LecteurDeChamp): TableDesChamps<Pick<ChampsDeMiseEnPage, K>> {
  const table: { [C in K]?: EtatEcrit<ChampsDeMiseEnPage[C]> } = {};
  for (const champ of champs) {
    const lu = lireUnChamp(noeud, champ, lue, lire);
    const attendu = CHAMPS_TEXTE.has(champ) ? 'string' : 'number';
    const bonneForme = lu.etat !== 'acquis' || (lu.valeur === null ? CHAMPS_NULLABLES.has(champ) : typeof lu.valeur === attendu);
    table[champ] = (bonneForme ? lu : MIXTE) as EtatEcrit<ChampsDeMiseEnPage[K]>;
  }
  return table;
}

export type ChampDePeinture = 'fills' | 'strokes';

/** Ce que le relevé donne à une copie pour céder la main : le budget de calcul d'`ContexteCooperatif`, sans l'importer. */
export interface Cession {
  cederSiBesoin(): Promise<void> | void;
}

const estUnObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null;

/** Le premier alias valide d'une liaison de peinture, qui se lit en alias seul ou en liste. */
function premierAlias(liaison: unknown): AliasDeVariable | undefined {
  for (const candidat of Array.isArray(liaison) ? liaison : [liaison]) {
    if (estUnObjet(candidat) && candidat.type === 'VARIABLE_ALIAS' && typeof candidat.id === 'string') return { type: 'VARIABLE_ALIAS', id: candidat.id };
  }
  return undefined;
}

/** L'alias que `boundVariables.color` porte, ou `undefined`. `boundVariables` se lit une fois. */
function aliasDeLaCouleur(brute: Record<string, unknown>): AliasDeVariable | undefined {
  const liees = brute.boundVariables;
  return estUnObjet(liees) ? premierAlias(liees.color) : undefined;
}

/** `r`, `g` et `b` tels que Figma les rend ; `a` seulement quand c'est un nombre. */
function copierLaCouleur(couleur: Record<string, unknown>): CouleurLue {
  const { r, g, b, a } = couleur as { r: number; g: number; b: number; a?: unknown };
  return typeof a === 'number' ? { r, g, b, a } : { r, g, b };
}

/** Un arrêt de dégradé, ou `null` quand sa forme n'est pas celle de Figma. */
function copierUnArret(arret: unknown): ArretDeDegradeLu | null {
  if (!estUnObjet(arret) || !estUnObjet(arret.color)) return null;
  const alias = aliasDeLaCouleur(arret);
  return { position: arret.position as number, color: copierLaCouleur(arret.color), ...(alias ? { boundVariables: { color: alias } } : {}) };
}

/** Une peinture, ou `null` quand sa forme n'est pas celle de Figma ; cède la main après chaque arrêt de dégradé. Une clé que la peinture n'a pas reste absente. */
function* copierUnePeinture(brute: unknown): Generator<void, PeintureLue | null> {
  if (!estUnObjet(brute)) return null;
  const type = brute.type;
  const alias = aliasDeLaCouleur(brute);
  let arrets: ArretDeDegradeLu[] | undefined;
  if (Array.isArray(brute.gradientStops)) {
    arrets = [];
    for (const arret of brute.gradientStops) {
      const copie = copierUnArret(arret);
      if (!copie) return null;
      arrets.push(copie);
      yield;
    }
  }
  return {
    type: String(type),
    ...(typeof brute.visible === 'boolean' ? { visible: brute.visible } : {}),
    ...(typeof brute.opacity === 'number' ? { opacity: brute.opacity } : {}),
    ...(typeof brute.blendMode === 'string' ? { blendMode: brute.blendMode } : {}),
    ...(type === 'SOLID' && estUnObjet(brute.color) ? { color: copierLaCouleur(brute.color) } : {}),
    ...(alias ? { boundVariables: { color: alias } } : {}),
    ...(arrets ? { gradientStops: arrets } : {}),
  };
}

function* copierParEtapes(valeur: unknown): Generator<void, EtatEcrit<readonly PeintureLue[]>> {
  if (valeur === undefined) return refuse('absent');
  if (!Array.isArray(valeur)) return MIXTE;
  const peintures: PeintureLue[] = [];
  for (const brute of valeur) {
    const copie = yield* copierUnePeinture(brute);
    if (!copie) return MIXTE;
    peintures.push(copie);
    yield;
  }
  return acquis(peintures);
}

/**
 * Copie la valeur d'un champ de peintures déjà lue : le type, `visible`, `opacity`, `blendMode`, la couleur des SOLID,
 * l'alias de `boundVariables.color` (le premier, Figma n'en donne qu'un par peinture) et les arrêts de dégradé avec leur
 * alias. `undefined` : le nœud n'expose pas le champ (`absent`). Une valeur qui n'est pas une liste, dont `figma.mixed`,
 * et une liste qui porte une entrée d'une autre forme que celle de Figma sont mixtes.
 */
export function copierLesPeintures(valeur: unknown): EtatEcrit<readonly PeintureLue[]> {
  const copie = copierParEtapes(valeur);
  for (let etape = copie.next(); ; etape = copie.next()) if (etape.done) return etape.value;
}

/** Même copie que `copierLesPeintures`, qui cède la main après chaque peinture et chaque arrêt : une liste de peintures n'a pas de borne. */
export async function copierLesPeinturesParEtapes(valeur: unknown, cession: Cession): Promise<EtatEcrit<readonly PeintureLue[]>> {
  const copie = copierParEtapes(valeur);
  for (let etape = copie.next(); ; etape = copie.next()) {
    if (etape.done) return etape.value;
    await cession.cederSiBesoin();
  }
}

/** Lit `fills` ou `strokes` du nœud, une seule fois. Une lecture qui lève est refusée (`leve`). `lue` est appelé avant l'accès natif ; `lire` remplace cet accès. */
function lireLeChamp(noeud: object, champ: ChampDePeinture, lue?: () => void, lire: LecteurDeChamp = lectureNative): { valeur: unknown } | Refuse<'leve'> {
  lue?.();
  try {
    return { valeur: lire(noeud, champ) };
  } catch (erreur) {
    return refuse('leve', messageDErreur(erreur));
  }
}

/** Lit `fills` ou `strokes` du nœud, une seule fois, et le copie. */
export function lireLesPeintures(noeud: object, champ: ChampDePeinture, lue?: () => void, lire?: LecteurDeChamp): EtatEcrit<readonly PeintureLue[]> {
  const lu = lireLeChamp(noeud, champ, lue, lire);
  return 'etat' in lu ? lu : copierLesPeintures(lu.valeur);
}

/** Même lecture que `lireLesPeintures`, avec la copie qui cède la main. */
export async function lireLesPeinturesParEtapes(noeud: object, champ: ChampDePeinture, cession: Cession, lue?: () => void, lire?: LecteurDeChamp): Promise<EtatEcrit<readonly PeintureLue[]>> {
  const lu = lireLeChamp(noeud, champ, lue, lire);
  return 'etat' in lu ? lu : copierLesPeinturesParEtapes(lu.valeur, cession);
}

/**
 * Une plage de `getStyledTextSegments` telle que Figma la rend : `debut` et `fin` (exclue), et la valeur lue de chaque
 * champ demandé, sans copie. La copie d'une peinture (`PeintureLue`) perd `gradientTransform` et `imageHash` : deux
 * plages que Figma garde séparées pour cela se confondraient dans une copie, d'où la comparaison sur la valeur lue.
 */
export interface PlageLue {
  readonly debut: number;
  readonly fin: number;
  readonly valeurs: { readonly [C in ChampDeSegment]?: unknown };
}

/** Le refus porte sur l'appel entier : `absent` quand la méthode manque, `leve` quand l'appel ou la lecture d'une plage lève. */
export type EtatDesSegments = Acquis<readonly PlageLue[]> | Refuse<'leve' | 'absent'>;

/**
 * Appelle `getStyledTextSegments(champs)` une seule fois et rend ses plages, dans l'ordre de Figma, en cédant la main
 * après chaque plage. `champs` garde son ordre : c'est celui de l'appel natif.
 *
 * Une liste absente (`undefined` ou `null`) vaut un texte sans plage. Une valeur qui n'est pas une liste d'objets est
 * refusée (`leve`). Une plage dont `start` ou `end` n'est pas un nombre garde la valeur lue : elle ne fusionne jamais.
 */
export function* lireLesSegmentsParEtapes(noeud: object, champs: readonly ChampDeSegment[]): Generator<undefined, EtatDesSegments> {
  const plages: PlageLue[] = [];
  try {
    const lire = (noeud as { getStyledTextSegments?: unknown }).getStyledTextSegments;
    if (typeof lire !== 'function') return refuse('absent');
    const brutes: unknown = lire.call(noeud, [...champs]);
    if (brutes === undefined || brutes === null) return acquis(plages);
    if (!Array.isArray(brutes)) return refuse('leve', 'liste de segments attendue');
    for (const brute of brutes) {
      if (!estUnObjet(brute)) return refuse('leve', 'segment illisible');
      const valeurs: { [C in ChampDeSegment]?: unknown } = {};
      for (const champ of champs) valeurs[champ] = brute[champ];
      plages.push({ debut: brute.start as number, fin: brute.end as number, valeurs });
      yield;
    }
  } catch (erreur) {
    return refuse('leve', messageDErreur(erreur));
  }
  return acquis(plages);
}

/** Même lecture que `lireLesSegmentsParEtapes`, sans céder la main. */
export function lireLesSegments(noeud: object, champs: readonly ChampDeSegment[]): EtatDesSegments {
  const lecture = lireLesSegmentsParEtapes(noeud, champs);
  for (let etape = lecture.next(); ; etape = lecture.next()) if (etape.done) return etape.value;
}

/** Même lecture que `lireLesSegmentsParEtapes`, qui cède la main par `cession` : un texte n'a pas de borne de plages. */
export async function lireLesSegmentsCooperatif(noeud: object, champs: readonly ChampDeSegment[], cession: Cession): Promise<EtatDesSegments> {
  const lecture = lireLesSegmentsParEtapes(noeud, champs);
  for (let etape = lecture.next(); ; etape = lecture.next()) {
    if (etape.done) return etape.value;
    await cession.cederSiBesoin();
  }
}

/**
 * Égalité profonde de deux valeurs lues : primitives par `===` (`NaN` égal à `NaN`), listes élément par élément,
 * objets par leurs clés, quel que soit leur ordre. Une clé sans valeur vaut une clé absente.
 */
export function egalesEnProfondeur(a: unknown, b: unknown): boolean {
  if (a === b || (a !== a && b !== b)) return true;
  if (!estUnObjet(a) || !estUnObjet(b) || Array.isArray(a) !== Array.isArray(b)) return false;
  const clesDeA = Object.keys(a).filter((cle) => a[cle] !== undefined);
  const clesDeB = Object.keys(b).filter((cle) => b[cle] !== undefined);
  return clesDeA.length === clesDeB.length && clesDeA.every((cle) => egalesEnProfondeur(a[cle], b[cle]));
}

/**
 * Projette des plages lues pour un jeu de champs sur un sous-ensemble `champs`, et fusionne les plages voisines dont les
 * valeurs projetées sont égales (`egalesEnProfondeur`) : le résultat est ce que `getStyledTextSegments(champs)` rend,
 * puisque Figma coupe le texte dès qu'un des champs demandés change. Chaque champ de `champs` doit avoir été demandé
 * dans la lecture des plages. Deux plages sont voisines quand `fin` de la première vaut `debut` de la seconde, tous deux
 * des nombres ; la plage fusionnée garde les valeurs de la première. Cède la main après chaque plage.
 */
export function* projeterLesPlagesParEtapes(plages: readonly PlageLue[], champs: readonly ChampDeSegment[]): Generator<undefined, PlageLue[]> {
  const projetees: PlageLue[] = [];
  for (const plage of plages) {
    const valeurs: { [C in ChampDeSegment]?: unknown } = {};
    for (const champ of champs) valeurs[champ] = plage.valeurs[champ];
    const derniere = projetees[projetees.length - 1];
    const voisines = derniere !== undefined && typeof derniere.fin === 'number' && typeof plage.debut === 'number' && derniere.fin === plage.debut;
    if (voisines && champs.every((champ) => egalesEnProfondeur(derniere.valeurs[champ], valeurs[champ]))) {
      projetees[projetees.length - 1] = { debut: derniere.debut, fin: plage.fin, valeurs: derniere.valeurs };
    } else {
      projetees.push({ debut: plage.debut, fin: plage.fin, valeurs });
    }
    yield;
  }
  return projetees;
}

/** Même projection que `projeterLesPlagesParEtapes`, sans céder la main. */
export function projeterLesPlages(plages: readonly PlageLue[], champs: readonly ChampDeSegment[]): PlageLue[] {
  const projection = projeterLesPlagesParEtapes(plages, champs);
  for (let etape = projection.next(); ; etape = projection.next()) if (etape.done) return etape.value;
}
