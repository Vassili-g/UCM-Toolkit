/** Le vocabulaire bilingue partagé. Toute modification demande les tests du référentiel, les vues générées et la revue de version du kit. */
import type { CategorieDeNom } from './conventions.js';

export type Langues = { readonly fr: string; readonly en: string };

export type Terme = {
  readonly id: string;
  readonly libelle: Langues;
  readonly definition: Langues;
  readonly toleres?: readonly string[];
  readonly identifiantParCategorie?: Readonly<Partial<Record<CategorieDeNom, string>>>;
};

/** Une forme retenue dans une catégorie devient une forme tolérée dans les autres. */
export function termePourCategorie(terme: Terme, categorie: CategorieDeNom): Terme {
  const id = terme.identifiantParCategorie?.[categorie] ?? terme.id;
  const formes = [terme.id, ...(terme.toleres ?? []), ...Object.values(terme.identifiantParCategorie ?? {})];
  return { ...terme, id, toleres: [...new Set(formes)].filter((forme) => forme !== id) };
}

export type Registre = {
  readonly id: string;
  readonly extensible: boolean;
  readonly termes: readonly Terme[];
};

/** Retrouve un terme par son identifiant ou un mot toléré, sans changer la casse du mot lu. */
export function termeRetenu(registre: Registre, mot: string): Terme | undefined {
  return registre.termes.find((terme) => terme.id === mot || terme.toleres?.includes(mot));
}

export function libelleDuTerme(terme: Terme, langue: keyof Langues): string {
  return terme.libelle[langue];
}
