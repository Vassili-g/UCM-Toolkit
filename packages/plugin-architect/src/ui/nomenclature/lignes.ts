/**
 * La logique pure des cartes de l'onglet Renommages : l'ordre des sections, le
 * découpage d'un nom en segments marqués et la file qui charge les pages de noms
 * d'une carte. `aAppliquer.ts` dessine ; ce module décide.
 */
import type { RegleVue } from '../../messages/nomenclature';

export type SorteDeRegle = RegleVue['sorte'];

/** Conventions d'écriture, puis Vocabulaire, puis Collections. */
export const ORDRE_DES_SECTIONS: readonly SorteDeRegle[] = ['ecriture', 'terme', 'collection'];

/** Range les groupes par section dans l'ordre d'affichage, en gardant leur ordre dans chaque section. Une section vide disparaît. */
export function sectionsDansLOrdre<T extends { readonly regle: { readonly sorte: SorteDeRegle } }>(
  groupes: readonly T[],
): { readonly sorte: SorteDeRegle; readonly groupes: readonly T[] }[] {
  return ORDRE_DES_SECTIONS.map((sorte) => ({ sorte, groupes: groupes.filter((groupe) => groupe.regle.sorte === sorte) })).filter(
    (section) => section.groupes.length > 0,
  );
}

export interface SegmentDeNom {
  readonly texte: string;
  /** Vrai quand la règle de la carte change ce segment. */
  readonly marque: boolean;
}

/** Découpe un nom aux `/` ; seuls les rangs de `marques` sont marqués. */
export function segmentsDeNom(nom: string, marques: readonly number[]): SegmentDeNom[] {
  return nom.split('/').map((texte, rang) => ({ texte, marque: marques.includes(rang) }));
}

/**
 * L'état de la file d'une carte : la génération du bilan qui l'a créée, le
 * nombre de noms de la carte, ceux déjà montrés, et si le sandbox a cessé d'en
 * rendre de nouveaux.
 */
export interface FileDeNoms {
  readonly generation: number;
  readonly total: number;
  readonly charges: number;
  readonly epuisee: boolean;
}

export function creerLaFile(generation: number, total: number, charges: number): FileDeNoms {
  return { generation, total, charges, epuisee: false };
}

/** Le nombre de noms que la carte n'a pas encore montrés ; 0 quand le sandbox n'en rend plus. */
export function nomsRestants(file: FileDeNoms): number {
  return file.epuisee ? 0 : Math.max(0, file.total - file.charges);
}

/**
 * Le début de la page à demander, ou `null` quand la file s'arrête : tous les
 * noms sont là, le sandbox n'en rend plus, ou la génération de l'écran n'est
 * plus celle de la carte.
 */
export function prochainDebut(file: FileDeNoms, generationCourante: number | null): number | null {
  if (generationCourante !== file.generation) return null;
  return nomsRestants(file) > 0 ? file.charges : null;
}

/**
 * La file après une page reçue. `nouveaux` compte les noms que la carte ne
 * montrait pas déjà. Rend `null` quand la page vient d'une autre génération :
 * la file s'arrête. Une page sans nom nouveau épuise la file, qui ne redemande
 * pas la même page.
 */
export function apresUnePage(file: FileDeNoms, page: { readonly generation: number; readonly nouveaux: number }): FileDeNoms | null {
  if (page.generation !== file.generation) return null;
  return { ...file, charges: file.charges + page.nouveaux, epuisee: page.nouveaux === 0 };
}
