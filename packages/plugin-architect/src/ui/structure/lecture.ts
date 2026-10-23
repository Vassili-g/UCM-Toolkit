/**
 * Ce que l'écran lit dans les constats et les corrections du sandbox : les constats à régler dans la fenêtre Variables de Figma, rangés
 * par intertitre, et les corrections de modes et de scopes que Corrections propose d'écrire. Aucune des deux lectures ne touche au DOM.
 *
 * Les constats que le contrôle de structure du kit rend portent leurs faits sous les clés `variable`, `mode`, `soeurs` et `doublons`.
 * Ceux que le kit ne rend pas encore (cible supprimée, library non activée, mode sans valeur, couleur sans alias) portent `genre`.
 * `cle` donne la variable à ouvrir quand le fait `variable` est un nom ; sans elle, l'écran retrouve la variable par son nom entier.
 */
import type { TypeDAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import type { Constat, Correction } from '../../messages/commun';
import { TEXTES } from '../textes';

/** Un morceau de phrase : du texte, ou un chemin que l'écran met en forme. */
export type Morceau = string | { readonly chemin: string };

export type GroupeDeConstat = 'alias' | 'modes' | 'valeurs' | 'couches';

/** L'ordre des intertitres de « À faire dans Figma ». */
export const GROUPES: readonly GroupeDeConstat[] = ['alias', 'modes', 'valeurs', 'couches'];

export interface FaitDeConstat {
  readonly etiquette: string;
  readonly valeur: readonly Morceau[];
}

export interface ConstatAFaire {
  readonly id: string;
  readonly type: TypeDAlerte;
  readonly groupe: GroupeDeConstat;
  readonly phrase: string;
  readonly lieu: readonly Morceau[];
  /** Où le régler dans Figma ; `null` quand le constat n'a pas de geste à dire. */
  readonly statut: string | null;
  readonly faits: readonly FaitDeConstat[];
  /** La variable que « Ouvrir la fiche » désigne ; `null` quand le constat n'en désigne pas une seule. */
  readonly variable: { readonly nom: string; readonly cle: string | null } | null;
}

type GenreDeConstat = 'alias-supprime' | 'library-inactive' | 'sans-valeur-en-mode' | 'valeur-vide' | 'doublons' | 'couleur-sans-alias';

const GENRES_DECLARES: readonly GenreDeConstat[] = ['alias-supprime', 'library-inactive', 'sans-valeur-en-mode', 'couleur-sans-alias'];

const GROUPE_DU_GENRE: Readonly<Record<GenreDeConstat, GroupeDeConstat>> = {
  'alias-supprime': 'alias',
  'library-inactive': 'alias',
  'sans-valeur-en-mode': 'modes',
  'valeur-vide': 'valeurs',
  doublons: 'valeurs',
  'couleur-sans-alias': 'couches',
};

/** Ce que l'écran sait du relevé : le nom entier d'une variable par sa clé, et sa clé par son nom entier. */
export interface Noms {
  nom(cle: string): string | null;
  cle(nom: string): string | null;
}

function genreDe(constat: Constat): GenreDeConstat | null {
  const { genre, soeurs, doublons } = constat.faits;
  if (typeof genre === 'string' && (GENRES_DECLARES as readonly string[]).includes(genre)) return genre as GenreDeConstat;
  if (typeof soeurs === 'number') return 'valeur-vide';
  if (typeof doublons === 'number') return 'doublons';
  return null;
}

const fait = (constat: Constat, cle: string): string => String(constat.faits[cle] ?? '');

/** Le nom entier d'une variable : celui du relevé quand la clé le connaît, sinon le fait tel que le contrôle l'écrit. */
function variableDe(constat: Constat, noms: Noms): { nom: string; cle: string | null } | null {
  const brut = fait(constat, 'variable');
  const cle = typeof constat.faits.cle === 'string' ? constat.faits.cle : null;
  const connu = cle ? noms.nom(cle) : null;
  const nom = connu ?? (brut === '' ? null : brut);
  if (nom === null) return null;
  return { nom, cle: connu === null ? noms.cle(nom) : cle };
}

function phraseDe(genre: GenreDeConstat, constat: Constat): string {
  switch (genre) {
    case 'alias-supprime':
      return TEXTES.aliasSupprime;
    case 'library-inactive':
      return TEXTES.libraryInactive;
    case 'sans-valeur-en-mode':
      return TEXTES.sansValeurEnMode(fait(constat, 'mode'));
    case 'valeur-vide':
      return TEXTES.valeurVide;
    case 'doublons':
      return TEXTES.crans(Number(constat.faits.doublons), fait(constat, 'valeur'));
    case 'couleur-sans-alias':
      return TEXTES.couleurSansAlias;
  }
}

function statutDe(genre: GenreDeConstat, constat: Constat): string | null {
  switch (genre) {
    case 'alias-supprime':
      return TEXTES.autreCible;
    case 'library-inactive':
      return TEXTES.activerLaLibrary(fait(constat, 'library'));
    case 'sans-valeur-en-mode':
      return TEXTES.donnerUneValeurEnMode(fait(constat, 'mode'));
    case 'valeur-vide':
      return TEXTES.donnerUneValeur;
    case 'couleur-sans-alias':
      return TEXTES.lierALaCouleur;
    case 'doublons':
      return null;
  }
}

function faitsDe(genre: GenreDeConstat, constat: Constat): readonly FaitDeConstat[] {
  const voisine = fait(constat, 'voisine');
  const cible = fait(constat, 'cibleDeLaVoisine');
  if (genre !== 'alias-supprime' || voisine === '' || cible === '') return [];
  return [
    { etiquette: TEXTES.enMode(fait(constat, 'mode')), valeur: [TEXTES.viseUneVariableSupprimee] },
    { etiquette: TEXTES.sesVoisines, valeur: [{ chemin: voisine }, TEXTES.vise, { chemin: cible }] },
  ];
}

/** Les constats à régler dans Figma : ceux que le contrôle ne corrige pas, rangés par intertitre dans l'ordre où le sandbox les rend. */
export function lireLesConstats(constats: readonly Constat[], noms: Noms): readonly ConstatAFaire[] {
  const lus: ConstatAFaire[] = [];
  for (const constat of constats) {
    if (constat.correction) continue;
    const genre = genreDe(constat);
    if (genre === null) continue;
    const variable = variableDe(constat, noms);
    const candidats = (constat.question?.candidats ?? []).map(({ cle, nom }) => ({ chemin: (cle ? noms.nom(cle) : null) ?? nom }));
    let lieu: readonly Morceau[] = variable ? [{ chemin: variable.nom }] : [];
    if (genre === 'doublons') lieu = candidats.flatMap((morceau, rang) => (rang === 0 ? [morceau] : [TEXTES.et, morceau]));
    if (genre === 'couleur-sans-alias' && variable) lieu = [{ chemin: variable.nom }, `, ${fait(constat, 'valeur')}`];
    lus.push({
      id: constat.id,
      type: constat.type,
      groupe: GROUPE_DU_GENRE[genre],
      phrase: phraseDe(genre, constat),
      lieu,
      statut: statutDe(genre, constat),
      faits: faitsDe(genre, constat),
      variable: genre === 'doublons' ? null : variable,
    });
  }
  return GROUPES.flatMap((groupe) => lus.filter((lu) => lu.groupe === groupe));
}

/** Une ligne d'une carte de corrections : le nom entier avant et le nom entier après. */
export interface LigneDeCorrection {
  readonly id: string;
  readonly avant: string;
  readonly apres: string;
}

export interface CarteDeModes {
  readonly sorte: 'modes';
  readonly cle: string;
  readonly mode: string;
  readonly variable: string;
  readonly cran: string;
  readonly lignes: readonly LigneDeCorrection[];
}

export interface CarteDeScopes {
  readonly sorte: 'scopes';
  readonly cle: string;
  readonly dossier: string;
  readonly avant: readonly string[];
  readonly apres: readonly string[];
  readonly lignes: readonly LigneDeCorrection[];
}

const segments = (nom: string): string[] => nom.split('/');

/** Les rangs des segments qui diffèrent entre deux noms ; tous les segments quand les noms n'ont pas la même longueur. */
export function segmentsQuiChangent(avant: string, apres: string): readonly number[] {
  const a = segments(avant);
  const b = segments(apres);
  if (a.length !== b.length) return a.map((_, rang) => rang);
  return a.flatMap((segment, rang) => (segment === b[rang] ? [] : [rang]));
}

/** Les scopes d'une liste de l'API, dans l'ordre de la fenêtre Edit variable. */
function scopesDe(liste: string | null): string[] {
  if (liste === null || liste === '') return [];
  return liste.split(',').sort((a, b) => TEXTES.rangDeScope(a) - TEXTES.rangDeScope(b));
}

/** Les corrections de modes (une carte chacune) et de scopes (une carte par dossier, par scope voulu et par scope actuel). */
export function lireLesCorrections(corrections: readonly Correction[], noms: Noms): { readonly modes: readonly CarteDeModes[]; readonly scopes: readonly CarteDeScopes[] } {
  const modes: CarteDeModes[] = [];
  const scopes = new Map<string, { dossier: string; avant: string[]; apres: string[]; lignes: LigneDeCorrection[] }>();
  for (const correction of corrections) {
    const cle = correction.cible.variable;
    const nom = (cle ? noms.nom(cle) : null) ?? cle ?? '';
    if (correction.sorte === 'alias-de-mode') {
      const avant = (correction.avant ? noms.nom(correction.avant) : null) ?? correction.avant ?? '';
      const apres = (correction.apres.cle ? noms.nom(correction.apres.cle) : null) ?? correction.apres.nom;
      modes.push({
        sorte: 'modes',
        cle: correction.id,
        mode: correction.aRelire.axes?.mode ?? correction.cible.mode ?? '',
        variable: nom,
        cran: segments(apres).at(-1) ?? '',
        lignes: [{ id: correction.id, avant, apres }],
      });
    } else if (correction.sorte === 'scope') {
      const avant = scopesDe(correction.avant);
      const apres = scopesDe(correction.apres.nom);
      const dossier = segments(nom).at(-2) ?? '';
      const regroupe = `${dossier}|${apres.join(',')}|${avant.join(',')}`;
      const carte = scopes.get(regroupe) ?? { dossier, avant, apres, lignes: [] };
      carte.lignes.push({ id: correction.id, avant: nom, apres: nom });
      scopes.set(regroupe, carte);
    }
  }
  return { modes, scopes: [...scopes].map(([regroupe, carte]) => ({ sorte: 'scopes' as const, cle: regroupe, ...carte })) };
}
