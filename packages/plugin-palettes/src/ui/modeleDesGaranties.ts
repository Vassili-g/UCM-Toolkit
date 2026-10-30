/**
 * Ce que la carte « Garanties de contraste » montre, avant son dessin : une
 * ligne par garantie G1 à G9, ses promesses rangées dans les six colonnes
 * de fonds, les cibles qu'elle nomme et le départ de son éventail sur la
 * réglette. Pur : ni DOM, ni texte. Le numéro d'une garantie sert de clé à la
 * ligne ; aucun texte ne l'affiche.
 */
import { ETATS, GARANTIES, etatDuFond, type Designation, type Garantie, type Promesse } from 'ucm-couleur';

/** Les six colonnes de fonds : la page, la carte, `surface/subtle`, puis les trois états de `solid` et de `surface` (S3). */
export const COLONNES = ['page', 'carte', 'subtle', ...ETATS] as const;
export type Colonne = (typeof COLONNES)[number];

/** La garantie choisie quand aucune ne manque : le texte sur fond teinté. */
export const GARANTIE_PAR_DEFAUT = 3;

/** Une case de la réglette : les trois cases avant la première nuance, ou une nuance. */
export type CaseDeLaReglette = 'page' | 'carte' | 'boutons' | number;

/** La case de la réglette qu'un membre désigne : la page, la carte, le texte des boutons, ou une nuance. */
export function caseDeLaReglette(designation: Designation): CaseDeLaReglette {
  if (designation.nature === 'fond') return designation.fond === 'carte' ? 'carte' : 'page';
  return designation.nature === 'cran' ? designation.cran : 'boutons';
}

/** Une promesse dans sa colonne. */
export interface CaseDeGarantie {
  readonly colonne: Colonne;
  readonly promesse: Promesse;
}

export interface LigneDeGarantie {
  readonly garantie: Garantie;
  /** Une case par fond jugé, dans l'ordre des colonnes ; une colonne sans fond n'a pas de case. */
  readonly cases: readonly CaseDeGarantie[];
  /** La case où l'éventail part : la nuance du premier membre, ou le texte des boutons. */
  readonly depart: CaseDeLaReglette;
}

/**
 * Les lignes de la carte pour un mode et une intensité, dans l'ordre de G1 à
 * G9. Le moteur rend une promesse par fond de la garantie, dans l'ordre de
 * `garantie.fonds` : le rang d'une promesse dit son fond. Une garantie sans
 * promesse n'est pas jugeable et n'a pas de ligne.
 */
export function lignesDesGaranties(promesses: readonly Promesse[]): LigneDeGarantie[] {
  return GARANTIES.flatMap((garantie): LigneDeGarantie[] => {
    const siennes = promesses.filter((promesse) => promesse.garantie.numero === garantie.numero);
    if (siennes.length !== garantie.fonds.length) return [];
    const cases = siennes
      .map((promesse, rang): CaseDeGarantie => ({ colonne: etatDuFond(garantie.fonds[rang]), promesse }))
      .sort((a, b) => COLONNES.indexOf(a.colonne) - COLONNES.indexOf(b.colonne));
    return [{ garantie, cases, depart: caseDeLaReglette(siennes[0].premier) }];
  });
}

/** Un encadré de la carte : les garanties d'un même seuil, `texte` puis `nonTexte`. */
export interface BlocDeGaranties {
  readonly seuil: Garantie['seuil'];
  readonly lignes: readonly LigneDeGarantie[];
}

export function blocsDeGaranties(lignes: readonly LigneDeGarantie[]): BlocDeGaranties[] {
  return (['texte', 'nonTexte'] as const)
    .map((seuil) => ({ seuil, lignes: lignes.filter((ligne) => ligne.garantie.seuil === seuil) }))
    .filter((bloc) => bloc.lignes.length > 0);
}

/**
 * La garantie qu'une palette ouvre : la première ligne manquée de la carte,
 * dans l'ordre où elle s'affiche, sinon `GARANTIE_PAR_DEFAUT`.
 */
export function garantieParDefaut(lignes: readonly LigneDeGarantie[]): number {
  const premiere = blocsDeGaranties(lignes)
    .flatMap((bloc) => bloc.lignes)
    .find((ligne) => ligne.cases.some((cas) => cas.promesse.verdict === 'manquee'));
  return premiere ? premiere.garantie.numero : GARANTIE_PAR_DEFAUT;
}

/** Ce qu'une ligne nomme après « sur » : le fond de la page ou de la carte, une variable, ou les trois états d'un dossier (`surface/*`). */
export type CibleDeGarantie = { readonly page: true } | { readonly carte: true } | { readonly code: string };

/**
 * Les fonds d'une garantie, dans l'ordre de `garantie.fonds` : les fonds d'un
 * dossier s'écrivent `solid/*` une seule fois quand la garantie les juge tous,
 * une variable seule garde son nom. Les fonds de `surface` sont ses trois
 * états et `surface/subtle` : la garantie 3, qui laisse l'appui à la
 * garantie 8, les nomme un à un.
 */
export function ciblesDeLaGarantie(garantie: Garantie): CibleDeGarantie[] {
  const cibles: CibleDeGarantie[] = [];
  const dossiersDits = new Set<string>();
  for (const fond of garantie.fonds) {
    if ('fondDeLaPage' in fond) {
      cibles.push({ page: true });
      continue;
    }
    if ('fondDeLaCarte' in fond) {
      cibles.push({ carte: true });
      continue;
    }
    const dossier = fond.variable.slice(0, fond.variable.indexOf('/'));
    const duDossier = garantie.fonds.filter((autre) => 'variable' in autre && autre.variable.startsWith(`${dossier}/`));
    const nombreDeFonds = ETATS.length + (dossier === 'surface' ? 1 : 0);
    if (duDossier.length < nombreDeFonds) {
      cibles.push({ code: fond.variable });
    } else if (!dossiersDits.has(dossier)) {
      dossiersDits.add(dossier);
      cibles.push({ code: `${dossier}/*` });
    }
  }
  return cibles;
}
