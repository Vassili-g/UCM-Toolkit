/**
 * Les réglages personnels de l'interface, rangés dans `clientStorage` et
 * jamais dans le document. Une valeur rangée illisible retombe sur le défaut.
 * Les rangements sont ordonnés : le dernier choix est celui de l'ouverture
 * suivante.
 */

export const CLE_DES_PREFERENCES = 'ucm-explorateur.preferences';

/** Ce dont le designer règle la largeur, et que la fenêtre suivante retrouve. */
export const LARGEURS_REGLABLES = ['arbre', 'nom', 'type'] as const;
export type LargeurReglable = (typeof LARGEURS_REGLABLES)[number];

export interface Preferences {
  /** Une seule colonne de valeur, celle du contexte actif, au lieu d'une colonne par mode. */
  readonly vueCompacte: boolean;
  /** Les intégrations facultatives, désactivées par défaut. */
  readonly palettes: boolean;
  readonly profilUcm: boolean;
  /**
   * L'association du profil UCM, par nom de fichier puis par identifiant de
   * collection : la couche que le designer lui attribue.
   */
  readonly associations: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Les écarts au profil que le designer a choisi d'ignorer, par nom de fichier. */
  readonly exceptions: Readonly<Record<string, readonly string[]>>;
  /** Les largeurs réglées, en pixels. Une largeur absente prend son défaut ; l'interface borne chacune à l'affichage. */
  readonly largeurs: Readonly<Partial<Record<LargeurReglable, number>>>;
}

export const PREFERENCES_PAR_DEFAUT: Preferences = { vueCompacte: false, palettes: false, profilUcm: false, associations: {}, exceptions: {}, largeurs: {} };

const estObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);

/** Les préférences valides d'une valeur rangée ; chaque champ illisible prend son défaut. */
export function preferencesValides(brut: unknown): Preferences {
  if (!estObjet(brut)) return PREFERENCES_PAR_DEFAUT;
  const booleen = (cle: 'vueCompacte' | 'palettes' | 'profilUcm') => (typeof brut[cle] === 'boolean' ? (brut[cle] as boolean) : PREFERENCES_PAR_DEFAUT[cle]);
  const associations: Record<string, Record<string, string>> = {};
  if (estObjet(brut.associations)) {
    for (const [fichier, parCollection] of Object.entries(brut.associations)) {
      if (!estObjet(parCollection)) continue;
      const retenues = Object.entries(parCollection).filter((entree): entree is [string, string] => typeof entree[1] === 'string');
      if (retenues.length > 0) associations[fichier] = Object.fromEntries(retenues);
    }
  }
  const exceptions: Record<string, string[]> = {};
  if (estObjet(brut.exceptions)) {
    for (const [fichier, cles] of Object.entries(brut.exceptions)) {
      if (Array.isArray(cles)) exceptions[fichier] = cles.filter((cle): cle is string => typeof cle === 'string');
    }
  }
  const largeurs: Partial<Record<LargeurReglable, number>> = {};
  if (estObjet(brut.largeurs)) {
    for (const cle of LARGEURS_REGLABLES) {
      const largeur = brut.largeurs[cle];
      if (typeof largeur === 'number' && Number.isFinite(largeur) && largeur > 0) largeurs[cle] = largeur;
    }
  }
  return { vueCompacte: booleen('vueCompacte'), palettes: booleen('palettes'), profilUcm: booleen('profilUcm'), associations, exceptions, largeurs };
}

export interface StockageDePreferences {
  getAsync(cle: string): Promise<unknown>;
  setAsync(cle: string, valeur: unknown): Promise<void>;
}

export function creerPreferences(stockage: StockageDePreferences) {
  let file: Promise<unknown> = Promise.resolve();
  return {
    async lire(): Promise<Preferences> {
      try {
        return preferencesValides(await stockage.getAsync(CLE_DES_PREFERENCES));
      } catch {
        return PREFERENCES_PAR_DEFAUT;
      }
    },
    ranger(valeur: unknown): Promise<boolean> {
      const preferences = preferencesValides(valeur);
      const rangement = file.then(async () => {
        try {
          await stockage.setAsync(CLE_DES_PREFERENCES, preferences);
          return true;
        } catch {
          return false;
        }
      });
      file = rangement;
      return rangement;
    },
  };
}
