/**
 * Le composant de base de F7 : celui de F3 (`composantDeBase.ts`), sur lequel on impose les états de l'axe `State`, des couleurs
 * qui dépassent leurs seuils de 25 % (`couleursDeStress.ts`), l'anneau et le contour à 2 px, les fonds d'élévation du thème et,
 * selon le profil, un seul mode ou un fond de `Root` translucide. Le module ne modifie aucun fichier de F3.
 *
 * Les variables de `theme` portent ici une valeur par mode et non l'alias vers `brands` de F3 : un opérateur qui veut une chaîne
 * d'alias la fabrique. Les layers sont ceux de F3 sans imbriqués : `Root` (48 × 48, fond et trait liés), `Label` (deux plages),
 * `Icon` et `Ring`.
 */
import type { CatalogueDeReference, CollectionDuCatalogue, ReleveDeComposant, VariableDuCatalogue } from '../../../src/controles/index.js';
import type { NiveauWcag } from '../../../src/controles/accessibilite.js';
import { construireLeComposant, type AxeDeSpec, type ComposantDeBase } from '../f3-composant/composantDeBase.js';
import { JEUX_DE_VARIANTS, type FormeDeJeu } from '../f3-composant/profils.js';
import type { CarteDuComposant, JetonDeCarte } from '../f3-composant/carte.js';
import { couleurDeStress, MODES_DE_STRESS, pageEtCarte, type ModeDeStress } from './couleursDeStress.js';

export const GRAINE_F7 = 7107;

export interface SpecDeContraste {
  readonly forme: FormeDeJeu;
  /** Un seul mode (`Light`) ou deux (`Light` et `Dark`) pour `theme`. */
  readonly modes: 1 | 2;
  /** `translucide` : le fond du `Root` a un alpha de 0,9 et aucun ancêtre n'est opaque, le repli sur la page et la carte sert. */
  readonly fond: 'opaque' | 'translucide';
  readonly niveau: NiveauWcag;
}

export interface ComposantDeContraste extends ComposantDeBase {
  readonly profil: SpecDeContraste;
}

/** `button-36` avec les quatre états de F7 : 3 × 2 × 4 × 2 = 48 variants. */
const ETATS_DE_F7 = ['Default', 'Hover', 'Focus', 'Disabled'] as const;

function axesDeLaForme(forme: FormeDeJeu): readonly AxeDeSpec[] {
  const { axes } = JEUX_DE_VARIANTS[forme];
  return forme === 'button-36' ? axes.map((axe) => (axe.nom === 'State' ? { ...axe, valeurs: ETATS_DE_F7 } : axe)) : axes;
}

/** La collection `theme` du catalogue et l'identifiant de son mode `Light` ou `Dark`. */
export function themeDuCatalogue(catalogue: CatalogueDeReference): CollectionDuCatalogue {
  const theme = catalogue.collections.find((collection) => collection.role === 'theme');
  if (!theme) throw new Error('Pas de collection theme');
  return theme;
}

export const idDuMode = (theme: CollectionDuCatalogue, mode: ModeDeStress): string | undefined => theme.modes.find((m) => m.nom.toLowerCase() === mode)?.id;

export function composantDeContraste(profil: SpecDeContraste, graine: number = GRAINE_F7): ComposantDeContraste {
  const jeu = JEUX_DE_VARIANTS[profil.forme];
  const base = construireLeComposant({
    jeu: jeu.jeu, axes: axesDeLaForme(profil.forme), ...(jeu.exclus ? { exclus: jeu.exclus } : {}),
    scopes: 'larges', imbriques: false, plages: 2, modesDeTaille: 1, graine,
  });
  const releve: ReleveDeComposant = base.releve;
  const catalogue: CatalogueDeReference = base.catalogue;
  const translucide = profil.fond === 'translucide';

  // Les valeurs du thème, par mode.
  const theme = themeDuCatalogue(catalogue);
  const modes = profil.modes === 2 ? MODES_DE_STRESS : MODES_DE_STRESS.slice(0, 1);
  const idsRetires = theme.modes.filter((m) => !modes.includes(m.nom.toLowerCase() as ModeDeStress)).map((m) => m.id);
  theme.modes = theme.modes.filter((m) => !idsRetires.includes(m.id));
  for (const variable of catalogue.variables) {
    if (variable.collection !== theme.cle) continue;
    const valeurs: NonNullable<VariableDuCatalogue['valeurs']> = {};
    for (const mode of modes) valeurs[idDuMode(theme, mode)!] = { valeur: couleurDeStress(variable.nom, mode, translucide) };
    variable.valeurs = valeurs;
  }
  for (const variant of releve.variants) {
    for (const id of idsRetires) for (const [cle, valeur] of Object.entries(variant.modesEffectifs)) if (valeur === id) delete variant.modesEffectifs[cle];
  }
  catalogue.fondsDElevation = Object.fromEntries(modes.map((mode) => {
    const { page, carte } = pageEtCarte(mode);
    return [idDuMode(theme, mode)!, { page: { r: page.r, g: page.g, b: page.b, a: 1 }, carte: { r: carte.r, g: carte.g, b: carte.b, a: 1 } }];
  }));

  // Le contour du Root et l'anneau valent 2 px : les tokens `border-width` visent `sizing/2`.
  const deux = catalogue.variables.find((variable) => variable.nom === 'sizing/2');
  if (!deux) throw new Error('Pas de sizing/2 dans layout');
  const epaisseurs = new Set(base.carte.jetons.filter((jeton) => jeton.propriete === 'border-width').map((jeton) => jeton.cle));
  for (const variable of catalogue.variables) {
    if (epaisseurs.has(variable.cle)) variable.valeurs = Object.fromEntries(Object.keys(variable.valeurs ?? {}).map((mode) => [mode, { alias: deux.cle }]));
  }
  for (const variant of releve.variants) {
    for (const layer of variant.layers) if (layer.strokeWeight !== undefined) layer.strokeWeight = 2;
  }
  const jetons: JetonDeCarte[] = base.carte.jetons.map((jeton) => (epaisseurs.has(jeton.cle) ? { ...jeton, cible: { cle: deux.cle, nom: deux.nom }, pixels: 2 } : jeton));
  const carte: CarteDuComposant = { ...base.carte, jetons };

  return { ...base, releve, catalogue, carte, profil };
}
