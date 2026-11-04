/**
 * Ce qu'un layer désigne : une icône, un anneau de focus, un séparateur. Les contrôles de mapping (C17), d'accessibilité (C49, C50)
 * et de typographie (C66, C67) et la colonne du mode Composant lisent ces définitions ; aucun ne reconnaît un layer par une
 * expression à lui (Q-F6-3, Q-F3-4, Q-F6-4, Q-F7-9, Q-F3-3).
 *
 * Un mot d'icône est un mot entier du nom : `Silicone`, `Lexicon` et `Icons` n'en contiennent pas, `ChevronIcon` et `leading-icon` oui.
 *
 * Après une modification : relancer `npm test` et changer la version du kit.
 */

/** Les mots qui disent « icône » dans un nom de layer, de propriété ou de composant. */
export const MOTS_D_ICONE = ['icon', 'icône', 'glyph', 'pictogram', 'symbol'] as const;

/** Les rôles de token qui désignent un layer précis ; `background`, `foreground`, `text` et `border` colorent n'importe quel layer. */
export const ROLES_QUI_DESIGNENT_UN_LAYER = ['divider', 'ring', 'icon'] as const;
export type RoleDeLayer = (typeof ROLES_QUI_DESIGNENT_UN_LAYER)[number];

/** Ce que les définitions lisent d'un layer : le relevé du kit (`LayerLu`) et la lecture d'Architect s'y conforment. */
export interface LayerPourLesDefinitions {
  readonly nom: string;
  readonly type: string;
  /** Le composant que l'instance pose, et la propriété d'échange d'instance qui la pilote (`Icon#1:2`). */
  readonly instanceDe?: { readonly nom: string; readonly pilotee: string | null };
}

const NOMS_MEMORISES_MAX = 20_000;
const sansAccent = (texte: string): string => texte.normalize('NFD').replace(/\p{M}/gu, '');
const MOTS = new Set(MOTS_D_ICONE.map((mot) => sansAccent(mot)));
const memoire = new Map<string, boolean>();

/** Un mot d'icône entier dans le nom : séparateurs, chiffres et passage de la minuscule à la majuscule coupent les mots. */
export function motDIconeDansLeNom(nom: string): boolean {
  const connu = memoire.get(nom);
  if (connu !== undefined) return connu;
  const mots = sansAccent(nom).replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2').match(/\p{L}+/gu) ?? [];
  const trouve = mots.some((mot) => MOTS.has(mot.toLowerCase()));
  if (memoire.size >= NOMS_MEMORISES_MAX) memoire.clear();
  memoire.set(nom, trouve);
  return trouve;
}

/** Cas 1 : l'instance d'un composant Icon, dont le nom du composant ou de son jeu dit icône. */
export function estUneInstanceDIcone(layer: LayerPourLesDefinitions): boolean {
  return layer.instanceDe !== undefined && motDIconeDansLeNom(layer.instanceDe.nom);
}

/** Cas 2 : une instance qu'une propriété d'échange d'instance pilote, sous un nom de propriété ou de layer qui dit icône (Q-F6-4). */
function estUneInstancePilotee(layer: LayerPourLesDefinitions): boolean {
  const pilotee = layer.instanceDe?.pilotee ?? null;
  return pilotee !== null && (motDIconeDansLeNom(pilotee.split('#')[0]) || motDIconeDansLeNom(layer.nom));
}

/** Cas 3 : un tracé dont le nom contient un mot d'icône. */
function estUnTraceNomme(layer: LayerPourLesDefinitions): boolean {
  return (layer.type === 'VECTOR' || layer.type === 'BOOLEAN_OPERATION') && motDIconeDansLeNom(layer.nom);
}

/** La définition d'une icône, la seule du kit : un FRAME ou un TEXT n'en est jamais une, quel que soit son nom. */
export function estUneIcone(layer: LayerPourLesDefinitions): boolean {
  if (layer.type === 'FRAME' || layer.type === 'TEXT') return false;
  return estUneInstanceDIcone(layer) || estUneInstancePilotee(layer) || estUnTraceNomme(layer);
}

/** `Ring`, `Focus ring` ou `focus-ring` ; un point ou un tiret bas en tête, la marque Figma d'un layer privé (`.Ring`), ne change pas le nom. */
const NOM_D_ANNEAU = /^[._]?(focus[-_ ]?)?ring$/i;
const NOM_DE_SEPARATEUR = /^[._]?(divider|separator)$/i;

export function estUnNomDAnneau(nom: string): boolean {
  return NOM_D_ANNEAU.test(nom);
}

export function estUnNomDeSeparateur(nom: string): boolean {
  return NOM_DE_SEPARATEUR.test(nom);
}

/**
 * La définition d'un anneau de focus : un layer lié à un token de rôle `ring`, ou nommé `Ring` ou `Focus ring`. `rolesLies` donne le rôle
 * de chaque token que le layer lie, que l'appelant lit dans son catalogue ; sans lui, seul le nom décide.
 */
export function estUnAnneau(layer: Pick<LayerPourLesDefinitions, 'nom'>, rolesLies: readonly string[] = []): boolean {
  return estUnNomDAnneau(layer.nom) || rolesLies.includes('ring');
}

/** Vrai pour `divider`, `ring` et `icon` ; faux pour tout autre rôle, dont le token colore n'importe quel layer. */
export function leNomDuLayerDitLeRole(role: string): boolean {
  return (ROLES_QUI_DESIGNENT_UN_LAYER as readonly string[]).includes(role);
}

/**
 * Le rôle que le layer désigne : `divider` par le nom `Divider` ou `Separator`, `ring` par `Ring` ou `Focus ring`, `icon` par l'instance
 * d'un composant Icon. Un autre layer n'en désigne aucun. Les contrôles de liaison comparent ce rôle à celui du token (Q-F3-3).
 */
export function roleQueLeLayerDesigne(layer: LayerPourLesDefinitions): RoleDeLayer | undefined {
  if (estUnNomDeSeparateur(layer.nom)) return 'divider';
  if (estUnNomDAnneau(layer.nom)) return 'ring';
  if (layer.type !== 'FRAME' && layer.type !== 'TEXT' && estUneInstanceDIcone(layer)) return 'icon';
  return undefined;
}
