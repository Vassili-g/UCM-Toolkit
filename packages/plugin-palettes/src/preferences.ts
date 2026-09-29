/** La langue est une préférence personnelle, sans accès au document Figma. */
import { resoudreLangue, type Langue } from './i18n/langues';

export const CLE_DE_LANGUE = 'ucm-palettes.langue';

export interface StockageDePreference {
  getAsync(cle: string): Promise<unknown>;
  setAsync(cle: string, valeur: unknown): Promise<void>;
}

/** Les écritures sont ordonnées, même après un refus du stockage. */
export function creerPreferences(stockage: StockageDePreference) {
  let file: Promise<unknown> = Promise.resolve();
  return {
    async lire(): Promise<Langue> {
      try { return resoudreLangue(await stockage.getAsync(CLE_DE_LANGUE)); }
      catch { return resoudreLangue(undefined); }
    },
    ranger(valeur: unknown): Promise<boolean> {
      const langue = resoudreLangue(valeur);
      const rangement = file.then(async () => {
        try { await stockage.setAsync(CLE_DE_LANGUE, langue); return true; }
        catch { return false; }
      });
      file = rangement;
      return rangement;
    },
  };
}
