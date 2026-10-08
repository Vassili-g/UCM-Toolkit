/**
 * Le vocabulaire que UCM Palettes, l'architecture des tokens et `ucm check`
 * partagent : la table en dossiers et ses deux sens (normal et inversé), les
 * sept garanties de contraste et le contraste WCAG 2.
 *
 * Ce sous-chemin ne dépend de rien, comme `format` : le moteur de couleur
 * d'UCM Palettes l'importe dans le sandbox Figma. La fabrication des palettes
 * reste dans `ucm-couleur`. Les extensions `.js` suivent la règle de
 * `format/index.ts`.
 */
export * from './contraste.js';
export * from './dossiers.js';
export * from './garanties.js';
