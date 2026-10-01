/** La langue et la vue de Gestion sont des préférences personnelles, sans accès au document Figma. */
import { resoudreLangue, type Langue } from './i18n/langues';

export const CLE_DE_LANGUE = 'ucm-palettes.langue';
export const CLE_DE_VUE = 'ucm-palettes.vue';

/** Les deux vues de l'onglet Gestion ([UI-25]). */
export type VueDeGestion = 'complete' | 'condensee';

/** Une vue rangée absente ou inconnue donne la vue complète. */
export function resoudreVue(valeur: unknown): VueDeGestion {
  return valeur === 'condensee' ? 'condensee' : 'complete';
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
  };
}
