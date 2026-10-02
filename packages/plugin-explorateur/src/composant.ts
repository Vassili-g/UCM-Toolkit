/**
 * Le modèle de la vue composant : ce que le sandbox a lu d'un composant, et
 * les lignes que la vue en tire. Une ligne représente un token dans une
 * chaîne de modes, ou un style de texte, quel que soit le nombre de calques
 * qui le portent.
 *
 * Le modèle ne lit ni `figma` ni le DOM. Il ne résout rien par lui-même : il
 * appelle `resoudre` avec les modes du calque qui porte la liaison. Une
 * nature et un libellé sont des identifiants ; leurs mots sont dans
 * `src/ui/textes.ts`.
 */
import type { Index } from './indexation';
import { texteDeValeur, valeursEgales, type Releve, type TypeDeVariable, type ValeurSource, type ValeurTerminale } from './modele';
import { resoudre, type ModeDeCalque, type Resultat } from './resolution';

/** Le nombre de lignes au-delà duquel chaque section s'ouvre repliée. */
export const SEUIL_DE_REPLI = 12;

/** Les natures, dans l'ordre des sections. */
export const NATURES = ['couleur', 'forme', 'espacement', 'taille', 'texte', 'autre'] as const;

export type Nature = (typeof NATURES)[number];

/** La boîte d'un calque dans le repère de la page, telle que Figma la donne. */
export interface BoiteDeCalque {
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly hauteur: number;
}

export interface CalqueDuComposant {
  readonly id: string;
  readonly nom: string;
  readonly type: string;
  /** `null` pour la racine. Un parent précède ses enfants dans la liste. */
  readonly parent: string | null;
  readonly modes: Readonly<Record<string, ModeDeCalque>>;
  /** Une instance imbriquée : la vue la nomme et ne lit pas ses calques. */
  readonly frontiere?: { readonly composant: string };
  readonly boite?: BoiteDeCalque;
}

export interface LiaisonDuComposant {
  readonly calque: string;
  /** Le chemin de `liaisonsDuNoeud` : `fills[0]`, `texte[0–5].fontSize`. */
  readonly propriete: string;
  readonly variable: string;
  /** Ce que `resolveForConsumer` rend sur le calque ; absent quand il lève. */
  readonly valeurDeFigma?: ValeurSource;
}

export interface StyleDeTexte {
  readonly id: string;
  readonly nom: string;
  readonly liaisons: ReadonlyArray<{ readonly champ: string; readonly variable: string }>;
}

export interface LectureDeComposant {
  readonly sujet: {
    readonly id: string;
    readonly nom: string;
    readonly type: string;
    readonly variant: string | null;
    readonly variants: ReadonlyArray<{ readonly id: string; readonly nom: string }>;
  };
  /** Les composants et instances qui contiennent le sujet, du plus lointain au plus proche. */
  readonly ancetres: ReadonlyArray<{ readonly id: string; readonly nom: string }>;
  /** La racine lue vient en tête : le sujet, ou le variant par défaut d'un jeu. */
  readonly calques: readonly CalqueDuComposant[];
  readonly liaisons: readonly LiaisonDuComposant[];
  readonly styles: readonly StyleDeTexte[];
  readonly usagesDeStyle: ReadonlyArray<{ readonly calque: string; readonly style: string }>;
  /** Les valeurs qu'aucune variable ne lie, déjà en texte. */
  readonly directes: ReadonlyArray<{ readonly calque: string; readonly propriete: string; readonly valeur: string }>;
  /** Les variables atteintes depuis le sujet, et leurs collections. */
  readonly releve: Releve;
  readonly calquesNonLus: number;
  readonly erreurs: ReadonlyArray<{ readonly calque: string; readonly message: string }>;
}

const RAYONS = new Set(['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'cornerRadius']);
const EPAISSEURS = new Set(['strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight']);
const ECARTS = new Set(['itemSpacing', 'counterAxisSpacing', 'gridRowGap', 'gridColumnGap']);
const MARGES = new Set(['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']);
const TAILLES = new Set(['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight']);
const POLICES = new Set(['fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'lineHeight', 'letterSpacing', 'paragraphSpacing', 'paragraphIndent']);

/** Le chemin d'une propriété sans ses indices, et s'il vient d'un segment de texte. */
export function champDe(propriete: string): { champ: string; deTexte: boolean } {
  const deTexte = /^texte\[[^\]]*\]\./.test(propriete);
  return { champ: propriete.replace(/^texte\[[^\]]*\]\./, '').replace(/\[[^\]]*\]/g, ''), deTexte };
}

/**
 * La nature d'une propriété liée et son libellé. Une propriété hors de la
 * table rend `autre`, avec son chemin pour libellé.
 */
export function natureDe(propriete: string, typeDuCalque: string): { nature: Nature; libelle: string } {
  const { champ, deTexte } = champDe(propriete);
  const tete = champ.split('.')[0];
  if (tete === 'fills') return { nature: 'couleur', libelle: deTexte || typeDuCalque === 'TEXT' ? 'texte' : 'fond' };
  if (tete === 'strokes') return { nature: 'couleur', libelle: 'contour' };
  if (champ === 'effects.color') return { nature: 'couleur', libelle: 'effet' };
  if (RAYONS.has(champ)) return { nature: 'forme', libelle: 'rayon' };
  if (EPAISSEURS.has(champ)) return { nature: 'forme', libelle: 'epaisseur' };
  if (champ === 'opacity') return { nature: 'forme', libelle: 'opacite' };
  if (ECARTS.has(champ)) return { nature: 'espacement', libelle: 'ecart' };
  if (MARGES.has(champ)) return { nature: 'espacement', libelle: 'marge' };
  if (TAILLES.has(champ)) return { nature: 'taille', libelle: 'taille' };
  if (POLICES.has(champ)) return { nature: 'texte', libelle: 'police' };
  return { nature: 'autre', libelle: propriete };
}

/** Le calque et ses descendants. Un calque inconnu rend un ensemble vide. */
export function porteeDe(lecture: LectureDeComposant, calque: string): Set<string> {
  const ids = new Set<string>();
  for (const candidat of lecture.calques) {
    if (candidat.id === calque || (candidat.parent !== null && ids.has(candidat.parent))) ids.add(candidat.id);
  }
  return ids;
}

/** Un champ d'un style de texte, résolu avec les modes du premier calque qui porte le style. */
export interface ChampDeStyle {
  readonly champ: string;
  readonly variable: string;
  readonly resultat: Resultat;
}

export interface LigneDeComposant {
  /** L'identifiant de la variable et les modes de sa chaîne, ou `style:` et l'identifiant du style. */
  readonly cle: string;
  readonly genre: 'token' | 'style';
  readonly nature: Nature;
  readonly libelles: readonly string[];
  /** Les calques qui portent la ligne, chacun une fois, dans l'ordre de la lecture. */
  readonly calques: readonly string[];
  readonly nomComplet: string;
  /** Le nom sans le préfixe commun aux tokens du composant. */
  readonly nomCourt: string;
  readonly variable: string | null;
  readonly type: TypeDeVariable | null;
  readonly resultat: Resultat | null;
  readonly champs: readonly ChampDeStyle[];
  /** La valeur affichée ; `null` quand la chaîne n'aboutit pas. */
  readonly valeur: string | null;
  /** La valeur de Figma quand elle diffère de celle de la chaîne. */
  readonly ecart: ValeurTerminale | null;
}

/**
 * Le préfixe que les noms partagent : le premier segment le plus fréquent,
 * puis les segments communs à tous les noms de ce groupe. Chaque nom garde au
 * moins un segment. Moins de deux noms dans le groupe : préfixe vide.
 */
export function prefixeCommun(noms: readonly string[]): string {
  const distincts = [...new Set(noms)];
  const tetes = new Map<string, number>();
  for (const nom of distincts) {
    const tete = nom.split('/')[0];
    tetes.set(tete, (tetes.get(tete) ?? 0) + 1);
  }
  let tete: string | null = null;
  for (const [candidate, fois] of tetes) if (tete === null || fois > (tetes.get(tete) ?? 0)) tete = candidate;
  const groupe = distincts.filter((nom) => nom.split('/')[0] === tete).map((nom) => nom.split('/'));
  if (groupe.length < 2) return '';
  let commun = 0;
  while (groupe.every((segments) => segments.length > commun + 1 && segments[commun] === groupe[0][commun])) commun += 1;
  return commun > 0 ? `${groupe[0].slice(0, commun).join('/')}/` : '';
}

/** Vrai quand la chaîne aboutit et que Figma rend une autre valeur. Une chaîne non résolue ne produit aucun écart. */
export function ecartAvecFigma(resultat: Resultat, valeurDeFigma: ValeurSource | undefined): boolean {
  if (resultat.statut !== 'resolu' || valeurDeFigma === undefined || valeurDeFigma.nature === 'alias') return false;
  return !valeursEgales(resultat.valeur, valeurDeFigma);
}

const valeurDeChamp = (champs: readonly ChampDeStyle[], nom: string): string | null => {
  const resultat = champs.find((champ) => champ.champ === nom)?.resultat;
  return resultat?.statut === 'resolu' ? texteDeValeur(resultat.valeur) : null;
};

/**
 * Les lignes de la portée, rangées par nature. Deux calques qui portent la
 * même variable sous des modes différents donnent deux lignes.
 */
export function lignesDe(lecture: LectureDeComposant, index: Index, portee: ReadonlySet<string>): LigneDeComposant[] {
  const calques = new Map(lecture.calques.map((calque) => [calque.id, calque]));
  const nomDe = (variable: string): string => index.variables.get(variable)?.nom ?? variable;
  const prefixe = prefixeCommun(lecture.liaisons.map((liaison) => nomDe(liaison.variable)));

  interface Brouillon { ligne: LigneDeComposant; libelles: Set<string>; calques: Set<string> }
  const table = new Map<string, Brouillon>();
  const clore = (): LigneDeComposant[] => [...table.values()]
    .map(({ ligne, libelles, calques: portes }) => ({ ...ligne, libelles: [...libelles], calques: [...portes] }))
    .sort((a, b) => NATURES.indexOf(a.nature) - NATURES.indexOf(b.nature));

  for (const liaison of lecture.liaisons) {
    if (!portee.has(liaison.calque)) continue;
    const calque = calques.get(liaison.calque);
    const resultat = resoudre(index, liaison.variable, {}, { calque: calque?.modes ?? {} });
    const cle = `${liaison.variable}\u0000${resultat.etapes.map((etape) => etape.mode).join('\u0000')}`;
    const { nature, libelle } = natureDe(liaison.propriete, calque?.type ?? '');
    let brouillon = table.get(cle);
    if (!brouillon) {
      const nomComplet = nomDe(liaison.variable);
      brouillon = {
        libelles: new Set(),
        calques: new Set(),
        ligne: {
          cle,
          genre: 'token',
          nature,
          libelles: [],
          calques: [],
          nomComplet,
          nomCourt: prefixe && nomComplet.startsWith(prefixe) ? nomComplet.slice(prefixe.length) : nomComplet,
          variable: liaison.variable,
          type: index.variables.get(liaison.variable)?.type ?? null,
          resultat,
          champs: [],
          valeur: resultat.statut === 'resolu' ? texteDeValeur(resultat.valeur) : null,
          ecart: null,
        },
      };
      table.set(cle, brouillon);
    }
    brouillon.libelles.add(libelle);
    brouillon.calques.add(liaison.calque);
    if (brouillon.ligne.ecart === null && ecartAvecFigma(resultat, liaison.valeurDeFigma)) {
      brouillon.ligne = { ...brouillon.ligne, ecart: liaison.valeurDeFigma as ValeurTerminale };
    }
  }

  const styles = new Map(lecture.styles.map((style) => [style.id, style]));
  for (const usage of lecture.usagesDeStyle) {
    const style = styles.get(usage.style);
    if (!style || !portee.has(usage.calque)) continue;
    const cle = `style:${style.id}`;
    let brouillon = table.get(cle);
    if (!brouillon) {
      const modes = calques.get(usage.calque)?.modes ?? {};
      const champs = style.liaisons.map((liaison) => ({ champ: liaison.champ, variable: liaison.variable, resultat: resoudre(index, liaison.variable, {}, { calque: modes }) }));
      const valeur = [valeurDeChamp(champs, 'fontSize'), valeurDeChamp(champs, 'lineHeight')].filter((texte): texte is string => texte !== null).join('/');
      brouillon = {
        libelles: new Set(['style']),
        calques: new Set(),
        ligne: { cle, genre: 'style', nature: 'texte', libelles: [], calques: [], nomComplet: style.nom, nomCourt: style.nom, variable: null, type: null, resultat: null, champs, valeur, ecart: null },
      };
      table.set(cle, brouillon);
    }
    brouillon.calques.add(usage.calque);
  }
  return clore();
}

export interface SectionDeComposant {
  readonly nature: Nature;
  readonly lignes: readonly LigneDeComposant[];
}

/** Les lignes rangées par nature, dans l'ordre de `NATURES`, sans section vide. */
export function sectionsDe(lignes: readonly LigneDeComposant[]): SectionDeComposant[] {
  return NATURES.map((nature) => ({ nature, lignes: lignes.filter((ligne) => ligne.nature === nature) })).filter((section) => section.lignes.length > 0);
}

export interface ResumeDeSection {
  /** Les lignes dont la chaîne aboutit à une couleur, dans l'ordre des lignes. */
  readonly couleurs: ReadonlyArray<{ readonly cle: string; readonly nom: string; readonly valeur: Extract<ValeurTerminale, { nature: 'couleur' }> }>;
  /** Les noms des styles, puis les valeurs distinctes des autres lignes, nombres triés. */
  readonly textes: readonly string[];
}

/** Ce qu'une section repliée affiche sur une ligne. */
export function resumeDe(section: SectionDeComposant): ResumeDeSection {
  const couleurs: Array<ResumeDeSection['couleurs'][number]> = [];
  const styles: string[] = [];
  const valeurs = new Set<string>();
  for (const ligne of section.lignes) {
    if (ligne.resultat?.statut === 'resolu' && ligne.resultat.valeur.nature === 'couleur') couleurs.push({ cle: ligne.cle, nom: ligne.nomCourt, valeur: ligne.resultat.valeur });
    else if (ligne.genre === 'style') styles.push(ligne.nomCourt);
    else if (ligne.valeur !== null && ligne.valeur !== '') valeurs.add(ligne.valeur);
  }
  const nombre = (texte: string): number => (Number.isFinite(Number(texte)) ? Number(texte) : Number.POSITIVE_INFINITY);
  return { couleurs, textes: [...styles, ...[...valeurs].sort((a, b) => nombre(a) - nombre(b))] };
}

export interface FrontiereDeComposant {
  readonly nom: string;
  readonly fois: number;
  /** Le calque de la première instance, que la vue ouvre. */
  readonly premiere: string;
}

/** Les composants imbriqués de la portée, comptés par nom. */
export function frontieresDe(lecture: LectureDeComposant, portee: ReadonlySet<string>): FrontiereDeComposant[] {
  const parNom = new Map<string, { fois: number; premiere: string }>();
  for (const calque of lecture.calques) {
    if (!calque.frontiere || !portee.has(calque.id)) continue;
    const connue = parNom.get(calque.frontiere.composant);
    if (connue) connue.fois += 1;
    else parNom.set(calque.frontiere.composant, { fois: 1, premiere: calque.id });
  }
  return [...parNom].map(([nom, { fois, premiere }]) => ({ nom, fois, premiere }));
}

/**
 * Les lignes dont le nom complet, la valeur affichée ou un libellé contient
 * le texte, sans casse. `motDe` rend le mot d'un libellé.
 */
export function filtrer(lignes: readonly LigneDeComposant[], texte: string, motDe: (libelle: string) => string = (libelle) => libelle): LigneDeComposant[] {
  const cherche = texte.trim().toLocaleLowerCase('fr');
  if (!cherche) return [...lignes];
  return lignes.filter((ligne) => `${ligne.nomComplet}\n${ligne.valeur ?? ''}\n${ligne.libelles.map(motDe).join('\n')}`.toLocaleLowerCase('fr').includes(cherche));
}

/** Le nombre de liaisons de la portée : variables liées et styles de texte portés. */
export function compteDesLiaisons(lecture: LectureDeComposant, portee: ReadonlySet<string>): number {
  return lecture.liaisons.filter((liaison) => portee.has(liaison.calque)).length + lecture.usagesDeStyle.filter((usage) => portee.has(usage.calque)).length;
}

/**
 * Les modes que les chaînes de ces lignes retiennent, par leur nom, dans les
 * collections qui en déclarent plusieurs. Une collection à un seul mode ne
 * laisse aucun choix à nommer.
 */
export function modesNommes(index: Index, lignes: readonly LigneDeComposant[]): string[] {
  const noms = new Set<string>();
  const relever = (resultat: Resultat | null): void => {
    for (const etape of resultat?.etapes ?? []) {
      const modes = index.collections.get(etape.collection)?.modes ?? [];
      const nom = modes.find((mode) => mode.id === etape.mode)?.nom;
      if (modes.length > 1 && nom !== undefined) noms.add(nom);
    }
  };
  for (const ligne of lignes) {
    relever(ligne.resultat);
    for (const champ of ligne.champs) relever(champ.resultat);
  }
  return [...noms];
}
