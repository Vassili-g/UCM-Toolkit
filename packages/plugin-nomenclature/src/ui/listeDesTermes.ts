/**
 * L'état de la liste des termes de l'onglet Règles : la recherche, le filtre,
 * les pages reçues et le terme choisi. Le module est pur ; `regles.ts` lit cet
 * état pour le DOM et envoie les demandes.
 */
import type { PluginMessage, RequeteDeTermes, TermeDeListe, TypeDeTerme } from '../messages';
import { TEXTES } from './textes';

/** Les cinq filtres de l'écran actuel ; le lot de l'écran des sections les remplace par les types et les origines de la demande. */
export type FiltreDesTermes = 'tous' | 'avec-regle' | 'sans-regle' | 'composants' | 'palettes';
export interface ComptesDeLaListe { readonly tous: number; readonly avecRegle: number; readonly sansRegle: number; readonly composants: number; readonly palettes: number }
type ReponseDesTermes = Extract<PluginMessage, { type: 'termes' }>;
/** Une page de termes à plat, telle que l'écran actuel la lit. */
export interface PageDeLaListe { readonly debut: number; readonly termes: readonly TermeDeListe[]; readonly total: number; readonly comptes: ComptesDeLaListe }

/** Le nombre de termes que le sandbox rend par page. */
export const TAILLE_DE_PAGE = 50;

export interface EtatDeLaListe {
  readonly recherche: string;
  readonly filtre: FiltreDesTermes;
  /** Les pages reçues, bout à bout. */
  readonly termes: readonly TermeDeListe[];
  /** Le nombre de termes que la recherche et le filtre retiennent, `null` avant la première page. */
  readonly total: number | null;
  /** Les comptes des cinq filtres, conservés d'une recherche à l'autre. */
  readonly comptes: ComptesDeLaListe | null;
  /** Le mot du terme dont la feuille est ouverte. */
  readonly choisi: string | null;
}

export const LISTE_INITIALE: EtatDeLaListe = { recherche: '', filtre: 'tous', termes: [], total: null, comptes: null, choisi: null };

/** Une nouvelle recherche ou un nouveau filtre repart de la première page. */
function depart(etat: EtatDeLaListe, suite: Partial<Pick<EtatDeLaListe, 'recherche' | 'filtre'>>): EtatDeLaListe {
  return { ...etat, ...suite, termes: [], total: null };
}

export function saisir(etat: EtatDeLaListe, recherche: string): EtatDeLaListe {
  return recherche === etat.recherche ? etat : depart(etat, { recherche });
}

export function filtrer(etat: EtatDeLaListe, filtre: FiltreDesTermes): EtatDeLaListe {
  return filtre === etat.filtre ? etat : depart(etat, { filtre });
}

/**
 * Ajoute une page. La première page remplace tout ; la suivante s'ajoute si
 * elle commence où la liste s'arrête, sinon elle est ignorée.
 */
export function recevoir(etat: EtatDeLaListe, reponse: PageDeLaListe): EtatDeLaListe {
  const { debut, termes, total, comptes } = reponse;
  if (debut === 0) return { ...etat, termes, total, comptes };
  if (debut !== etat.termes.length) return etat;
  return { ...etat, termes: [...etat.termes, ...termes], total, comptes };
}

/** Vrai tant que la liste reçue est plus courte que le total. */
export function resteAAfficher(etat: EtatDeLaListe): boolean {
  return etat.total !== null && etat.termes.length < etat.total;
}

/** Le rang de la prochaine page à demander. */
export function debutSuivant(etat: EtatDeLaListe): number {
  return etat.termes.length;
}

const TYPES_DU_FILTRE: Readonly<Record<FiltreDesTermes, readonly TypeDeTerme[]>> = {
  tous: [], 'avec-regle': ['remplace', 'conforme'], 'sans-regle': ['a-trancher', 'sans-regle'], composants: ['composant'], palettes: ['palette'],
};

/**
 * La demande que fait l'écran actuel, en attendant l'écran par sections. Un filtre qui vise un seul type demande la page de sa section ;
 * les autres reçoivent les premières lignes de chaque section, sans page suivante.
 */
export function requeteDeLaListe(etat: EtatDeLaListe, debut: number): RequeteDeTermes {
  const types = TYPES_DU_FILTRE[etat.filtre];
  return { recherche: etat.recherche, types, origines: [], tri: 'nombre', section: types.length === 1 ? types[0] : null, debut };
}

/** La réponse du sandbox mise à plat pour l'écran actuel : les lignes de toutes les sections, bout à bout. */
export function pageDeLaReponse(reponse: ReponseDesTermes): PageDeLaListe {
  const termes = reponse.sections.flatMap((section) => section.termes);
  const { types } = reponse.comptes;
  return {
    debut: reponse.debut,
    termes,
    total: reponse.section === null ? termes.length : reponse.sections.reduce((somme, section) => somme + section.total, 0),
    comptes: {
      tous: Object.values(types).reduce((somme, nombre) => somme + nombre, 0), avecRegle: types.remplace + types.conforme,
      sansRegle: types['a-trancher'] + types['sans-regle'], composants: types.composant, palettes: types.palette,
    },
  };
}

export function choisir(etat: EtatDeLaListe, mot: string | null): EtatDeLaListe {
  return mot === etat.choisi ? etat : { ...etat, choisi: mot };
}

/**
 * Un morceau de la partie gauche d'une ligne : `reference` en pastille grise,
 * `mot` en police de code, `gris` en texte gris, `variante` en police de code
 * grise (blanche quand c'est la variante cherchée).
 */
export type MorceauDeLigne =
  | { readonly sorte: 'reference' | 'mot' | 'gris'; readonly texte: string }
  | { readonly sorte: 'variante'; readonly texte: string; readonly trouvee: boolean };

/** Le mot que la ligne ou le titre de la fiche écrit : la forme du fichier (`StressTest`) pour un terme sans règle, sinon la clé. */
export function motAffiche(terme: Pick<TermeDeListe, 'mot' | 'forme' | 'statut'>): string {
  return terme.statut === 'sans-regle' || terme.statut === 'a-trancher' ? terme.forme : terme.mot;
}

/** Les morceaux d'une ligne selon le statut du terme, dans l'ordre d'affichage. */
export function morceauxDuTerme(terme: TermeDeListe): readonly MorceauDeLigne[] {
  const mot = motAffiche(terme);
  switch (terme.statut) {
    case 'regle':
      return terme.remplace.length === 0
        ? [{ sorte: 'mot', texte: terme.mot }]
        : [
            { sorte: 'reference', texte: terme.mot },
            { sorte: 'gris', texte: TEXTES.motRemplace },
            ...terme.remplace.map((texte): MorceauDeLigne => ({ sorte: 'variante', texte, trouvee: texte === terme.trouve })),
          ];
    case 'a-trancher':
      return terme.avec === null
        ? [{ sorte: 'mot', texte: mot }]
        : [{ sorte: 'mot', texte: mot }, { sorte: 'gris', texte: TEXTES.motOu }, { sorte: 'variante', texte: terme.avec, trouvee: false }];
    case 'ecart':
      return [{ sorte: 'mot', texte: mot }, { sorte: 'gris', texte: TEXTES.termeNonApplique }];
    case 'sans-regle':
      return [{ sorte: 'mot', texte: mot }];
  }
}

/** Vrai quand la pastille `À trancher` prend la place de l'origine. */
export function termeATrancher(terme: TermeDeListe): boolean {
  return terme.statut === 'a-trancher';
}

/** La pastille à droite d'une ligne : la nature d'un nom d'abord, puis `À trancher`, puis l'origine ; `null` si la ligne n'en a aucune. */
export function pastilleDeLaLigne(terme: TermeDeListe): { readonly texte: string; readonly classe: 'pastille-indice' | 'pastille-bloque' | 'pastille-ucm' | 'pastille-personnalise' } | null {
  if (terme.nature !== null) return { texte: TEXTES.natureDuTerme[terme.nature], classe: 'pastille-indice' };
  if (termeATrancher(terme)) return { texte: TEXTES.pastilleATrancherDuTerme, classe: 'pastille-bloque' };
  if (terme.origine === null) return null;
  return terme.origine === 'ucm' ? { texte: TEXTES.pastilleUcm, classe: 'pastille-ucm' } : { texte: TEXTES.pastillePersonnalise, classe: 'pastille-personnalise' };
}

/** Le nom accessible d'une ligne : le terme, sa règle, sa nature, son origine ou `À trancher`, son nombre. */
export function nomAccessibleDuTerme(terme: TermeDeListe): string {
  const regle =
    terme.statut === 'regle' && terme.remplace.length > 0
      ? TEXTES.termeRemplace(terme.remplace)
      : terme.statut === 'a-trancher'
        ? TEXTES.termeATrancher(terme.avec)
        : terme.statut === 'ecart'
          ? TEXTES.termeNonApplique
          : '';
  const nature = terme.nature === null ? '' : TEXTES.natureDuTerme[terme.nature];
  const origine = termeATrancher(terme)
    ? TEXTES.pastilleATrancherDuTerme
    : terme.origine === 'ucm'
      ? TEXTES.pastilleUcm
      : terme.origine === 'personnalise'
        ? TEXTES.pastillePersonnalise
        : '';
  return [motAffiche(terme), regle, nature, origine, TEXTES.nomsDuTerme(terme.nombre)].filter((partie) => partie !== '').join(', ');
}

/**
 * La phrase sous la recherche d'une variante : la première ligne trouvée par
 * une variante donne la variante et sa référence ; `null` si aucune.
 */
export function phraseDeRecherche(termes: readonly TermeDeListe[]): { readonly variante: string; readonly reference: string } | null {
  const trouve = termes.find((terme) => terme.trouve !== null);
  return trouve && trouve.trouve !== null ? { variante: trouve.trouve, reference: trouve.mot } : null;
}
