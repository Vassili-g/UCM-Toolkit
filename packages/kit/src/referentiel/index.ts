/**
 * Point d’entrée du vocabulaire UCM et des emplois de couleur.
 *
 * Après une modification : ajouter ici tout nouveau fichier du référentiel, puis relancer `npm test` et changer la version du kit.
 */
export * from '../emplois/index.js';
export * from './termes.js';
export { formeDuChemin, formeReconnue, termeReconnu } from './reconnaissance.js';
export * from './vocabulaire.js';
export * from './architecture.js';
export * from './grammaire.js';
export * from './conventions.js';
export * from './normalisation.js';
export * from './theme.js';
export * from './contraste.js';
export * from './produits.js';
export * from './regles.js';
export * from './kit-de-regles.js';
export * from './recommandations.js';
export * from './harmonisation.js';
export * from './vocabulaire-du-fichier.js';
export * from './lexique.js';
export * from './natures.js';
export * from './signes.js';
export * from './questions.js';
export * from './composition.js';
export type { ReleveDeComposant, CatalogueDeReference, Constat } from '../controles/index.js';
