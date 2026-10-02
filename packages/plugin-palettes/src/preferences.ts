/** La langue, la vue de Gestion et ses sections ouvertes sont des préférences personnelles, sans accès au document Figma. */
import { resoudreLangue, type Langue } from './i18n/langues';

export const CLE_DE_LANGUE = 'ucm-palettes.langue';
export const CLE_DE_VUE = 'ucm-palettes.vue';
export const CLE_DES_SECTIONS = 'ucm-palettes.sections';

/** Les deux vues de l'onglet Gestion ([UI-25]). */
export type VueDeGestion = 'complete' | 'condensee';

/** Une vue rangée absente ou inconnue donne la vue complète. */
export function resoudreVue(valeur: unknown): VueDeGestion {
  return valeur === 'condensee' ? 'condensee' : 'complete';
}

/** Les sections repliables de l'onglet Gestion, dans leur ordre ([UI-36]). */
export const SECTIONS_DE_GESTION = ['connexion', 'plugin', 'fichier', 'bibliotheques', 'recette'] as const;
export type SectionDeGestion = (typeof SECTIONS_DE_GESTION)[number];

/** Pour chaque section, vrai quand elle est ouverte. */
export type SectionsDeGestion = Readonly<Record<SectionDeGestion, boolean>>;

/** À la première ouverture du plugin, seules les palettes du plugin sont dépliées. */
export const SECTIONS_PAR_DEFAUT: SectionsDeGestion = { connexion: false, plugin: true, fichier: false, bibliotheques: false, recette: false };

/** Une section dont l'état rangé est absent ou n'est pas un booléen prend son état par défaut. */
export function resoudreSections(valeur: unknown): SectionsDeGestion {
  const rangees: Record<string, unknown> = valeur !== null && typeof valeur === 'object' ? valeur as Record<string, unknown> : {};
  return Object.fromEntries(SECTIONS_DE_GESTION.map((section) => {
    const ouverte = rangees[section];
    return [section, typeof ouverte === 'boolean' ? ouverte : SECTIONS_PAR_DEFAUT[section]];
  })) as Record<SectionDeGestion, boolean>;
}

export interface StockageDePreference {
  getAsync(cle: string): Promise<unknown>;
  setAsync(cle: string, valeur: unknown): Promise<void>;
}

/** Les écritures sont ordonnées, même après un refus du stockage. */
export function creerPreferences(stockage: StockageDePreference) {
  let file: Promise<unknown> = Promise.resolve();
  function ranger(cle: string, valeur: unknown): Promise<boolean> {
    const rangement = file.then(async () => {
      try { await stockage.setAsync(cle, valeur); return true; }
      catch { return false; }
    });
    file = rangement;
    return rangement;
  }
  return {
    async lire(): Promise<Langue> {
      try { return resoudreLangue(await stockage.getAsync(CLE_DE_LANGUE)); }
      catch { return resoudreLangue(undefined); }
    },
    ranger: (valeur: unknown): Promise<boolean> => ranger(CLE_DE_LANGUE, resoudreLangue(valeur)),
    async lireLaVue(): Promise<VueDeGestion> {
      try { return resoudreVue(await stockage.getAsync(CLE_DE_VUE)); }
      catch { return resoudreVue(undefined); }
    },
    rangerLaVue: (valeur: unknown): Promise<boolean> => ranger(CLE_DE_VUE, resoudreVue(valeur)),
    async lireLesSections(): Promise<SectionsDeGestion> {
      try { return resoudreSections(await stockage.getAsync(CLE_DES_SECTIONS)); }
      catch { return resoudreSections(undefined); }
    },
    rangerLesSections: (valeur: unknown): Promise<boolean> => ranger(CLE_DES_SECTIONS, resoudreSections(valeur)),
  };
}
