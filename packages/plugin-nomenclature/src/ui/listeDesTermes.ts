/**
 * L'état de la liste des termes de l'onglet Règles : la recherche, les filtres
 * (types et origines), le tri, les sections reçues, les sections repliées et le
 * terme choisi. Le module est pur ; `regles.ts` lit cet état pour le DOM et
 * envoie les demandes.
 */
import { ORIGINES_DE_FILTRE, TYPES_DE_TERMES } from '../messages';
import type { ComptesDeTermes, OrigineDeFiltre, PluginMessage, RequeteDeTermes, SectionDeTermes, TermeDeListe, TriDeTermes, TypeDeTerme } from '../messages';
import { TEXTES } from './textes';

type ReponseDesTermes = Extract<PluginMessage, { type: 'termes' }>;

export interface EtatDeLaListe {
  readonly recherche: string;
  /** Les types cochés dans le menu, dans l'ordre des sections ; aucun type coché les montre tous. */
  readonly types: readonly TypeDeTerme[];
  readonly origines: readonly OrigineDeFiltre[];
  readonly tri: TriDeTermes;
  /** Les sections reçues, avec les lignes arrivées jusqu'ici ; `null` avant la première réponse. */
  readonly sections: readonly SectionDeTermes[] | null;
  /** Les comptes du menu, conservés d'une recherche à l'autre : le sandbox les calcule hors recherche et hors filtres. */
  readonly comptes: ComptesDeTermes | null;
  /** Les sections que le designer a repliées. Ce choix survit aux recherches et aux filtres. */
  readonly repliees: readonly TypeDeTerme[];
  /** Le mot du terme dont la feuille est ouverte. */
  readonly choisi: string | null;
}

export const LISTE_INITIALE: EtatDeLaListe = { recherche: '', types: [], origines: [], tri: 'alpha', sections: null, comptes: null, repliees: [], choisi: null };

/** Une nouvelle recherche, un filtre ou un tri repart des premières lignes de chaque section. */
function depart(etat: EtatDeLaListe, suite: Partial<Pick<EtatDeLaListe, 'recherche' | 'types' | 'origines' | 'tri'>>): EtatDeLaListe {
  return { ...etat, ...suite, sections: null };
}

export function saisir(etat: EtatDeLaListe, recherche: string): EtatDeLaListe {
  return recherche === etat.recherche ? etat : depart(etat, { recherche });
}

export function trier(etat: EtatDeLaListe, tri: TriDeTermes): EtatDeLaListe {
  return tri === etat.tri ? etat : depart(etat, { tri });
}

/** Coche ou décoche un type. La liste garde l'ordre des sections, pour que deux gestes qui aboutissent au même choix donnent la même demande. */
export function basculerUnType(etat: EtatDeLaListe, type: TypeDeTerme): EtatDeLaListe {
  const coches = etat.types.includes(type) ? etat.types.filter((autre) => autre !== type) : [...etat.types, type];
  return depart(etat, { types: TYPES_DE_TERMES.filter((autre) => coches.includes(autre)) });
}

export function basculerUneOrigine(etat: EtatDeLaListe, origine: OrigineDeFiltre): EtatDeLaListe {
  const cochees = etat.origines.includes(origine) ? etat.origines.filter((autre) => autre !== origine) : [...etat.origines, origine];
  return depart(etat, { origines: ORIGINES_DE_FILTRE.filter((autre) => cochees.includes(autre)) });
}

/** Un filtre actif, tel que la barre le montre en jeton. */
export type FiltreActif =
  | { readonly sorte: 'type'; readonly valeur: TypeDeTerme; readonly libelle: string }
  | { readonly sorte: 'origine'; readonly valeur: OrigineDeFiltre; readonly libelle: string };

/** Les filtres actifs : les types d'abord, puis les origines. */
export function filtresActifs(etat: EtatDeLaListe): readonly FiltreActif[] {
  return [
    ...etat.types.map((valeur): FiltreActif => ({ sorte: 'type', valeur, libelle: TEXTES.typeDeTermeAuSingulier[valeur] })),
    ...etat.origines.map((valeur): FiltreActif => ({ sorte: 'origine', valeur, libelle: TEXTES.origineDeFiltre[valeur] })),
  ];
}

/** Retire un filtre actif : la même opération que de le décocher dans le menu. */
export function retirerUnFiltre(etat: EtatDeLaListe, filtre: FiltreActif): EtatDeLaListe {
  return filtre.sorte === 'type' ? basculerUnType(etat, filtre.valeur) : basculerUneOrigine(etat, filtre.valeur);
}

export function estRepliee(etat: EtatDeLaListe, type: TypeDeTerme): boolean {
  return etat.repliees.includes(type);
}

/** Replie la section, ou la déplie. Les lignes reçues restent : un pli ne relance aucune demande. */
export function basculerLePli(etat: EtatDeLaListe, type: TypeDeTerme): EtatDeLaListe {
  return { ...etat, repliees: estRepliee(etat, type) ? etat.repliees.filter((autre) => autre !== type) : [...etat.repliees, type] };
}

/** Le nombre de lignes que la section a reçues : le `debut` de sa prochaine page. */
function lignesRecues(etat: EtatDeLaListe, type: TypeDeTerme): number {
  return etat.sections?.find((section) => section.type === type)?.termes.length ?? 0;
}

/** Le nombre de lignes que la section n'a pas encore reçues. */
export function resteDansLaSection(section: SectionDeTermes): number {
  return Math.max(0, section.total - section.termes.length);
}

/**
 * La demande de l'écran. Sans `section`, les premières lignes de chaque section ; avec `section`, la page de cette section qui suit
 * ses lignes déjà reçues.
 */
export function requeteDeLaListe(etat: EtatDeLaListe, section: TypeDeTerme | null): RequeteDeTermes {
  return {
    recherche: etat.recherche, types: etat.types, origines: etat.origines, tri: etat.tri,
    section, debut: section === null ? 0 : lignesRecues(etat, section),
  };
}

/**
 * Range une réponse. Sans `section`, elle remplace toutes les sections. Avec `section`, c'est la page qui suit les lignes reçues
 * de cette section ; une page qui ne suit pas, ou d'une section absente, est ignorée.
 */
export function recevoir(etat: EtatDeLaListe, reponse: ReponseDesTermes): EtatDeLaListe {
  const { comptes, section: type } = reponse;
  if (type === null) return { ...etat, sections: reponse.sections, comptes };
  const page = reponse.sections.find((autre) => autre.type === type);
  const recue = etat.sections?.find((autre) => autre.type === type);
  if (!etat.sections || !page || !recue || reponse.debut !== recue.termes.length) return etat;
  const suivante: SectionDeTermes = { type, total: page.total, termes: [...recue.termes, ...page.termes] };
  return { ...etat, comptes, sections: etat.sections.map((autre) => (autre === recue ? suivante : autre)) };
}

/** Toutes les lignes reçues, section après section. */
export function termesRecus(etat: EtatDeLaListe): readonly TermeDeListe[] {
  return (etat.sections ?? []).flatMap((section) => section.termes);
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

/** Le mot que le titre de la feuille d'un terme écrit : la forme du fichier (`StressTest`) pour un terme sans règle, sinon la clé. */
export function motAffiche(terme: Pick<TermeDeListe, 'forme'>): string {
  return terme.forme;
}

/**
 * Les variantes que la ligne d'une règle montre : celles du fichier, puis la variante cherchée quand le fichier ne l'emploie pas,
 * pour que la ligne dise par quoi la recherche l'a trouvée.
 */
function variantesDeLaLigne(terme: TermeDeListe): readonly string[] {
  return terme.trouve !== null && !terme.remplace.includes(terme.trouve) ? [...terme.remplace, terme.trouve] : terme.remplace;
}

/** Les morceaux d'une ligne selon le statut du terme, dans l'ordre d'affichage. La ligne écrit la `forme` du terme. */
export function morceauxDuTerme(terme: TermeDeListe): readonly MorceauDeLigne[] {
  switch (terme.statut) {
    case 'regle': {
      const variantes = variantesDeLaLigne(terme);
      return variantes.length === 0
        ? [{ sorte: 'reference', texte: terme.forme }]
        : [
            { sorte: 'reference', texte: terme.forme },
            { sorte: 'gris', texte: TEXTES.motRemplace },
            ...variantes.map((texte): MorceauDeLigne => ({ sorte: 'variante', texte, trouvee: texte === terme.trouve })),
          ];
    }
    case 'a-trancher':
      return terme.avec === null
        ? [{ sorte: 'mot', texte: terme.forme }]
        : [{ sorte: 'mot', texte: terme.forme }, { sorte: 'gris', texte: TEXTES.motOu }, { sorte: 'variante', texte: terme.avec, trouvee: false }];
    case 'ecart':
      return [{ sorte: 'mot', texte: terme.forme }, { sorte: 'gris', texte: TEXTES.termeNonApplique }];
    case 'sans-regle':
      return [{ sorte: 'mot', texte: terme.forme }];
  }
}

/** Vrai quand la pastille `À trancher` prend la place de l'origine. */
export function termeATrancher(terme: TermeDeListe): boolean {
  return terme.statut === 'a-trancher';
}

/** La pastille à droite d'une ligne : `À trancher` d'abord, puis l'origine ; `null` si la ligne n'en a aucune. La section dit le type du terme. */
export function pastilleDeLaLigne(terme: TermeDeListe): { readonly texte: string; readonly classe: 'pastille-bloque' | 'pastille-ucm' | 'pastille-personnalise' } | null {
  if (termeATrancher(terme)) return { texte: TEXTES.pastilleATrancherDuTerme, classe: 'pastille-bloque' };
  if (terme.origine === null) return null;
  return terme.origine === 'ucm' ? { texte: TEXTES.pastilleUcm, classe: 'pastille-ucm' } : { texte: TEXTES.pastillePersonnalise, classe: 'pastille-personnalise' };
}

/** Le nom accessible d'une ligne : le terme, sa règle, son origine ou `À trancher`, son nombre. */
export function nomAccessibleDuTerme(terme: TermeDeListe): string {
  const regle =
    terme.statut === 'regle' && variantesDeLaLigne(terme).length > 0
      ? TEXTES.termeRemplace(variantesDeLaLigne(terme))
      : terme.statut === 'a-trancher'
        ? TEXTES.termeATrancher(terme.avec)
        : terme.statut === 'ecart'
          ? TEXTES.termeNonApplique
          : '';
  const origine = termeATrancher(terme)
    ? TEXTES.pastilleATrancherDuTerme
    : terme.origine === 'ucm'
      ? TEXTES.pastilleUcm
      : terme.origine === 'personnalise'
        ? TEXTES.pastillePersonnalise
        : '';
  return [terme.forme, regle, origine, TEXTES.nomsDuTerme(terme.nombre)].filter((partie) => partie !== '').join(', ');
}

/**
 * La phrase sous la recherche d'une variante : la première ligne trouvée par
 * une variante donne la variante et la forme de sa référence ; `null` si aucune.
 */
export function phraseDeRecherche(termes: readonly TermeDeListe[]): { readonly variante: string; readonly reference: string } | null {
  const trouve = termes.find((terme) => terme.trouve !== null);
  return trouve && trouve.trouve !== null ? { variante: trouve.trouve, reference: trouve.forme } : null;
}
