/**
 * Point d'entrée du calcul de nommage : l'inventaire portable et la protection de Palettes, le contrôle des chemins publiés et
 * le calcul de renommage que UCM Nomenclature et UCM Palettes appellent. Les règles rangées que le calcul lit sont dans
 * `@ucm-kit/core/protocoles`.
 *
 * Après une modification : ajouter ici tout nouveau module du dossier, puis relancer `npm test` et changer la version du kit.
 */
export * from './inventaire.js';
export * from './chemins-publies.js';
export * from './calcul.js';
