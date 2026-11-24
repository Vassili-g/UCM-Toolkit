/**
 * Les adresses des API que le toolkit appelle, écrites une fois : l'exporteur
 * les lit pour publier depuis Figma, la CLI pour commenter une demande de fusion.
 * Le réseau d'un plugin se borne à ces deux hôtes.
 *
 * Après une modification : relancer `npm test` et changer la version du kit.
 */

/** L'API REST de GitHub. */
export const API_GITHUB = 'https://api.github.com';

/** L'API REST v4 de gitlab.com. */
export const API_GITLAB = 'https://gitlab.com/api/v4';
