/**
 * Le vocabulaire que UCM Palettes, l'architecture des tokens et `ucm check`
 * partagent (décisions D16 et D17) : la table des emplois, les dix-neuf
 * paires, les rangs d'état, la collection `usage` et le contraste WCAG 2.
 *
 * Ce sous-chemin ne dépend de rien, comme `format` : le moteur de couleur
 * d'UCM Palettes l'importe dans le sandbox Figma. La fabrication des palettes
 * reste dans `ucm-couleur`. Les extensions `.js` suivent la règle de
 * `format/index.ts`.
 */
export * from './contraste.js';
export * from './emplois.js';
export * from './paires.js';
export * from './rangs.js';
export * from './usages.js';
