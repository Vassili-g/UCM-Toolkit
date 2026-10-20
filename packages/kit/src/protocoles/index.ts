/**
 * Point d'entrée des protocoles entre plugins : la forme, la version et le classement des données que les plugins se
 * partagent dans le fichier Figma.
 *
 * Après une modification : ajouter ici tout nouveau module du dossier, puis relancer `npm test` et changer la version du kit.
 */
export * from './donnee.js';
export * from './palettes.js';
export * from './nommage.js';
