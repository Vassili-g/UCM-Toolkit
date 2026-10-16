/**
 * Les tags des règles d'usage reconnues dans Figma, sans leur contenu libre.
 *
 * Après une modification : relancer `npm test` et changer la version du kit ; aucune vue ni planche n'en tire de données.
 */
export const TAGS_DES_REGLES = ['usage', 'prop', 'boolean', 'do', 'dont', 'pairs', 'icons', 'default'] as const;
export type RuleTag = (typeof TAGS_DES_REGLES)[number];
export const TAGS_D_INTENTION: readonly RuleTag[] = ['usage', 'do', 'dont', 'pairs'];
