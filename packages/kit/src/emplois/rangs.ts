/**
 * Les rangs d'état et la table qui relie l'état d'un composant à son rang
 * (décision D17, section 4 d'ARCHITECTURE-FINALE). Un rang nomme un cran de
 * la paire, pas une interaction : un composant sélectionné prend le rang
 * `active`, comme un composant appuyé.
 */
import type { UsageDuNeutre } from './usages.js';

/** Les noms publiés des rangs, du repos au quatrième ; l'indice d'un rang est son décalage de cran. */
export const RANGS = ['default', 'hover', 'active', 'active-hover'] as const;

export type Rang = (typeof RANGS)[number];

/** Les états qu'un composant publie et que la table sait situer. */
export type EtatDeComposant =
  | 'repos'
  | 'survol'
  | 'appui'
  | 'selectionne'
  | 'selectionne-survole'
  | 'selectionne-appuye'
  | 'focus'
  | 'desactive';

/**
 * Ce qu'un état vise : un rang de la palette, avec l'anneau `focus` pour le
 * focus, ou les usages du neutre pour un composant désactivé, que WCAG
 * n'oblige à aucun contraste.
 */
export type CibleDeLEtat =
  | { readonly rang: Rang; readonly anneau?: 'focus' }
  | { readonly neutre: readonly UsageDuNeutre[] };

export const CIBLE_DE_L_ETAT: { readonly [E in EtatDeComposant]: CibleDeLEtat } = {
  repos: { rang: 'default' },
  survol: { rang: 'hover' },
  appui: { rang: 'active' },
  selectionne: { rang: 'active' },
  'selectionne-survole': { rang: 'active-hover' },
  'selectionne-appuye': { rang: 'active-hover' },
  focus: { rang: 'default', anneau: 'focus' },
  desactive: { neutre: ['fill-disabled', 'text-disabled'] },
};
